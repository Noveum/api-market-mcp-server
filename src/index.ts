#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OpenAPIV3 } from "openapi-types";
import axios from "axios";
import { readFile } from "fs/promises";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema, // Changed from ExecuteToolRequestSchema
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as readline from 'readline';
interface OpenAPIMCPServerConfig {
  name: string;
  version: string;
  apiBaseUrl: string;
  openApiSpec: OpenAPIV3.Document | string;
  headers?: Record<string, string>;
}

function parseHeaders(headerStr?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (headerStr) {
    headerStr.split(",").forEach((header) => {
      const [key, value] = header.split(":");
      if (key && value) headers[key.trim()] = value.trim();
    });
  }
  return headers;
}
const path = require('path');
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname for ESM compatibility
const __dirname = dirname(fileURLToPath(import.meta.url));
console.log(__dirname);
function loadConfig(): OpenAPIMCPServerConfig {
  const argv = yargs(hideBin(process.argv))
    .option("api-base-url", {
      alias: "u",
      type: "string",
      description: "Base URL for the API",
    })
    .option("openapi-spec", {
      alias: "s",
      type: "string",
      description: "Path or URL to OpenAPI specification",
    })
    .option("headers", {
      alias: "H",
      type: "string",
      description: "API headers in format 'key1:value1,key2:value2'",
    })
    .option("name", {
      alias: "n",
      type: "string",
      description: "Server name",
    })
    .option("version", {
      alias: "v",
      type: "string",
      description: "Server version",
    })
    .help().argv;

  // Combine CLI args and env vars, with CLI taking precedence
  const apiBaseUrl = argv["api-base-url"] || process.env.API_BASE_URL || "https://api.magicapi.dev/api/v1/";
  const openApiSpec = argv["openapi-spec"] || process.env.OPENAPI_SPEC_PATH || path.resolve(__dirname, '../modified_files.txt');

  if (!apiBaseUrl) {
    throw new Error(
      "API base URL is required (--api-base-url or API_BASE_URL)",
    );
  }
  if (!openApiSpec) {
    throw new Error(
      "OpenAPI spec is required (--openapi-spec or OPENAPI_SPEC_PATH)",
    );
  }

  const headers = parseHeaders(argv.headers || process.env.API_HEADERS);

  return {
    name: argv.name || process.env.SERVER_NAME || "mcp-openapi-server",
    version: argv.version || process.env.SERVER_VERSION || "1.0.0",
    apiBaseUrl,
    openApiSpec,
    headers,
  };
}

class OpenAPIMCPServer {
  private server: Server;
  private config: OpenAPIMCPServerConfig;

  private tools: Map<string, Tool> = new Map();
  private headers: Map<string, string> = new Map();
  
  constructor(config: OpenAPIMCPServerConfig) {
    this.config = config;
    this.server = new Server({
      name: config.name,
      version: config.version,
    });

    this.initializeHandlers();
  }

  private async loadOpenAPISpec(file_path): Promise<OpenAPIV3.Document> {  //mark
    if (typeof file_path === "string") {
      if (file_path.startsWith("http")) {
        // Load from URL
        const response = await axios.get(file_path);
        return response.data as OpenAPIV3.Document;
      } else {
        // Load from local file
        const content = await readFile(file_path, "utf-8");
        return JSON.parse(content) as OpenAPIV3.Document;
      }
    }
    return file_path as OpenAPIV3.Document;
  }

  private async listOfFilePaths(): Promise<string[]>{
    const lines = [];
    const fileStream = fs.createReadStream(this.config.openApiSpec);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        lines.push(line);
    }

