# Codebro

Codebro is an AI-powered coding assistant designed to streamline software development by providing intelligent code
editing, project analysis, and task management. Built with TypeScript and leveraging large language models, Codebro
supports developers in writing, debugging, and planning code efficiently.

## Features

- **Intelligent Code Editing**: Propose and apply precise code changes with tools like `proposeCode` and `editFile`.
- **Project Analysis**: Analyze your codebase with `searchCode` and `projectStructure` to understand file structures and
  content.
- **Task Management**: Break down tasks into actionable steps using `taskManager` and `architect`, with persistent state
  in `.codebro/tasks.md`.
- **Multiple LLM Providers**: Supports Azure, OpenAI, OpenRouter, Gemini, and local LLMs for flexible AI integration.
- **Interactive CLI**: Engage with Codebro via a command-line interface for real-time coding assistance.
- **Prompt Engineering**: Optimize prompts for various tasks with the `PromptEngineerAgent`.

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/rovndev/codebro.git
   cd codebro
   ```

2. **Install Dependencies**:

   ```bash
   bun install
   ```

3. **Set Up Environment Variables**:
   Copy the `.env.example` to `.env` and configure your API keys:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` to include your preferred LLM provider's API key and settings (
   e.g., `OPENAI_API_KEY`, `AZURE_OPENAI_API_KEY`, etc.).

4. **Build the Project**:

   ```bash
   bun run build
   ```

5. **Run Codebro**:
   ```bash
   bun run start
   ```

## Usage

Start Codebro in interactive mode:

```bash
bun run start
```

Print help message for more detail usage

```bash
bun start -h
# Or via executable bin
codebro -h
```

### Command-Line Options

- `--mode <mode>`: Choose the assistant mode (`coder` or `prompter`). Default: `coder`.
- `--provider <provider>`: Select the LLM provider (`azure`, `openai`, `openrouter`, `gemini`, `localLM`).
  Default: `azure`.

Example:

```bash
bun run start --mode coder --provider openai
```

## Agent Mode Switching

Codebro supports two agent modes:

- **EXECUTE**: Optimized for direct task execution (e.g., editing files, running commands).
- **PLAN**: Focused on planning and breaking down tasks before execution (e.g., architecting features).

To switch modes, use the `agentModeSwitch` tool via the CLI:

```bash
You: Switch to PLAN mode to plan a new feature
[tool] ✔ Switched agent mode to 'PLAN' for: Plan a new feature with step-by-step breakdown
✔ The mode has been successfully switched to PLAN. Please provide details about the new feature to plan its implementation.
```

## Wide range support LLM providers

Codebro is currently support multiple LLM such as Azure OpenAI, OpenAI, Openrouter, Gemini or even Local LLM like LM
studio or Ollama as long as their model support chat completion

See [Configuration](#configuration) for more detail and system environment needed to start using.

### Interactive Commands

- Type your coding query or task (e.g., "Create a REST API in TypeScript").
- Use `exit`, `quit`, or `bye` to close the CLI.

### Example Workflow

1. **Plan a Feature**:
   Use the `architect` tool to break down a task into steps:

   ```

   ```

You: Create a simple REST API
Codebro: Planning architecture...

- Task: Set up project structure
- Task: Define API routes
- Task: Implement endpoints

  ```

  ```

2. **Edit Code**:
   Propose and apply code changes:

   ```

   ```

You: Add a GET endpoint to fetch users
Codebro: Proposing code edit... File edited successfully: src/api.ts

```

3. **Manage Tasks**:
Track progress in `.codebro/tasks.md`:
```

# Codebro Tasks

# Task: Implement GET /users (task-123)

- [x] Define route (subtask-456)
- [ ] Implement logic (subtask-789)

  ```

  ```

## Model Context Protocol (MCP)

Codebro can use tools from MCP server via configuration file

MCP Resources: https://mcp.so/

See [Configuration](#configuration) for more detail.

<a name="configuration"></a>

## Configuration

Codebro stores user-specific configuration in:

- macOS: `~/Library/Application Support/com.github.rovndev.codebro`
- Linux: `~/.config/com.github.rovndev.codebro`
- Windows: `%APPDATA%\com.github.rovndev.codebro` (e.g.,
  `C:\Users\<Username>\AppData\Roaming\com.github.rovndev.codebro`)

The configuration directory contains:

- `config.json`: MCP server configurations, ignore files, and excluded tools.
    - mcpServers: MCP server configuration that compatible
      with [Claude Desktop Configuration file](https://modelcontextprotocol.io/examples#configuring-with-claude)
    - mcpServersPath: Path to the custom MCP servers configuration, overwrite config from `mcpServers`.
    - ignoreFiles: Files to ignore additionally
    - excludeTools: List tools name that you would like to ignore (default and tools from MCP servers).
- `.codebrorules`: Additional system prompts appended to the agent's system prompt.

Example `config.json`:

```json
{
  "@mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless"
      ]
    },
    "sequentialthinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    },
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ]
    }
  },
  "@mcpServersPath": "/path/to/your-mcp-config",
  "ignoreFiles": [
    "**/dist/**",
    "**/node_modules/**",
    "**/build/**"
  ],
  "excludeTools": []
}
```

Edit `.env` to customize:

- `CODEBRO_MODEL`: Specify the LLM model (e.g., `gpt-4o`).
- `USE_STREAMING`: Enable streaming responses (`true` or `false`).

Based on the provider setting of the CLI (`codebro -h`) default is `gpt-4o`, there are several env needed to able to
use.

### Azure OpenAI

export AZURE_OPENAI_API_KEY=
export AZURE_OPENAI_BASE_URL=

### OpenAI

export OPENAI_API_KEY=

### localLLM

export OPENAI_API_KEY=
export OPENAI_API_BASE_URL=

### Openrouter

export OPENROUTER_API_KEY=

### Gemini

export GEMINI_API_KEY=

## Roadmap

- [x] Support tools from any MCP repo via configuration file
- [ ] Enhance memory management
- [ ] Documentation eg. Changelog, changeset
- [ ] Unit tests
- [ ] Examples

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Support

For issues or feature requests, open an issue on the [GitHub repository](https://github.com/rovndev/codebro/issues).
