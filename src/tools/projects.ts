import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorksectionClient } from "../services/client.js";
import type { WorksectionProject, WorksectionProjectGroup } from "../types.js";
import {
  formatProjectMarkdown,
  truncateIfNeeded,
} from "../services/formatters.js";

export function registerProjectTools(
  server: McpServer,
  client: WorksectionClient,
  defaultUserEmail?: string
): void {
  // ─── get_projects ───
  server.registerTool(
    "worksection_get_projects",
    {
      title: "List Worksection Projects",
      description: `List all projects in the Worksection account with optional filtering by status.

Args:
  - filter (string, optional): Filter by status — "active", "pending", or "archived"
  - extra (string, optional): Additional data to include — comma-separated: "text", "html", "options", "users"

Returns: List of projects with id, name, status, folder, author, manager, dates, estimates, tags.`,
      inputSchema: {
        filter: z
          .enum(["active", "pending", "archived"])
          .optional()
          .describe('Filter by project status: "active", "pending", or "archived"'),
        extra: z
          .string()
          .optional()
          .describe('Comma-separated extras: "text", "html", "options", "users"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionProject[]>("get_projects", {
        filter: params.filter,
        extra: params.extra ?? "text,users",
      });

      const projects = response.data;
      if (!projects || projects.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No projects found matching the specified filter.",
            },
          ],
        };
      }

      const text = truncateIfNeeded(
        `# Projects (${projects.length})\n\n` +
          projects.map(formatProjectMarkdown).join("\n\n---\n\n")
      );

      return {
        content: [{ type: "text" as const, text }],
      };
    }
  );

  // ─── get_project ───
  server.registerTool(
    "worksection_get_project",
    {
      title: "Get Worksection Project Details",
      description: `Get detailed information about a specific Worksection project by its ID.

Args:
  - id_project (string, required): The project ID
  - extra (string, optional): Additional data — comma-separated: "text", "html", "options", "users"

Returns: Project details including name, status, dates, team members, settings.`,
      inputSchema: {
        id_project: z.string().describe("Project ID"),
        extra: z
          .string()
          .optional()
          .describe('Comma-separated extras: "text", "html", "options", "users"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionProject>("get_project", {
        id_project: params.id_project,
        extra: params.extra ?? "text,options,users",
      });

      return {
        content: [
          {
            type: "text" as const,
            text: formatProjectMarkdown(response.data),
          },
        ],
      };
    }
  );

  // ─── post_project ───
  server.registerTool(
    "worksection_create_project",
    {
      title: "Create Worksection Project",
      description: `Create a new project in Worksection.

Args:
  - title (string, required): Project name
  - email_manager (string, optional): Email of the project manager
  - email_user_from (string, optional): Email of the project creator (defaults to WORKSECTION_DEFAULT_USER_EMAIL env var if set, otherwise the API key owner)
  - text (string, optional): Project description
  - date_start (string, optional): Start date in YYYY-MM-DD format
  - date_end (string, optional): Due date in YYYY-MM-DD format
  - max_time (string, optional): Time estimate in hours
  - max_money (string, optional): Financial budget estimate

Returns: Created project data with ID.`,
      inputSchema: {
        title: z.string().min(1).describe("Project name"),
        email_manager: z.string().email().optional().describe("Project manager email"),
        email_user_from: z.string().email().optional().describe("Creator email"),
        text: z.string().optional().describe("Project description"),
        date_start: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Start date YYYY-MM-DD"),
        date_end: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Due date YYYY-MM-DD"),
        max_time: z.string().optional().describe("Time estimate in hours"),
        max_money: z.string().optional().describe("Budget estimate"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.post<WorksectionProject>("post_project", {}, {
        title: params.title,
        email_manager: params.email_manager,
        email_user_from: params.email_user_from ?? defaultUserEmail,
        text: params.text,
        date_start: params.date_start,
        date_end: params.date_end,
        max_time: params.max_time,
        max_money: params.max_money,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Project created successfully!\n\n${formatProjectMarkdown(response.data)}`,
          },
        ],
      };
    }
  );

  // ─── update_project ───
  server.registerTool(
    "worksection_update_project",
    {
      title: "Update Worksection Project",
      description: `Update an existing Worksection project. Only provided fields will be updated.

Args:
  - id_project (string, required): Project ID
  - title (string, optional): New project name
  - email_manager (string, optional): New project manager email
  - text (string, optional): New description
  - date_start (string, optional): New start date YYYY-MM-DD
  - date_end (string, optional): New due date YYYY-MM-DD

Returns: Updated project data.`,
      inputSchema: {
        id_project: z.string().describe("Project ID to update"),
        title: z.string().optional().describe("New project name"),
        email_manager: z.string().email().optional().describe("New manager email"),
        text: z.string().optional().describe("New description"),
        date_start: z.string().optional().describe("New start date YYYY-MM-DD"),
        date_end: z.string().optional().describe("New due date YYYY-MM-DD"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const { id_project, ...updateFields } = params;
      const response = await client.post<WorksectionProject>(
        "update_project",
        { id_project },
        updateFields as Record<string, string | undefined>
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Project updated successfully!\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    }
  );

  // ─── close_project / activate_project ───
  server.registerTool(
    "worksection_archive_project",
    {
      title: "Archive Worksection Project",
      description: `Archive (close) a Worksection project.

Args:
  - id_project (string, required): Project ID to archive

Returns: Confirmation of archival.`,
      inputSchema: {
        id_project: z.string().describe("Project ID to archive"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<unknown>("close_project", {
        id_project: params.id_project,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Project ${params.id_project} has been archived.`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "worksection_activate_project",
    {
      title: "Activate Worksection Project",
      description: `Activate (unarchive) a previously archived Worksection project.

Args:
  - id_project (string, required): Project ID to activate

Returns: Confirmation of activation.`,
      inputSchema: {
        id_project: z.string().describe("Project ID to activate"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<unknown>("activate_project", {
        id_project: params.id_project,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Project ${params.id_project} has been activated.`,
          },
        ],
      };
    }
  );

  // ─── get_project_groups ───
  server.registerTool(
    "worksection_get_project_folders",
    {
      title: "List Worksection Project Folders",
      description: `Get all project folders (groups) in the Worksection account.

Returns: List of folders with id and name.`,
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      const response = await client.get<WorksectionProjectGroup[]>(
        "get_project_groups"
      );

      const folders = response.data;
      if (!folders || folders.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No project folders found." }],
        };
      }

      const text = folders
        .map((f) => `- **${f.name}** (ID: ${f.id})`)
        .join("\n");

      return {
        content: [{ type: "text" as const, text: `# Project Folders\n\n${text}` }],
      };
    }
  );
}
