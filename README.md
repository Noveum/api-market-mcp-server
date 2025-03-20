# OpenAPI MCP Server

## About
A Model Context Protocol (MCP) server that exposes OpenAPI endpoints as MCP resources. This server allows Large Language Models to discover and interact with APIs defined by OpenAPI specifications through the MCP protocol.  
This repository provides access to the APIs available at [API.market](https://api.market/). The tool is free to use and allows agents to communicate freely with all available APIs, making it super powerful. With over **200+ APIs** available at [API.market](https://api.market/), you can leverage a wide range of functionalities.

## Quick Start

You do not need to clone this repository to use this MCP server. You can simply configure it in your client of choice.

### For Claude Desktop
1. Locate or create your Claude Desktop configuration file:
   - On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Add the following configuration to enable the OpenAPI MCP server:
   ```json
   {
     "mcpServers": {
       "openapi": {
         "command": "npx",
         "args": ["-y", "@shvmgpt/openapi-mcp-server"],
         "env": {
           "API_HEADERS": "X-magicapi-key:your-api-key,Accept:application/json"
         }
       }
     }
   }
   ```

3. Replace the environment variables with your actual API configuration:
 - `API_BASE_URL`: The base URL of your API (optional)
 - `OPENAPI_SPEC_PATH`: URL or path to your OpenAPI specification (optional)
 -`API_HEADERS`: Comma-separated key:value pairs for API authentication headers

### For Cursor
1. Go to File -> Preferences -> Cursor Settings.
2. Select MCP.
3. Click on Add New MCP Server.
4. Paste the following command.

   ```bash
   npx -y @shvmgpt/openapi-mcp-server --headers x-magicapi-key:your-api-key,Accept:application/json
   ```
## Getting API Key from API.market

 To obtain your API key
 1. Log in to https://api.market/
 2. Go to your profile and select 'My API Keys'
 3. Your API keys will be displayed here

## List of APIs in this MCP
- GET-trueway-matrix-MatrixService-CalculateDrivingMatrix
- GET-magicapi-whisper-predictions--request_id
- POST-magicapi-whisper-whisper
- POST-capix-faceswap-upload
- POST-capix-faceswap-faceswap-v1-image POST-capix-faceswap-faceswap-v1-video
- POST-capix-faceswap-result
- GET-trueway-geocoding-GeocodingService-Geocode 
- GET-trueway-geocoding-GeocodingService-ReverseGeocode
- POST-magicapi-dnschecker-dnschecker
- GET-magicapi-coder-predictions--request_id
- POST-magicapi-coder-coder
- POST-bridgeml-nsfw-detection-nsfw_detection
- GET-magicapi-whois-whois--domain-
- GET-magicapi-deblurer-predictions--request_id
- POST-magicapi-deblurer-deblurer
- POST-bridgeml-text-to-image-text_to_image
- GET-magicapi-period-predictions--request_id
- POST-magicapi-period-period
- GET-trueway-places-PlacesService-FindPlaceByText
- GET-trueway-places-PlacesService-FindPlacesNearby
- GET-magicapi-hair-predictions--request_id
- POST-magicapi-hair-hair
- POST-bridgeml-codellama-bridgeml-codellama
- GET-brave-brave-videos-search
- GET-brave-brave-web-search GET-brave-brave-images-search
- GET-brave-brave-news-search GET-brave-brave-suggest-search GET-brave-brave-spellcheck-search
- POST-magicapi-domainchecker-check_domains
- GET-trueway-routing-DirectionsService-FindDrivingRoute
- GET-trueway-routing-DirectionsService-FindDrivingPath
- POST-pipfeed-parse-extract

## Example and Usage
### Example 1
We can use the agent to find route between any two points

![Example 1](./images/example1.png "Example 1")

### Example 2
We can use the agent to find news about any topic, and then dig deeper into the articles

![Example 2.1](./images/example2.1.png "Example 2.1")
![Example 2.2](./images/example2.2.png "Example 2.2")

### Example 3
We can use the agent to look for available domains

![Example 3](./images/example3.png "Example 3")

## Development Tools

### Building
- `npm run build` - Builds the TypeScript source.
- `npm run clean` - Removes build artifacts.
- `npm run typecheck` - Runs TypeScript type checking.

### Development Mode
- `npm run dev` - Watches source files and rebuilds on changes.
- `npm run inspect-watch` - Runs the inspector with auto-reload on changes.

### Code Quality
- `npm run lint` - Runs ESLint.
- `npm run typecheck` - Verifies TypeScript types.

### Adding Your Own API to the MCP Server
To add your own API, ensure it is an **OpenAPI formatted API**. Follow these steps:
1. Create a new folder for your API.
2. Clone this repository:
```bash
git clone https://github.com/your-username/repo-name.git
```
3. Change into your folder:
```bash
cd your-folder
```
4. In the folder named `json_files`, add your OpenAPI specification.
Before running the Node commands, please follow these steps:


5. Run modify_api.py:
- Execute the `modify_api.py` script with the directory set to the folder containing the JSON files. This will:
  - Create a new folder named `modified_json_files` inside the folder with the JSON files.
  - Generate a file named `modified_files.txt` that lists all the modified files.

6. Run shorten_summary_in_specs:
- Add your `x-magicapi-key` as an environment variable.
- Run the Python script.
- Alternatively, you can use `manual_summary_shortner.py` to shorten the summaries manually.


6. Publish your package using npm:
```bash
npm publish --access public
```

### Configuration
The server can be configured through environment variables or command line arguments:

#### Environment Variables
- `API_BASE_URL` - Base URL for the API endpoints.
- `OPENAPI_SPEC_PATH` - Path or URL to the OpenAPI specification.
- `API_HEADERS` - Comma-separated key:value pairs for API headers.
- `SERVER_NAME` - Name for the MCP server (default: "mcp-openapi-server").
- `SERVER_VERSION` - Version of the server (default: "1.0.0").

##### Set Environment Variables:
Configure your environment by running the following commands:
```bash
export OPENAPI_SPEC_PATH=modified_files.txt # optional
export API_BASE_URL=https://api.magicapi.dev/api/v1/ # optional
export API_HEADERS="x-magicapi-key:your-api-key,Accept:application/json"
```

#### Command Line Arguments
```bash
npm run inspect -- \
  --api-base-url https://api.magicapi.dev/api/v1/ \
  --openapi-spec modified_files.txt \
  --headers "x-magicapi-key:your-api-key,Accept:application/json" \
  --name "my-mcp-server" \
  --version "1.0.0"
```

### Development Workflow
1. Start the development environment:
```bash
npm run inspect-watch
```
2. Make changes to the TypeScript files in `src/`.
3. The server will automatically rebuild and restart.
4. Use the MCP Inspector UI to test your changes.

### Debugging or Running Locally
To debug or run the MCP server locally:
1. Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/repo-name.git
cd repo-name
npm install
```
2. build the server:
```bash
npm run build
```
3. For debugging, you can run:
```bash
npm run inspect 
```

### Contributing
1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run tests and linting:
```bash
npm run typecheck
npm run lint
```
5. Submit a pull request.

### License
MIT
