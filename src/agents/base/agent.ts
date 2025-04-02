import type { AgentConfig, AgentResponse, AgentRunHistory, AgentState, Tool, ToolCall } from "types/agent.ts";
import { config as appConfig, createConfig } from "config/index.ts";
import * as process from "node:process";
import type { Message } from "types/index.ts";
import type { BaseAIService } from "services/ai/base.ts";
import { AIServiceFactory } from "services/ai/index.ts";
import { createAssistantMessage, createUserMessage } from "utils/index.ts";

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
  protected constructor(config: AgentConfig) {
    this.config = {
      ...createConfig(config),
      name: config.name || "codebro",
      systemPrompt: config.systemPrompt || "",
      temperature: config.temperature || 0.7,
    };

    // Initialize the state
    this.state = {
      history: {
        messages: [],
        toolCalls: [],
      },
      context: {
        workingDirectory: process.cwd(),
      },
    };

    // Initialize AI service
    this.aiService = AIServiceFactory.createService({
      ...appConfig,
      useOpenAI: this.config.useOpenAI,
      useOpenRouter: this.config.useOpenRouter,
      apiKey: this.config.apiKey || appConfig.apiKey,
    });
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
  public async run(message: string = ""): Promise<AgentResponse> {
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

    const aiResponse = await this.chat();

    // Process tool calls if any
    if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
      return await this.handleToolCalls(aiResponse);
    }

    return aiResponse;
  }

  /**
   * Handle tool calls from the AI
   */
  protected async handleToolCalls(aiResponse: AgentResponse): Promise<AgentResponse> {
    const toolCalls = aiResponse.toolCalls || [];

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const tool = this.findTool(toolCall.function.name);

      if (tool) {
        try {
          // Parse arguments from JSON string
          const args = JSON.parse(toolCall.function.arguments);

          // Execute the tool
          const result = await tool.execute(args, this.state.context);

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
          console.error(`Error executing tool ${toolCall.function.name}:`, error);
        }
      }
    }

    // Get final response with tool results
    return await this.run();
  }

  /**
   * Find a tool by name
   */
  protected findTool(name: string): Tool | undefined {
    return this.config.tools?.find(tool => tool.name === name);
  }

  /**
   * Get AI completion from the conversation history
   */
  protected async chat(): Promise<AgentResponse> {
    try {
      const response = await this.aiService.sendCompletion(this.getMessages(), this.config.model);

      this.pushMessage(createAssistantMessage(response.content));
      const toolCalls = this.extractToolCalls(response);

      return {
        response: response.content,
        toolCalls,
      };
    } catch (error: any) {
      console.error("Error getting AI completion:", error);
      throw error;
    }
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
    // Generate a system prompt that includes available tools
    let systemPrompt = this.config.systemPrompt;

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

      systemPrompt += "\nTo use a tool, respond with a JSON object in the following format inside a code block:\n";
      systemPrompt +=
        '```json\n{\n  "name": "tool_name",\n  "arguments": {\n    "param1": "value1",\n    "param2": "value2"\n  }\n}\n```\n\n';
      systemPrompt += "After getting the tool result, analyze it and respond with your final answer.";
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
    this.state.history = {
      messages: [],
      toolCalls: [],
    };
  }

  /**
   * Get the agent's history
   */
  public getHistory(): AgentRunHistory {
    return this.state.history;
  }
}
