import type { AgentConfig, AgentRunHistory, AgentState } from "../agents.types";
import { type Tool } from "tools";
import type { AIResponse, Context } from "types";
import { createAssistantMessage, createUserMessage, type Message } from "messages";
import type OpenAI from "openai";
import process from "process";
import { END_TOOL } from "agents/agents.ts";

const defaultHistory: AgentRunHistory = {
  messages: [],
  toolCalls: [],
};

/**
 * Base Agent class that all specific agents will extend
 */
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
      temperature: config.temperature || 0.7,
    };

    // Initialize the state
    this.state = {
      history: defaultHistory,
      context,
    };
    this.client = config.client;
    this.tools = config.tools;
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

  /**
   * Run the agent with a user message
   */
  public async chat(message: string = "", onStream?: (chunk: string) => void): Promise<string> {
    // Add user message to history
    if (message) {
      this.pushMessage(createUserMessage(message));
    }

    // Add system message if this is the first message
    if (this.getMessages().length === 1) {
      this.getMessages().unshift({
        role: "system",
        content: this.getSystemPrompt(),
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

      this.state.history.messages = [{ role: "system", content: this.getSystemPrompt() }, ...this.getMessages()];
    }

    this.pushMessage({
      role: "assistant",
      content: finalResponse,
    });

    // Limit conversation history to prevent memory issues
    if (this.getMessages().length > 20) {
      this.state.history.messages = [
        {
          role: "system",
          content: this.getSystemPrompt(),
        },
        ...this.getMessages().slice(-19),
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
        return { content, isStreaming, toolCalls: [] };
      }

      const print = (content: string) => {
        if (callback) {
          callback(content);
        } else {
          process.stdout.write(content);
        }
      };

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
          // Handle first chunk
          if (isFirstChunk) {
            print("\nAssistant: ");
            isFirstChunk = false;
          }
          content += deltaContent;
        } else if (chunk.choices[0]?.finish_reason == "stop") {
          print("\n");
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

  private cleanupToolCallContent(toolCallContent: string) {
    const endIndex = toolCallContent.indexOf(END_TOOL);
    return toolCallContent.substring(0, endIndex === -1 ? toolCallContent.length : endIndex);
  }

  private processToolCall(toolCallContent: string) {
    toolCallContent = this.cleanupToolCallContent(toolCallContent);

    try {
      const toolCallData = JSON.parse(toolCallContent);

      if (Array.isArray(toolCallData)) {
        return toolCallData.map((call, index) => ({
          id: call.id || `call-${index}`,
          type: "function",
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments || {}),
          },
        }));
      } else if (toolCallData.name) {
        return [
          {
            id: toolCallData.id || "call-0",
            type: "function",
            function: {
              name: toolCallData.name,
              arguments: JSON.stringify(toolCallData.arguments || {}),
            },
          },
        ];
      }
    } catch (error) {
      return [];
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
    return await tool.run(args, this.state.context);
  }

  /**
   * Find a tool by name
   */
  protected findTool(name: string): Tool | undefined {
    return this.tools?.find(tool => tool.getDefinition().function.name === name);
  }

  /**
   * Get the system prompt
   */
  protected getSystemPrompt(): string {
    const toolPrompt = `
# Tool usage policy
  - When doing file search, prefer to use the Agent tool in order to reduce context usage.
  - If you intend to call multiple tools and there are no dependencies between the calls, make all of the independent calls in the same function_calls block.
  
You MUST answer concisely with fewer than 4 lines of text (not including tool use or code generation), unless user asks for detail.
  
IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code)
`;

    let systemPrompt = this.config.systemPrompt || "";

    if (this.state.context.files?.length) {
      systemPrompt += `Current directory ${this.state.context.workingDirectory}\n;
    ${this.state.context.files.length > 0 ? "The following files are in the project:" : "No files found in the project"}
    ${this.state.context.files.map(file => `- ${file.path}`).join("\n")} `;
    }

    systemPrompt += toolPrompt;
    return systemPrompt;
  }

  /**
   * Clear conversation history
   */
  public clearHistory(): void {
    this.state.history = defaultHistory;
  }

  /**
   * Get the agent's history
   */
  public getHistory(): AgentRunHistory {
    return this.state.history || defaultHistory;
  }
}
