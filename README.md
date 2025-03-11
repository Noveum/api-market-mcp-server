# OpenAPI MCP Server

A Model Context Protocol (MCP) server that exposes OpenAPI endpoints as MCP resources. This server allows Large Language Models to discover and interact with REST APIs defined by OpenAPI specifications through the MCP protocol.

## Quick Start

You do not need to clone this repository to use this MCP server. You can simply configure it in Claude Desktop:

1. Locate or create your Claude Desktop configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Add the following configuration to enable the OpenAPI MCP server:

```json
{
  "mcpServers": {
    "openapi": {
      "command": "npx",
      "args": ["-y", "@ivotoby/openapi-mcp-server"],
      "env": {
        "API_BASE_URL": "https://api.example.com",
        "OPENAPI_SPEC_PATH": "https://api.example.com/openapi.json",
        "API_HEADERS": "Authorization:Bearer token123,X-API-Key:your-api-key"
      }
    }
  }
}
```

3. Replace the environment variables with your actual API configuration:
   - `API_BASE_URL`: The base URL of your API
   - `OPENAPI_SPEC_PATH`: URL or path to your OpenAPI specification
   - `API_HEADERS`: Comma-separated key:value pairs for API authentication headers

## Development Tools

This project includes several development tools to make your workflow easier:

### Usage Instructions

Before running the Node commands, please follow these steps:

1. **Prepare Your Directory:**  
   Create a folder and place all your OpenAPI JSON files inside it.

2. **Run `modify_api.py`:**  
   Execute the `modify_api.py` script with the directory set to the folder containing the JSON files. This will:
   - Create a new folder named `modified_json_files` inside the folder with the JSON files.
   - Generate a file named `modified_files.txt` that lists all the modified files.

3. **Set Environment Variables:**  
   Configure your environment by running the following commands:

   ```bash
   export OPENAPI_SPEC_PATH=modified_files.txt
   export API_BASE_URL=https://api.magicapi.dev/api/v1/

### Building

- `npm run build` - Builds the TypeScript source
- `npm run clean` - Removes build artifacts
- `npm run typecheck` - Runs TypeScript type checking

### Development Mode

- `npm run dev` - Watches source files and rebuilds on changes
- `npm run inspect-watch` - Runs the inspector with auto-reload on changes

### Code Quality

- `npm run lint` - Runs ESLint
- `npm run typecheck` - Verifies TypeScript types

## Configuration

The server can be configured through environment variables or command line arguments:

### Environment Variables

- `API_BASE_URL` - Base URL for the API endpoints
- `OPENAPI_SPEC_PATH` - Path or URL to OpenAPI specification
- `API_HEADERS` - Comma-separated key:value pairs for API headers
- `SERVER_NAME` - Name for the MCP server (default: "mcp-openapi-server")
- `SERVER_VERSION` - Version of the server (default: "1.0.0")

### Command Line Arguments

```bash
npm run inspect -- \
  --api-base-url https://api.example.com \
  --openapi-spec https://api.example.com/openapi.json \
  --headers "Authorization:Bearer token123,X-API-Key:your-api-key" \
  --name "my-mcp-server" \
  --version "1.0.0"
```

## Development Workflow

1. Start the development environment:
```bash
npm run inspect-watch
```

2. Make changes to the TypeScript files in `src/`
3. The server will automatically rebuild and restart
4. Use the MCP Inspector UI to test your changes

## Debugging

The server outputs debug logs to stderr. To see these logs:

1. In development mode:
   - Logs appear in the terminal running `inspect-watch`
   
2. When running directly:
   ```bash
   npm run inspect 2>debug.log
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting:
   ```bash
   npm run typecheck
   npm run lint
   ```
5. Submit a pull request

## License

MIT
