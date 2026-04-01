import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorksectionClient } from "../services/client.js";
import type { WorksectionTag } from "../types.js";

export function registerTagTools(
  server: McpServer,
  client: WorksectionClient
): void {
  // ─── get_tags ───
  server.registerTool(
    "worksection_get_tags",
    {
      title: "Get Worksection Tags",
      description: `Get all available tags (labels/statuses) for projects or tasks.

Args:
  - type (string, optional): "project" for project tags, "task" for task tags. Defaults to both.

Returns: List of tags with id and name.`,
      inputSchema: {
        type: z
          .enum(["project", "task"])
          .optional()
          .describe('Tag type: "project" or "task"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionTag[]>("get_tags", {
        type: params.type,
      });

      const tags = response.data;
      if (!tags || tags.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No tags found." }],
        };
      }

      const text = tags
        .map((t) => `- **${t.name}** (ID: ${t.id})`)
        .join("\n");

      return {
        content: [
          { type: "text" as const, text: `# Tags\n\n${text}` },
        ],
      };
    }
  );

  // ─── set_task_tags ───
  server.registerTool(
    "worksection_set_task_tags",
    {
      title: "Set Task Tags",
      description: `Set tags (labels/statuses) on a Worksection task.

Args:
  - id_task (string, required): Task ID
  - tags (string, required): Comma-separated tag names or IDs

Returns: Confirmation.`,
      inputSchema: {
        id_task: z.string().describe("Task ID"),
        tags: z.string().describe("Comma-separated tag names or IDs"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      await client.post<unknown>(
        "set_tags",
        { id_task: params.id_task },
        { tags: params.tags }
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Tags set on task ${params.id_task}.`,
          },
        ],
      };
    }
  );
}
