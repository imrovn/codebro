export default {
  playwright: {
    "command": "npx",
    "args": ["@playwright/mcp@latest", "--headless"],
  },
  sequentialthinking: {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
  },
};
