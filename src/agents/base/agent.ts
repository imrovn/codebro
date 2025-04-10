import type { AgentConfig, AgentResponse, AgentRunHistory, AgentState, Context, Message, Tool, ToolCall } from "types";
import { AIServiceFactory, BaseAIService } from "services/ai/index.ts";
import { createAssistantMessage, createErrorLog, createUserMessage } from "utils/index.ts";
import { config as defaultConfig } from "configs";

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
  protected aiService: BaseAIService;

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

    // Initialize AI service
    this.aiService = AIServiceFactory.createService(defaultConfig);
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

    const response = await this.aiService.getResponse(this.getMessages(), this.config.model, onStream);
    this.pushMessage(createAssistantMessage(response.content));

    const toolCalls = this.extractToolCalls(response);
    if (toolCalls && toolCalls.length > 0) {
      return await this.handleToolCalls(toolCalls, onStream);
    }

    return {
      response: response.content,
      toolCalls,
    };
  }

  /**
   * Handle tool calls from the AI
   */
  protected async handleToolCalls(toolCalls: ToolCall[], onStream?: (chunk: string) => void): Promise<AgentResponse> {
    for (const toolCall of toolCalls) {
      const tool = this.findTool(toolCall.function.name);

      if (tool) {
        try {
          // Parse arguments from JSON string
          const args = JSON.parse(toolCall.function.arguments);

          // Execute the tool
          const result = await tool.run(args, this.state.context);

          // Add tool call and result to history
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

    // Try to parse tool calls from the response content
    try {
      const content = response.content;
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
      systemPrompt += "\n\nYou have access to the following tools:\n\n";

      for (const tool of this.config.tools) {
        systemPrompt += `Tool: ${tool.name}\n`;
        systemPrompt += `Description: ${tool.description}\n`;
        systemPrompt += "Parameters:\n";

        for (const param of tool.parameters) {
          systemPrompt += `  - ${param.name} (${param.type}${
            param.required ? ", required" : ""
          }): ${param.description}\n`;
        }
        systemPrompt += "\n";
      }
      systemPrompt += toolPrompt;
    }

    // Add memory bank info if available
    if (this.state.context.memoryBank) {
      systemPrompt += "\n\n### Memory Bank Information:\n";
      const memoryBank = this.state.context.memoryBank;

      systemPrompt += `\n## Project Brief:\n${memoryBank.projectBrief.content}\n`;
      systemPrompt += `\n## Active Context:\n${memoryBank.activeContext.content}\n`;
      systemPrompt += `\n## Technical Context:\n${memoryBank.techContext.content}\n`;
      systemPrompt += `\n## System Patterns:\n${memoryBank.systemPatterns.content}\n`;
      systemPrompt += `\n## Progress:\n${memoryBank.progress.content}\n`;
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
