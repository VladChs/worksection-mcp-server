import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorksectionClient } from "../services/client.js";
import type { WorksectionMember } from "../types.js";
import { formatUser, truncateIfNeeded } from "../services/formatters.js";

export function registerMemberTools(
  server: McpServer,
  client: WorksectionClient
): void {
  // ─── get_members ───
  server.registerTool(
    "worksection_get_members",
    {
      title: "List Worksection Members",
      description: `Get all members (users) of the Worksection account.

Returns: List of members with id, email, name, online status, and role.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const response = await client.get<WorksectionMember[]>("get_users");

      const members = response.data;
      if (!members || members.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No members found." }],
        };
      }

      const text = members
        .map(
          (m) =>
            `- **${m.name}** — ${m.email}${m.role ? ` (${m.role})` : ""}${m.is_online === "1" ? " 🟢" : ""}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `# Account Members (${members.length})\n\n${text}`,
          },
        ],
      };
    }
  );

  // ─── add_project_members ───
  server.registerTool(
    "worksection_add_project_members",
    {
      title: "Add Members to Project",
      description: `Add one or more members to a Worksection project team.

Args:
  - id_project (string, required): Project ID
  - members (string, required): Comma-separated list of member email addresses

Returns: Confirmation.`,
      inputSchema: {
        id_project: z.string().describe("Project ID"),
        members: z
          .string()
          .describe("Comma-separated email addresses of members to add"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.post<unknown>(
        "add_project_members",
        { id_project: params.id_project },
        { members: params.members }
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Members added to project ${params.id_project}.`,
          },
        ],
      };
    }
  );
}
