import type { AgentConfig, AgentRunHistory, AgentState, AIResponse } from "../agents.types";
import { removeRedundantTools, type Task, type Tool } from "tools";
import type { Context } from "types";
import { createAssistantMessage, createUserMessage, type Message } from "messages";
import type OpenAI from "openai";
import process from "process";
import path from "path";
import { promises as fs } from "fs";
import { checkTaskCompletion, parseMarkdownTasks } from "utils";
import { taskManagerTool } from "tools/task-manager";

const defaultHistory: AgentRunHistory = {
  messages: [],
  toolCalls: [],
};

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected state: AgentState;
  protected client: OpenAI;
  protected tools: Tool[];

  /**
   * Create a new agent
   */
  protected constructor(context: Context, config: AgentConfig) {
    this.config = {
      ...config,
      name: config.name || "codebro",
      systemPrompt: config.systemPrompt || "",
      temperature: config.temperature || 0.5,
    };

    // Initialize the state
    this.state = {
      history: defaultHistory,
      context,
    };
    this.client = config.client;
    this.tools = removeRedundantTools([...(config.tools || []), taskManagerTool]);
    this.initializeState().catch(console.error);
  }

  /**
   * Initialize state by loading custom rules and tasks
   */
  protected async initializeState(): Promise<void> {
    const codebroDir = path.join(this.state.context.workingDirectory, ".codebro");
    await fs.mkdir(codebroDir, { recursive: true });

    const taskPath = path.join(codebroDir, "tasks.md");
    await fs.writeFile(taskPath, "# Codebro tasks\n\n", "utf8");
  }

  getTools(): OpenAI.Chat.ChatCompletionTool[] {
    return this.tools.map(tool => tool.getDefinition());
  }

  pushMessage(msg: Message): void {
    this.state.history.messages.push(msg);
  }

  getMessages(): Message[] {
    return this.state.history.messages;
  }

  public async chat(message: string = "", onStream?: (chunk: string) => void): Promise<string> {
    // Add user message to history
    if (message) {
      this.pushMessage(createUserMessage(message));
    }

    // Add system message if this is the first message
    if (this.getMessages().length === 1) {
      this.getMessages().unshift({
        role: "system",
        content: await this.getSystemPrompt(),
      });
    }
    let finalResponse = "";
    while (true) {
      const { content, toolCalls } = await this.getResponse(this.getMessages(), this.config.model, onStream);
      this.pushMessage(createAssistantMessage(content));
      finalResponse += content;

      // If no tool calls, we're done
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      const toolResults = await this.handleToolCalls(toolCalls);

      this.pushMessage({
        role: "assistant",
        content: content,
        tool_calls: toolCalls,
      });

      toolCalls.forEach((toolCall, index) => {
        this.pushMessage({
          role: "tool",
          content: JSON.stringify(toolResults[index]),
          tool_call_id: toolCall.id,
        });
      });
    }

    this.pushMessage({
      role: "assistant",
      content: finalResponse,
    });

    const { incompleteTasks, allCompleted } = checkTaskCompletion(this.state.context.tasks || []);
    if (!allCompleted) {
      this.pushMessage({
        role: "assistant",
        content: "Okay, now we'll do the next task - " + incompleteTasks[0],
      });
    }

    // Limit conversation history to prevent memory issues
    if (this.getMessages().length > 50) {
      // TODO: Summary the last messages, slice for now
      this.state.history.messages = [
        {
          role: "system",
          content: await this.getSystemPrompt(),
        },
        ...this.getMessages().slice(-49),
      ];
    }

    return finalResponse;
  }

  async getResponse(messages: any, model: string, callback?: (chunk: string) => void): Promise<AIResponse> {
    try {
      let content = "";
      const isStreaming = callback ? typeof callback === "function" : false;

      if (!isStreaming) {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          tools: this.getTools(),
        });
        content = response?.choices[0]?.message.content || "";
        return { content, isStreaming, toolCalls: response?.choices[0]?.message.tool_calls || [] };
      }

      let isFirstChunk = true;
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        tools: this.getTools(),
        stream: true,
      });
      const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || "";
        const deltaToolCalls = chunk.choices[0]?.delta?.tool_calls || [];
        if (deltaContent) {
          content += deltaContent;
        } else if (chunk.choices[0]?.finish_reason == "stop") {
        }

        // Handle tool calls
        for (const toolCall of deltaToolCalls) {
          if (toolCall.index !== undefined) {
            if (!toolCalls[toolCall.index]) {
              toolCalls[toolCall.index] = {
                id: toolCall.id || "",
                type: "function",
                function: {
                  name: toolCall.function?.name || "",
                  arguments: toolCall.function?.arguments || "",
                },
              };
            } else if (toolCall.function?.arguments) {
              // @ts-ignore
              toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
            }
          }
        }
      }

      return { content, isStreaming, toolCalls };
    } catch (error: any) {
      process.stdout.write(JSON.stringify(error));
      throw new Error(`Failed to handle user input: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Handle tool calls from the AI
   */
  protected async handleToolCalls(toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[]): Promise<any> {
    try {
      return await Promise.all(toolCalls.map(toolCall => this.executeToolCall(toolCall)));
    } catch (error) {
      console.error("Error executing tool calls:", error);
      throw new Error(`Failed to execute tool calls: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async executeToolCall(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall): Promise<any> {
    const toolName = toolCall.function.name;
    const tool = this.findTool(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const args = JSON.parse(toolCall.function.arguments);
    const result = await tool.run(args, this.state.context);

    if (toolName === "taskManager" && result.success && ["create", "update", "delete"].includes(args.action)) {
      await this.syncTasks();
    }

    return result;
  }

  /**
   * Sync tasks from .codebro/tasks.md
   */
  private async syncTasks(): Promise<void> {
    const tasksPath = path.join(this.state.context.workingDirectory, ".codebro/tasks.md");
    try {
      const tasksContent = await fs.readFile(tasksPath, "utf-8");
      this.state.context.tasks = parseMarkdownTasks(tasksContent);
    } catch (error: any) {
      console.error("Failed to sync tasks:", error.message);
    }
  }

  protected findTool(name: string): Tool | undefined {
    return this.tools?.find(tool => tool.getDefinition().function.name === name);
  }

  /**
   * Get the system prompt
   */
  protected async getSystemPrompt(): Promise<string> {
    let systemPrompt = this.config.systemPrompt || "";
    //     if (this.state.context.files?.length) {
    //       systemPrompt += `Current directory: ${this.state.context.workingDirectory}\n
    // The following files are in the project:
    //     ${this.state.context.files.map(file => `- ${file.path}`).join("\n")} `;
    //     }

    systemPrompt += `
    \n# Tool usage policy
    - When doing file search, prefer to use the Agent tool in order to reduce context usage.
    - If you intend to call multiple tools and there are no dependencies between the calls, make all of the independent calls in the same function_calls block.
    - Use taskManager tool to create and track tasks for complex queries, breaking them into subtasks with dependencies.

    You MUST answer concisely with fewer than 4 lines of text (not including tool use or code generation), unless user asks for detail.

    IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes.
    When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
    IMPORTANT: If you failed to executed a tool 2 times, terminate and go to the next function.
    IMPORTANT: If verify steps failed 3 times, create a new note/task for later and move to the next step
        `;

    const additionalPrompt = await this.loadAdditionalPrompt();
    if (additionalPrompt) {
      systemPrompt += `\n# Additional rules from user\n ${additionalPrompt}\n`;
    }

    // Include active tasks
    const tasks = this.state.context.tasks as Task[] | undefined;
    if (tasks?.length) {
      systemPrompt += `\n# Active Tasks\n${tasks
        .filter(t => ["pending", "in_progress"].includes(t.status))
        .map(t => `- ${t.id}: ${t.description} (${t.status})`)
        .join("\n")}\n`;
    }

    return systemPrompt;
  }

  async loadAdditionalPrompt(): Promise<string> {
    const rulesFilePath = path.join(this.state.context.workingDirectory, ".codebro/.codebrorules");
    try {
      return await fs.readFile(rulesFilePath, "utf8");
    } catch (error: any) {
      if (error.code === "ENOENT") {
        await fs.writeFile(rulesFilePath, "# Custom rules for Codebro\n", "utf8");
        return "";
      }
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  public clearHistory(): void {
    this.state.history = defaultHistory;
    this.state.context.memory = { conversations: [], lastUpdated: new Date().toISOString() };

    fs.writeFile(
      path.join(this.state.context.workingDirectory, ".codebro/memory.json"),
      JSON.stringify(this.state.context.memory, null, 2)
    ).catch(console.error);
  }

  /**
   * Get the agent's history
   */
  public getHistory(): AgentRunHistory {
    return this.state.history || defaultHistory;
  }
}
