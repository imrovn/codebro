import type {
  AgentConfig,
  AgentContext,
  AgentMode,
  AgentRunHistory,
  AgentState,
  AIResponse,
} from "agents/agents.types.ts";
import { formatToolsForPrompt, removeRedundantTools, type Task, type Tool } from "tools";
import { createAssistantMessage, createUserMessage, type Message } from "messages";
import type OpenAI from "openai";
import process from "process";
import path from "path";
import { promises as fs } from "fs";
import { parseMarkdownTasks } from "utils";
import { taskManagerTool } from "tools/task-manager.ts";
import { OraManager } from "utils/ora-manager.ts";

const defaultHistory: AgentRunHistory = {
  messages: [],
  toolCalls: [],
};

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected state: AgentState;
  protected client: OpenAI;
  protected tools: Tool[];
  protected mode: AgentMode = "PLAN";

  /**
   * Create a new agent
   */
  protected constructor(context: AgentContext, config: AgentConfig) {
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
    this.client = context.client;
    this.tools = removeRedundantTools([...(config.tools || []), taskManagerTool], context.config.excludeTools);

    if (config.mode) {
      this.mode = config.mode;
    }
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

  public async chat(oraManager: OraManager, message: string = "", onStream?: (chunk: string) => void): Promise<string> {
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
      oraManager.start("🤖 Thinking ...");
      await this.handleSystemPromptBasedOnMode();
      const { content, toolCalls } = await this.getResponse(
        oraManager,
        this.getMessages(),
        this.state.context.model,
        onStream
      );
      if (content) {
        oraManager.succeed(content);
      }
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

    // Limit conversation history to prevent memory issues
    if (this.getMessages().length > 70) {
      // TODO: Summary the last messages, slice for now
      this.state.history.messages = [
        {
          role: "system",
          content: await this.getSystemPrompt(),
        },
        ...this.getMessages().slice(-69),
      ];
    }

    return finalResponse;
  }

  async handleSystemPromptBasedOnMode(): Promise<void> {
    this.state.history.messages.shift();
    this.state.history.messages.unshift({
      role: "system",
      content: await this.getSystemPrompt(),
    });
  }

  async getResponse(
    oraManager: OraManager,
    messages: any,
    model: string,
    callback?: (chunk: string) => void
  ): Promise<AIResponse> {
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
        oraManager.append(content);
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
          oraManager.append(deltaContent);
        } else if (chunk.choices[0]?.finish_reason == "stop") {
          // stop signal
          oraManager.succeed(content);
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
    const ora = new OraManager();
    const toolName = toolCall.function.name;
    const tool = this.findTool(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const args = JSON.parse(toolCall.function.arguments);
    const formattedArgs = Object.keys(args || {})
      .map(key => `${key}=${args[key]}`)
      .join(", ");
    const suffix = formattedArgs ? `[${formattedArgs}]` : "";
    tool.isMCPTool && ora.startTool(`Tool ${toolName} executing ...`, suffix);

    const result = await tool.run(args, this.state.context);

    tool.isMCPTool && ora.succeed(`Tool ${toolName} executed`);

    if (toolName === "agentModeSwitch" && args.mode) {
      this.mode = args.mode;
    }

    if (toolName === "taskManager" && result.success && ["create", "update", "delete"].includes(args.action)) {
      // await this.syncTasks();
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
    let systemPrompt: string = (this.mode == "EXECUTE" ? this.config.systemPrompt : this.config.plannerPrompt) || "";
    systemPrompt = systemPrompt.replace(
      "@@TOOLS_DECLARE@@",
      this.tools.length > 0 ? formatToolsForPrompt(this.tools) : ""
    );
    systemPrompt += `
    \n# Tool usage policy
    - If you intend to call multiple tools and there are no dependencies between the calls, make all of the independent calls in the same function_calls block.
    IMPORTANT: Refuse to write/explain or execute code/command that may be used maliciously; even if the user claims it is for educational purposes.
`;
    systemPrompt += "You can switch between either EXECUTE or PLAN mode by using agentModeSwitch \n";

    const additionalPrompt = this.state.context.additionalPrompts;
    if (additionalPrompt) {
      systemPrompt += `\n# Additional rules from user:\n ${additionalPrompt}\n`;
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
