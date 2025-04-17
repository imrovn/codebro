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

### Command-Line Options

- `--mode <mode>`: Choose the assistant mode (`coder` or `prompter`). Default: `coder`.
- `--provider <provider>`: Select the LLM provider (`azure`, `openai`, `openrouter`, `gemini`, `localLM`).
  Default: `azure`.

Example:

```bash
bun run start --mode coder --provider openai
```

### Interactive Commands

- Type your coding query or task (e.g., "Create a REST API in TypeScript").
- Use `exit`, `quit`, or `bye` to close the CLI.

### Example Workflow

1. **Plan a Feature**:
   Use the `architect` tool to break down a task into steps:
   ```
   You: Create a simple REST API
   Codebro: Planning architecture...
   - Task: Set up project structure
   - Task: Define API routes
   - Task: Implement endpoints
   ```

2. **Edit Code**:
   Propose and apply code changes:
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

## Configuration

Edit `.env` to customize:

- `CODEBRO_MODEL`: Specify the LLM model (e.g., `gemini-2.5-pro-exp-03-25`).
- `USE_STREAMING`: Enable streaming responses (`true` or `false`).
- Provider-specific settings (e.g., `OPENAI_API_BASE_URL`, `AZURE_OPENAI_API_VERSION`)

## Roadmap

- [ ] Support tools from any MCP repo via configuration file
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

