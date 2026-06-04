import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorksectionClient } from "../services/client.js";
import type { WorksectionComment } from "../types.js";
import {
  formatCommentMarkdown,
  truncateIfNeeded,
} from "../services/formatters.js";

export function registerCommentTools(
  server: McpServer,
  client: WorksectionClient,
  defaultUserEmail?: string
): void {
  // ─── get_comments ───
  server.registerTool(
    "worksection_get_comments",
    {
      title: "Get Task Comments",
      description: `Get all comments for a specific Worksection task.

Args:
  - id_task (string, required): Task ID
  - extra (string, optional): Set to "files" to include attached files info

Returns: List of comments with author, text, date, and optionally file attachments.`,
      inputSchema: {
        id_task: z.string().describe("Task ID"),
        extra: z
          .string()
          .optional()
          .describe('Set to "files" to include file attachments'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionComment[]>("get_comments", {
        id_task: params.id_task,
        extra: params.extra ?? "files",
      });

      const comments = response.data;
      if (!comments || comments.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No comments found for task ${params.id_task}.`,
            },
          ],
        };
      }

      const text = truncateIfNeeded(
        `# Comments (${comments.length})\n\n` +
          comments.map(formatCommentMarkdown).join("\n\n---\n\n")
      );

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ─── post_comment ───
  server.registerTool(
    "worksection_post_comment",
    {
      title: "Post Comment to Task",
      description: `Add a comment to a Worksection task.

Args:
  - id_task (string, required): Task ID to comment on
  - text (string, required): Comment text content
  - todo (string, optional): Checklist items, one per line (creates checkboxes in the comment)
  - email_user_from (string, optional): Email of the comment author (defaults to WORKSECTION_DEFAULT_USER_EMAIL env var if set, otherwise the API key owner)

Returns: Created comment data.`,
      inputSchema: {
        id_task: z.string().describe("Task ID to comment on"),
        text: z.string().min(1).describe("Comment text"),
        todo: z
          .string()
          .optional()
          .describe("Checklist items, one per line"),
        email_user_from: z
          .string()
          .email()
          .optional()
          .describe("Comment author email"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const { id_task, ...bodyParams } = params;
      const response = await client.post<WorksectionComment>(
        "post_comment",
        { id_task },
        {
          ...bodyParams,
          email_user_from: params.email_user_from ?? defaultUserEmail,
        } as Record<string, string | undefined>
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Comment posted successfully!\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    }
  );
}
