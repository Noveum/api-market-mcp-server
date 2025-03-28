# Installing and Using the OpenAPI MCP Server

This project is designed to be used as an MCP server and is primarily accessed via the **npx** command. There is no traditional installation required—simply configure your client to use the MCP server.

## Quick Start with npx

### For Claude Desktop

1. Locate or create your configuration file (e.g., `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS).

2. Add the following configuration:
   
   ```json
   {
     "mcpServers": {
       "openapi": {
         "command": "npx",
         "args": ["-y", "@noveum-ai/mcp-server"],
         "env": {
           "API_HEADERS": "x-magicapi-key:<your-api-key>,Accept:application/json"
         }
       }
     }
   }
   ```

3. Replace the environment variables with your actual API configuration.

### For Cursor

1. Go to **File -> Preferences -> Cursor Settings**.
2. Select **MCP**.
3. Click on **Add New MCP Server**.
4. Paste the following command:
   
   ```bash
   npx -y @noveum-ai/mcp-server --headers x-magicapi-key:<your-api-key>,Accept:application/json
   ```

<!-- ## Environment Variables

You can configure the following environment variables for further customization:

- **API_BASE_URL**: The base URL of your API (optional).
- **OPENAPI_SPEC_PATH**: URL or path to your OpenAPI specification (optional).
- **API_HEADERS**: Comma-separated key:value pairs for API authentication headers. -->

## For Development Purposes

To run the MCP server locally (for debugging or development):

1. **Clone the Repository and Install Dependencies**
   
   ```bash
   git clone https://github.com/Noveum/api-market-mcp-server.git
   cd api-market-mcp-server
   npm install
   ```

2. **Build the Server**
   
   ```bash
   npm run build
   ```

3. **Run or Debug the Server**

   For running:
   
   ```bash
   npm run inspect
   ```


If you have any issues or questions, please open an issue on GitHub or join our community discussions.
