#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClientFromEnv } from "./services/client.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerMemberTools } from "./tools/members.js";
import { registerTagTools } from "./tools/tags.js";

async function main(): Promise<void> {
  const client = createClientFromEnv();

  const server = new McpServer({
    name: "worksection-mcp-server",
    version: "1.0.0",
  });

  // Register all tool groups
  registerProjectTools(server, client);
  registerTaskTools(server, client);
  registerCommentTools(server, client);
  registerMemberTools(server, client);
  registerTagTools(server, client);

  // Use stdio transport for local integrations (Claude Desktop, Claude Code, etc.)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error("Worksection MCP server started (stdio transport)");
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
