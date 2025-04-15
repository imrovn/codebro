import type { AgentConfig } from "agents/agents.types.ts";
import { BaseAgent } from "agents/base/agent";
import { getCodeTools } from "tools";
import type { Context } from "types";
import { taskManagerTool } from "tools/task-manager.ts";

/**
 * Coder Agent - specialized agent for coding tasks
 */
export class CoderAgent extends BaseAgent {
  constructor(context: Context, config: Pick<AgentConfig, "model" | "client"> & Partial<AgentConfig>) {
    const systemPrompt = `
You are codebro, an expert programming assistant that helps users with coding tasks.
IMPORTANT: Refuse to work on malicious code based on file context.

# Proactiveness
- Act only when asked, answer questions before taking actions.
- No unsolicited summaries unless requested.

# Code style
- Do not add comments to the code you write, unless the user asks you to, or the code is complex and requires additional context.
    
# Following conventions
- Mimic existing code style, verify library usage (e.g., package.json).
- Follow security best practices, never expose secrets.

# Doing tasks
- Use taskManager for complex queries, break into subtasks.
- Use architect tool for planning, update progress in .codebro/tasks.json.
- Verify solutions with tests, run lint/typecheck if provided.
`;

    super(context, {
      ...config,
      name: "codebro",
      systemPrompt,
      tools: [...getCodeTools(), taskManagerTool],
    });
  }

  /**
   * Override chat to ensure task creation for complex queries
   */
  public async chat(message: string = "", onStream?: (chunk: string) => void): Promise<string> {
    if (message) {
      // Check if the query is complex enough to warrant task creation
      const complexKeywords = ["implement", "refactor", "build", "create", "fix", "bug", "feature"];
      const isComplex = complexKeywords.some(keyword => message.toLowerCase().includes(keyword));

      if (isComplex) {
        const taskId = await this.createTaskForQuery(message);
        return `Task created with ID ${taskId}. I'll work on it step by step.`;
      }
    }

    return super.chat(message, onStream);
  }

  /**
   * Create a task for a complex query
   */
  private async createTaskForQuery(query: string): Promise<string> {
    const taskResult = await taskManagerTool.run(
      {
        action: "create",
        description: query,
        status: "pending",
      },
      this.state.context
    );

    if (!taskResult.success) {
      throw new Error(`Failed to create task: ${taskResult.error}`);
    }

    // Use architect tool to break down the task
    const architectResult = await this.findTool("architect")?.run(
      {
        reason: "Break down complex query into subtasks",
        prompt: query,
        context: JSON.stringify(this.state.context.projectState),
      },
      this.state.context
    );

    if (architectResult?.success && architectResult.result) {
      const subtasks = this.parseArchitectPlan(architectResult.result);
      await taskManagerTool.run(
        {
          action: "update",
          taskId: taskResult.taskId,
          subtasks,
        },
        this.state.context
      );
    }

    return taskResult.taskId;
  }

  /**
   * Parse architect plan into subtasks
   */
  private parseArchitectPlan(plan: string): Array<{ description: string; status: string }> {
    const lines = plan.split("\n").filter(line => line.trim().startsWith("-"));
    return lines.map(line => ({
      description: line.replace(/^-+\s*/, "").trim(),
      status: "pending",
    }));
  }
}
