import axios from "axios";
import fs from "fs";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OpenAPIV3 } from "openapi-types";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { APIMarketMCPServerConfig } from "./utils.js";
import { readFile } from "fs/promises";

// Define __dirname for ESM compatibility
const __dirname = dirname(fileURLToPath(import.meta.url));

export class APIMarketMCPServer {
  private server: Server;
  private config: APIMarketMCPServerConfig;

  private tools: Map<string, Tool> = new Map();
  private headers: Map<string, string> = new Map();

  constructor(config: APIMarketMCPServerConfig) {
    this.config = config;
    this.server = new Server({
      name: config.name,
      version: config.version,
    });

    this.initializeHandlers();
  }

  private async loadOpenAPISpec(file_path: string): Promise<OpenAPIV3.Document> {
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
    if (typeof file_path === "object" && file_path !== null) {
      return file_path as OpenAPIV3.Document;
    }
    throw new Error("Invalid OpenAPI specification format");
  }


  private async listOfFilePaths(): Promise<string[]> {
    const lines = [];
    try {
      const fileStream = fs.createReadStream(this.config.openApiSpec);

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        lines.push(line);
      }

      return lines; // Return the array of lines    
    } catch (error) {
      console.error(`Error reading file paths from ${this.config.openApiSpec}:`, error);
      throw new Error(`Failed to read API specifications list: ${error.message}`);
    }

  }

  private async parseOpenAPISpec(): Promise<void> {
    const paths = await this.listOfFilePaths()
    for (const cur_path of paths) {

      if (!cur_path || cur_path.trim() === '') {
        console.error('Skipping empty path');
        continue;
      }

      try {
        const spec = await this.loadOpenAPISpec(path.resolve(__dirname, cur_path));

        // Convert each OpenAPI path to an MCP tool
        for (const [path, pathItem] of Object.entries(spec.paths)) {
          if (!pathItem) continue;

          for (const [method, operation] of Object.entries(pathItem)) {
            if (method === "parameters" || !operation) continue;

            const op = operation as OpenAPIV3.OperationObject;
            // Create a clean tool ID by removing the leading slash and replacing special chars

            const cleanPath = path.replace(/^\//, "");
            const toolId = `${method.toUpperCase()}-${cleanPath}`.replace(
              /[^a-zA-Z0-9-_]/g,
              "-",
            );
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
              if (content?.['application/json']) {
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
              else if (content?.['application/x-www-form-urlencoded']) {
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
            }

            this.tools.set(toolId, tool);
          }
        }
      } catch (error) {
        console.error(`Error parsing OpenAPI spec from ${cur_path}:`, error);
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
        let path = "/" + pathParts.join("/")
          .replace(/-/g, "/")
          .replaceAll('!', "-");


        // Ensure base URL ends with slash for proper joining
        const baseUrl = this.config.apiBaseUrl.endsWith("/")
          ? this.config.apiBaseUrl
          : `${this.config.apiBaseUrl}/`;


        // Remove leading slash from path to avoid double slashes
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;

        let url;
        try {
          // Validate that the path results in a valid URL
          // Construct the full URL
          url = new URL(cleanPath, baseUrl).toString();
        } catch (error) {
          throw new Error(`Invalid path generated from tool ID ${toolId}: ${error.message}`);
        }
        // Prepare request configuration
        this.config.headers['Content-Type'] = this.headers.get(toolId)
        const config: any = {
          method: method.toLowerCase(),
          url: url,
          headers: this.config.headers,
        };

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

        console.error("Final request config:", config);

        try {

          const response = await axios(config);
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