    return lines; // Return the array of lines    
  }
  private async parseOpenAPISpec(): Promise<void> {
    const paths = await this.listOfFilePaths()
    for (const cur_path of paths){

    
    const spec = await this.loadOpenAPISpec(path.resolve(__dirname, cur_path));

    // Convert each OpenAPI path to an MCP tool
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === "parameters" || !operation) continue;

        const op = operation as OpenAPIV3.OperationObject;
        // Create a clean tool ID by removing the leading slash and replacing special chars
        console.error(path);
        const cleanPath = path.replace(/^\//, "");
        const toolId = `${method.toUpperCase()}-${cleanPath}`.replace(
          /[^a-zA-Z0-9-_]/g,
          "-",
        );
        console.error(`Registering tool: ${toolId}`); // Debug logging
        const tool: Tool = {
          name:
            (op.operationId || op.summary || `${method.toUpperCase()} ${path}`).replace(/\s+/g, "_"),
          description:
            op.description ||
            `Make a ${method.toUpperCase()} request to ${path}`,
          inputSchema: {
            type: "object",
            properties: {},
            // Add any additional properties from OpenAPI spec
          },
        };

        // Store the mapping between name and ID for reverse lookup
        console.error(`Registering tool: ${toolId} (${tool.name})`);

        // Add parameters from operation
        if (op.parameters) {
          for (const param of op.parameters) {
            if ("name" in param && "in" in param) {
              const paramSchema = param.schema as OpenAPIV3.SchemaObject;
              tool.inputSchema.properties[param.name] = {
                type: paramSchema.type || "string",
                description: param.description || `${param.name} parameter`,
              };
              if (param.required) {
                tool.inputSchema.required = tool.inputSchema.required || [];
                tool.inputSchema.required.push(param.name);
              }
            }
          }
        }

        // Add request body if present (for POST, PUT, etc.)
        if (op.requestBody) {
          const requestBody = op.requestBody as OpenAPIV3.RequestBodyObject;
          const content = requestBody.content;
          
          // Usually we'd look for application/json content type
          if (content && content['application/json']) {
            this.headers.set(toolId, 'application/json');
            const jsonSchema = content['application/json'].schema as OpenAPIV3.SchemaObject;
            
            // If it's a reference, we'd need to resolve it
            // For simplicity, assuming it's an inline schema
            if (jsonSchema.properties) {
              // Add all properties from the request body schema
              for (const [propName, propSchema] of Object.entries(jsonSchema.properties)) {
                tool.inputSchema.properties[propName] = propSchema;
              }
              
              // Add required properties if defined
              if (jsonSchema.required) {
                tool.inputSchema.required = tool.inputSchema.required || [];
                tool.inputSchema.required.push(...jsonSchema.required);
              }
            }
          }
          else if (content && content['application/x-www-form-urlencoded']) {
            this.headers.set(toolId, 'application/x-www-form-urlencoded');
            const urlencodedSchema = content['application/x-www-form-urlencoded'].schema as OpenAPIV3.SchemaObject;
          
            if (urlencodedSchema.properties) {
              for (const [propName, propSchema] of Object.entries(urlencodedSchema.properties)) {
                tool.inputSchema.properties[propName] = propSchema;
              }
          
              if (urlencodedSchema.required) {
                tool.inputSchema.required = tool.inputSchema.required || [];
                tool.inputSchema.required.push(...urlencodedSchema.required);
              }
            }
          }
        
        
        else if (content && content['multipart/form-data']) {
          this.headers.set(toolId, 'multipart/form-data');
          const urlencodedSchema = content['multipart/form-data'].schema as OpenAPIV3.SchemaObject;
        
          if (urlencodedSchema.properties) {
            for (const [propName, propSchema] of Object.entries(urlencodedSchema.properties)) {
              tool.inputSchema.properties[propName] = propSchema;
            }
        
            if (urlencodedSchema.required) {
              tool.inputSchema.required = tool.inputSchema.required || [];
              tool.inputSchema.required.push(...urlencodedSchema.required);
            }
          }
        }
        
      }
        
        this.tools.set(toolId, tool);
      }
    }
  }
}

  private initializeHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { id, name, arguments: params } = request.params;

      console.error("Received request:", request.params);
      console.error("Using parameters from arguments:", params);

      // Find tool by ID or name
      let tool: Tool | undefined;
      let toolId: string | undefined;

      if (id) {
        toolId = id.trim();
        tool = this.tools.get(toolId);
      } else if (name) {
        // Search for tool by name
        for (const [tid, t] of this.tools.entries()) {
          if (t.name === name) {
            tool = t;
            toolId = tid;
            break;
          }
        }
      }

      if (!tool || !toolId) {
        console.error(
          `Available tools: ${Array.from(this.tools.entries())
            .map(([id, t]) => `${id} (${t.name})`)
            .join(", ")}`,
        );
        throw new Error(`Tool not found: ${id || name}`);
      }

      console.error(`Executing tool: ${toolId} (${tool.name})`);

      try {
        // Extract method and path from tool ID
        const [method, ...pathParts] = toolId.split("-");
        const path_temp = "/" + pathParts.join("/").replace(/-/g, "/");
        const path = path_temp.replaceAll('_', "-");
        console.error('the path');
        console.error(path_temp)
        console.error(path)
        // Ensure base URL ends with slash for proper joining
        const baseUrl = this.config.apiBaseUrl.endsWith("/")
          ? this.config.apiBaseUrl
          : `${this.config.apiBaseUrl}/`;

        // Remove leading slash from path to avoid double slashes
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;

        // Construct the full URL
        const url = new URL(cleanPath, baseUrl).toString();

        //console.error(`Making API request: ${method.toLowerCase()} ${url}`);
        //console.error(`Base URL: ${baseUrl}`);
        //console.error(`Path: ${cleanPath}`);
        //console.error(`Raw parameters:`, params);
        //console.error(`Request headers:`, this.config.headers);

        // Prepare request configuration
        this.config.headers['Content-Type'] = this.headers.get(toolId)
        const config: any = {
          method: method.toLowerCase(),
          url: url,
          headers: this.config.headers,
        };
        console.error(this.config.headers);
        console.error('just marking')

        // Handle different parameter types based on HTTP method
        if (method.toLowerCase() === "get") {
          // For GET requests, ensure parameters are properly structured
          if (params && typeof params === "object") {
            // Handle array parameters properly
            const queryParams: Record<string, string> = {};
            for (const [key, value] of Object.entries(params)) {
              if (Array.isArray(value)) {
                // Join array values with commas for query params
                queryParams[key] = value.join(",");
              } else if (value !== undefined && value !== null) {
                // Convert other values to strings
                queryParams[key] = String(value);
              }
            }
            config.params = queryParams;
          }
        } else {
          // For POST, PUT, PATCH - send as body
          config.data = params;
        }

        console.error(`Processed parameters:`, config.params || config.data);

        console.error("Final request config:", config);

        try {
          console.error('lolololol');
          console.error(config);
          console.error(Object.keys(config));
          console.error(Object.values(config))
          const response = await axios(config);
          console.error("Response status:", response.status);
          console.error("Response headers:", response.headers);
          console.error("Response data:", response.data);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error("Request failed:", {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              headers: error.response?.headers,
            });
            throw new Error(
              `API request failed: ${error.message} - ${JSON.stringify(error.response?.data)}`,
            );
          }
          throw error;
        }

      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`API request failed: ${error.message}`);
        }
        throw error;
      }
    });
  }

  async start(): Promise<void> {
    await this.parseOpenAPISpec();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("OpenAPI MCP Server running on stdio");
  }
}

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const server = new OpenAPIMCPServer(config);
    await server.start();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

export { OpenAPIMCPServer, loadConfig };
