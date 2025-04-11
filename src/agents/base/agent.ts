import type { AgentConfig, AgentResponse, AgentRunHistory, AgentState } from "../agents.types";
import { formatToolsForPrompt, type Tool, type ToolCall } from "tools";
import type { AIResponse, Context } from "types";
import { createAssistantMessage, createUserMessage, type Message } from "messages";
import { createErrorLog } from "utils";
import type OpenAI from "openai";
import process from "process";
import { END_TOOL, START_TOOL } from "agents/agents.ts";

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

    // Initialize AI service
    // this.aiService = AIServiceFactory.createService(defaultConfig);
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
  public async chat(message: string = "", onStream?: (chunk: string) => void): Promise<AgentResponse> {
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

    const response = await this.getResponse(this.getMessages(), this.config.model, onStream);
    this.pushMessage(createAssistantMessage(response.content));
    const toolCalls = response.toolCalls || [];

    // const toolCalls = this.extractToolCalls(response);
    if (toolCalls && toolCalls.length > 0) {
      return await this.handleToolCalls(toolCalls, onStream);
    }

    return {
      response: response.content,
    };
  }

  async getResponse(messages: any, model: string, callback?: (chunk: string) => void): Promise<AIResponse> {
    try {
      let content = "";
      const isStreaming = callback ? typeof callback === "function" : false;

      if (!isStreaming) {
        const response = await this.client.chat.completions.create({
          model,
          messages,
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
      let buffer = "";
      let isInToolBlock = false;
      let toolCalls: ToolCall[] = [];
      let toolCallContent = "";
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        stream: true,
      });
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || "";
        if (deltaContent) {
          // Handle first chunk
          if (isFirstChunk) {
            print("\nAssistant: ");
            isFirstChunk = false;
          }

          content += deltaContent;
          buffer += deltaContent;

          while (true) {
            if (!isInToolBlock) {
              const startIndex = buffer.indexOf(START_TOOL);
              if (startIndex === -1) {
                if (buffer.length > START_TOOL.length) {
                  const safeLength = buffer.length - START_TOOL.length + 1;
                  const safePart = buffer.substring(0, safeLength);
                  print(safePart); // This is outside a tool block, so isPrintable should be true
                  buffer = buffer.substring(safeLength);
                } else {
                  break;
                }
              } else {
                const beforeTool = buffer.substring(0, startIndex);
                if (beforeTool) {
                  print(beforeTool);
                }

                buffer = buffer.substring(startIndex + START_TOOL.length);
                isInToolBlock = true;
                toolCallContent = "";
              }
            } else {
              const endIndex = buffer.indexOf(END_TOOL);
              if (endIndex === -1) {
                toolCallContent += buffer;
                buffer = "";

                // set buffer to end tool if toolCallContent contains END_TOOL
                if (toolCallContent.indexOf(END_TOOL) > -1) {
                  buffer = END_TOOL;
                }
                break;
              } else {
                // Tool call completed, extract the content
                toolCallContent += buffer.substring(0, endIndex);

                // Remove the processed part from the buffer
                buffer = buffer.substring(endIndex + END_TOOL.length);
                isInToolBlock = false;
                break;
              }
            }
          }
        } else if (chunk.choices[0]?.finish_reason == "stop") {
          // If we have anything left in the buffer and we're not in a tool block, print it
          if (!isInToolBlock && buffer) {
            print(buffer);
          }
          print("\n");
        }
      }

      toolCalls = this.processToolCall(toolCallContent) as ToolCall[];

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
  protected async handleToolCalls(toolCalls: ToolCall[], onStream?: (chunk: string) => void): Promise<AgentResponse> {
    for (const toolCall of toolCalls) {
      const tool = this.findTool(toolCall.function.name);

      if (tool) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          this.pushMessage({
            role: "assistant",
            tool_calls: [{ type: "function", function: toolCall.function, id: toolCall.id }],
          });

          const result = await tool.run(args, this.state.context);

          this.state.history.toolCalls.push({
            call: toolCall,
            result,
          });

          this.pushMessage({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (error: any) {
          createErrorLog("Error handle tool calls:", error);
          throw new Error(`Failed to handle tool calls: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    // Get final response with tool results
    return await this.chat("", onStream);
  }

  /**
   * Find a tool by name
   */
  protected findTool(name: string): Tool | undefined {
    return this.config.tools?.find(tool => tool.name === name);
  }

  /**
   * Extract tool calls from AI response
   */
  protected extractToolCalls(response: any): ToolCall[] | undefined {
    // If the response already contains tool calls, return them
    if (response.tool_calls) {
      return response.tool_calls;
    }

    try {
      const content = response.content;
      process.stdout.write("extract tool calls " + JSON.stringify(content));
      const toolCallMatch = content.match(/```json\n([\s\S]*?)\n```/);

      if (toolCallMatch && toolCallMatch[1]) {
        const toolCallData = JSON.parse(toolCallMatch[1]);

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
      }
    } catch (error: any) {
      console.warn("Failed to parse tool calls from response:", error);
    }

    return [];
  }

  /**
   * Get the system prompt
   */
  protected getSystemPrompt(): string {
    const toolPrompt = `
To use a tool, respond with a json object with function name and arguments within <@TOOL_CALL></@TOOL_CALL>} XML tags:\n
<@TOOL_CALL>{"name": <function-name>, "arguments": "<json-encoded-string-of-the-arguments>"}</@TOOL_CALL>

The arguments value is ALWAYS a JSON-encoded string, when there is no arguments, use empty object.

For example:
<@TOOL_CALL> {"name": "fileRead", "arguments": "{"fileName": "example.txt"}"} </@TOOL_CALL>

<@TOOL_CALL> [{"name": "fileRead", "arguments": "{"fileName": "example.txt"}"},{"name": "projectStructure", "arguments": "{}"} ] </@TOOL_CALL>

<@TOOL_CALL> {"name": "projectStructure", "arguments": "{}"} </@TOOL_CALL>

IMPORTANT:
- Return ONE tool when its result is needed for subsequent tool
- Return multiple tools ONLY when they can run independently
`;

    let systemPrompt = this.config.systemPrompt || "";

    // Add tool definitions if available
    if (this.config.tools && this.config.tools.length > 0) {
      systemPrompt += formatToolsForPrompt(this.config.tools);
      systemPrompt += toolPrompt;
    }

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
