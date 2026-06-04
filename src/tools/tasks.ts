import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorksectionClient } from "../services/client.js";
import type { WorksectionTask } from "../types.js";
import {
  formatTaskMarkdown,
  truncateIfNeeded,
} from "../services/formatters.js";

export function registerTaskTools(
  server: McpServer,
  client: WorksectionClient,
  defaultUserEmail?: string
): void {
  // ─── get_all_tasks ───
  server.registerTool(
    "worksection_get_all_tasks",
    {
      title: "List All Worksection Tasks",
      description: `Get all tasks across all projects in the Worksection account.

Args:
  - filter (string, optional): Set to "active" to get only incomplete tasks
  - extra (string, optional): Comma-separated extras: "text", "html", "files", "comments", "relations", "subtasks", "archive"

Returns: List of tasks with id, name, status, priority, author, assignee, project, dates, estimates, tags.

Note: This may return a large dataset. Use filter="active" or get tasks per project for better performance.`,
      inputSchema: {
        filter: z
          .enum(["active"])
          .optional()
          .describe('Set to "active" to get only incomplete tasks'),
        extra: z
          .string()
          .optional()
          .describe('Comma-separated: "text", "html", "files", "comments", "relations", "subtasks", "archive"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionTask[]>("get_all_tasks", {
        filter: params.filter,
        extra: params.extra ?? "text,subtasks",
      });

      const tasks = response.data;
      if (!tasks || tasks.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No tasks found." }],
        };
      }

      const text = truncateIfNeeded(
        `# All Tasks (${tasks.length})\n\n` +
          tasks.map(formatTaskMarkdown).join("\n\n---\n\n")
      );

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ─── get_tasks (by project) ───
  server.registerTool(
    "worksection_get_tasks",
    {
      title: "List Project Tasks",
      description: `Get all tasks for a specific Worksection project.

Args:
  - id_project (string, required): Project ID
  - filter (string, optional): Set to "active" for incomplete tasks only
  - extra (string, optional): Comma-separated: "text", "html", "files", "comments", "relations", "subtasks", "subscribers"

Returns: List of tasks in the project with full details.`,
      inputSchema: {
        id_project: z.string().describe("Project ID"),
        filter: z.enum(["active"]).optional().describe('Set to "active" for incomplete tasks only'),
        extra: z.string().optional().describe('Comma-separated extras: "text", "files", "comments", "relations", "subtasks", "subscribers"'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionTask[]>("get_tasks", {
        id_project: params.id_project,
        filter: params.filter,
        extra: params.extra ?? "text,subtasks",
      });

      const tasks = response.data;
      if (!tasks || tasks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No tasks found in project ${params.id_project}.`,
            },
          ],
        };
      }

      const text = truncateIfNeeded(
        `# Project Tasks (${tasks.length})\n\n` +
          tasks.map(formatTaskMarkdown).join("\n\n---\n\n")
      );

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ─── get_task ───
  server.registerTool(
    "worksection_get_task",
    {
      title: "Get Worksection Task Details",
      description: `Get detailed information about a specific task.

Args:
  - id_task (string, required): Task ID
  - extra (string, optional): Comma-separated: "text", "html", "files", "comments", "relations", "subtasks"

Returns: Full task details including description, subtasks, files, relations.`,
      inputSchema: {
        id_task: z.string().describe("Task ID"),
        extra: z.string().optional().describe('Comma-separated extras'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionTask>("get_task", {
        id_task: params.id_task,
        extra: params.extra ?? "text,files,comments,subtasks,relations",
      });

      return {
        content: [
          { type: "text" as const, text: formatTaskMarkdown(response.data) },
        ],
      };
    }
  );

  // ─── post_task ───
  server.registerTool(
    "worksection_create_task",
    {
      title: "Create Worksection Task",
      description: `Create a new task in a Worksection project.

Args:
  - id_project (string, required): Project ID where the task will be created
  - title (string, required): Task name
  - id_parent (string, optional): Parent task ID to create as a subtask
  - email_user_to (string, optional): Assignee email
  - email_user_from (string, optional): Creator email (defaults to WORKSECTION_DEFAULT_USER_EMAIL env var if set, otherwise the API key owner)
  - text (string, optional): Task description
  - priority (string, optional): Priority 0-10 (0=lowest, 10=highest)
  - date_start (string, optional): Start date YYYY-MM-DD
  - date_end (string, optional): Due date YYYY-MM-DD
  - todo (string, optional): Checklist items, one per line
  - max_time (string, optional): Time estimate in hours
  - max_money (string, optional): Budget estimate

Returns: Created task data with ID.`,
      inputSchema: {
        id_project: z.string().describe("Project ID"),
        title: z.string().min(1).describe("Task name"),
        id_parent: z.string().optional().describe("Parent task ID (for subtasks)"),
        email_user_to: z.string().email().optional().describe("Assignee email"),
        email_user_from: z.string().email().optional().describe("Creator email"),
        text: z.string().optional().describe("Task description"),
        priority: z.string().optional().describe("Priority 0-10"),
        date_start: z.string().optional().describe("Start date YYYY-MM-DD"),
        date_end: z.string().optional().describe("Due date YYYY-MM-DD"),
        todo: z.string().optional().describe("Checklist items, one per line"),
        max_time: z.string().optional().describe("Time estimate (hours)"),
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
      const { id_project, id_parent, ...bodyParams } = params;
      const response = await client.post<WorksectionTask>(
        "post_task",
        {
          id_project,
          ...(id_parent ? { id_parent } : {}),
        },
        {
          ...bodyParams,
          email_user_from: params.email_user_from ?? defaultUserEmail,
        } as Record<string, string | undefined>
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Task created successfully!\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    }
  );

  // ─── update_task ───
  server.registerTool(
    "worksection_update_task",
    {
      title: "Update Worksection Task",
      description: `Update an existing task. Only provided fields will be changed.

Args:
  - id_task (string, required): Task ID to update
  - title (string, optional): New task name
  - email_user_to (string, optional): New assignee email
  - text (string, optional): New description
  - priority (string, optional): New priority 0-10
  - date_start (string, optional): New start date YYYY-MM-DD
  - date_end (string, optional): New due date YYYY-MM-DD
  - max_time (string, optional): New time estimate
  - max_money (string, optional): New budget

Returns: Updated task data.`,
      inputSchema: {
        id_task: z.string().describe("Task ID to update"),
        title: z.string().optional().describe("New task name"),
        email_user_to: z.string().email().optional().describe("New assignee email"),
        text: z.string().optional().describe("New description"),
        priority: z.string().optional().describe("New priority 0-10"),
        date_start: z.string().optional().describe("New start date YYYY-MM-DD"),
        date_end: z.string().optional().describe("New due date YYYY-MM-DD"),
        max_time: z.string().optional().describe("New time estimate"),
        max_money: z.string().optional().describe("New budget"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const { id_task, ...updateFields } = params;
      const response = await client.post<WorksectionTask>(
        "update_task",
        { id_task },
        updateFields as Record<string, string | undefined>
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Task updated successfully!\n\n${JSON.stringify(response.data, null, 2)}`,
          },
        ],
      };
    }
  );

  // ─── complete_task ───
  server.registerTool(
    "worksection_complete_task",
    {
      title: "Complete Worksection Task",
      description: `Mark a task as completed (done).

Args:
  - id_task (string, required): Task ID to complete

Returns: Confirmation.`,
      inputSchema: {
        id_task: z.string().describe("Task ID to complete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      await client.get<unknown>("complete_task", {
        id_task: params.id_task,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Task ${params.id_task} marked as completed. ✅`,
          },
        ],
      };
    }
  );

  // ─── reopen_task ───
  server.registerTool(
    "worksection_reopen_task",
    {
      title: "Reopen Worksection Task",
      description: `Reopen a previously completed task.

Args:
  - id_task (string, required): Task ID to reopen

Returns: Confirmation.`,
      inputSchema: {
        id_task: z.string().describe("Task ID to reopen"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      await client.get<unknown>("reopen_task", {
        id_task: params.id_task,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Task ${params.id_task} has been reopened. 🟢`,
          },
        ],
      };
    }
  );

  // ─── search_tasks ───
  server.registerTool(
    "worksection_search_tasks",
    {
      title: "Search Worksection Tasks",
      description: `Search for tasks across the account using various criteria.

Args:
  - filter (string, optional): "active" for incomplete only
  - id_project (string, optional): Limit to specific project
  - text (string, optional): Search in task title and description
  - email_user_to (string, optional): Filter by assignee email
  - date_start (string, optional): Tasks starting from YYYY-MM-DD
  - date_end (string, optional): Tasks due before YYYY-MM-DD
  - extra (string, optional): Additional data to include

Returns: List of matching tasks.`,
      inputSchema: {
        filter: z.enum(["active"]).optional().describe('Set to "active" for incomplete tasks'),
        id_project: z.string().optional().describe("Filter by project ID"),
        text: z.string().optional().describe("Search text in title and description"),
        email_user_to: z.string().optional().describe("Filter by assignee email"),
        date_start: z.string().optional().describe("Tasks from date YYYY-MM-DD"),
        date_end: z.string().optional().describe("Tasks until date YYYY-MM-DD"),
        extra: z.string().optional().describe("Additional data to include"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const response = await client.get<WorksectionTask[]>("search_tasks", {
        filter: params.filter,
        id_project: params.id_project,
        text: params.text,
        email_user_to: params.email_user_to,
        date_start: params.date_start,
        date_end: params.date_end,
        extra: params.extra ?? "text,subtasks",
      });

      const tasks = response.data;
      if (!tasks || tasks.length === 0) {
        return {
          content: [
            { type: "text" as const, text: "No tasks found matching your search criteria." },
          ],
        };
      }

      const text = truncateIfNeeded(
        `# Search Results (${tasks.length} tasks)\n\n` +
          tasks.map(formatTaskMarkdown).join("\n\n---\n\n")
      );

      return { content: [{ type: "text" as const, text }] };
    }
  );
}
