#!/usr/bin/env node

import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  getToolsFromOpenApi,
  McpToolDefinition,
  GetToolsOptions,
} from "openapi-mcp-generator";
import dotenv from "dotenv";
import got, { OptionsInit as GotOptionsInit } from "got";

dotenv.config();

const baseServerUrl = process.env.BASE_SERVER_URL;
const openapiPath = process.env.OPENAPI_PATH;

interface OpenAPITool extends Tool {
  function: (args: any) => Promise<any>;
}

class OpenAPIClient {
  private server: Server;
  private tools: OpenAPITool[] = [];

  constructor() {
    this.server = new Server(
      {
        name: "openapi-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const tool = this.tools.find((t) => t.name === request.params.name);
        if (!tool) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Tool ${request.params.name} not found`
          );
        }

        const args = request.params.arguments ?? {};

        const jsonBody = args.requestBody;
        const headers: Record<string, string> = {};
        const searchParams: Record<string, string> = {};
        let path = tool.pathTemplate as string;
        (tool.parameters as any[]).forEach((param: any) => {
          switch (param.in) {
            case "path":
              //replace the path with the args, matched `{param.name}` or ':id'
              path = path.replace(
                `{${param.name}}`,
                args[param.name] as string
              );
              path = path.replace(`:${param.name}`, args[param.name] as string);
              break;
            case "query":
              searchParams[param.name] = args[param.name] as string;
              break;
            case "header":
              headers[param.name] = args[param.name] as string;
              break;
            default:
              console.error("Unknown parameter type:", param.in);
              break;
          }
        });

        // Call the tool function with the provided arguments
        const result = await tool.function({
          path,
          headers,
          searchParams: new URLSearchParams(searchParams),
          jsonBody,
        });

        const resultText =
          typeof result === "object" ? JSON.stringify(result, null, 2) : result;

        return {
          content: [
            {
              type: "text",
              text: resultText,
            },
          ],
        };
      } catch (error: any) {
        console.error(`Error executing tool ${request.params.name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute tool: ${error.message}`
        );
      }
    });
  }

  private async loadTools(): Promise<void> {
    try {
      const config: GetToolsOptions = {
        baseUrl: baseServerUrl,
        dereference: true,
        excludeOperationIds: [],
        filterFn: (tool: McpToolDefinition) => true,
      };

      const rawTools = await getToolsFromOpenApi(openapiPath, config);

      // Transform the tools to include HTTP request functionality
      this.tools = rawTools.map((tool: McpToolDefinition) => ({
        ...tool,
        function: async (args: {
          path: string;
          headers: Record<string, string>;
          searchParams: Record<string, string>;
          jsonBody: Record<string, any>;
        }) => {
          const { path, headers, searchParams, jsonBody } = args;
          const method = tool.method.toLowerCase();

          const url = new URL(path, config.baseUrl);

          try {
            const gotOptions: GotOptionsInit = {
              method,
              headers,
              searchParams,
            };
            if (method !== "get") {
              gotOptions.json = jsonBody;
            }
            const response = await got(url, gotOptions);

            return (response as any).body;
          } catch (error: any) {
            console.error(`HTTP request failed for ${tool.name}:`, error);
            throw new McpError(
              ErrorCode.InternalError,
              `HTTP request failed: ${error.message}`
            );
          }
        },
      })) as OpenAPITool[];
    } catch (error) {
      console.error("Error loading tools from OpenAPI:", error);
      throw error;
    }
  }

  async run(): Promise<void> {
    await this.loadTools();
    const app = express();
    app.use(express.json());

    app.post("/mcp", async (req: Request, res: Response) => {
      // In stateless mode, create a new instance of transport and server for each request
      // to ensure complete isolation. A single instance would cause request ID collisions
      // when multiple clients connect concurrently.

      try {
        const transport: StreamableHTTPServerTransport =
          new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });
        res.on("close", () => {
          console.log("Request closed");
          transport.close();
          this.server.close();
        });
        await this.server.connect(transport);

        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (!req.body.params) {
          req.body.params = {};
        }
        req.body.params.context = { token };
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    });

    const port = process.env.PORT || 8000;
    console.error("OpenAPI MCP server running on http, port:", port);
    app.listen(port);
    // const transport = new StdioServerTransport();
    // await this.server.connect(transport);
    // console.error("Tavily MCP server running on stdio");
  }
}

// Start the server
const client = new OpenAPIClient();
client.run().catch((error) => {
  console.error("Failed to run server:", error);
  process.exit(1);
});
