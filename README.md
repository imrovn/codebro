# CodeBro 🤖

A modular AI agent framework built with TypeScript and Vercel AI SDK.

## Features

- 🧩 Modular provider system for different LLM backends
- 🔄 Task loop execution with retry mechanism
- 📦 Type-safe and well-documented
- 🔌 Easy to extend with new providers
- 🚀 Built with Vercel AI SDK

## Supported Providers

- OpenAI
- Azure OpenAI
- OpenRouter
- Local LLMs (via LM Studio)

## Installation

```bash
npm install codebro
```

## Usage

### Basic Usage

```typescript
import { ProviderFactory } from "codebro/core/providers";
import { TaskLoopExecutor } from "codebro/core/task";

// Create a provider
const provider = ProviderFactory.createProvider("openai", {
    model: "gpt-4",
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize the provider
await provider.initialize();

// Create a task executor
const executor = new TaskLoopExecutor(provider);

// Execute a task
const task = {
    id: "task-1",
    type: "code-generation",
    status: "pending",
    input: {
        language: "typescript",
        description: "Create a hello world function",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
};

const result = await executor.execute(task);
console.log(result.output);
```

### Adding a New Provider

```typescript
import { BaseProvider } from "codebro/core/providers";
import { ProviderFactory } from "codebro/core/providers/factory";

class CustomProvider extends BaseProvider {
    constructor(config: ProviderConfig) {
        super("custom", config);
    }

    // Implement required methods
    async initialize(): Promise<void> {
        // Initialize your provider
    }

    async generate(messages: Message[]): Promise<Message> {
        // Implement message generation
    }

    async *stream(messages: Message[]): AsyncGenerator<Message, void, unknown> {
        // Implement streaming
    }

    async getModels(): Promise<Model[]> {
        // Return available models
    }
}

// Register the provider
ProviderFactory.registerProvider("custom", CustomProvider);
```

## Configuration

Create a `.env` file with your provider configurations:

```env
OPENAI_API_KEY=your_api_key
AZURE_API_KEY=your_api_key
AZURE_API_ENDPOINT=your_endpoint
OPENROUTER_API_KEY=your_api_key
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build
```

## License

MIT
