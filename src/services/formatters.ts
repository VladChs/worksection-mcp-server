import type {
  WorksectionTask,
  WorksectionProject,
  WorksectionComment,
  WorksectionUser,
} from "../types.js";
import { CHARACTER_LIMIT } from "../constants.js";

export function formatUser(user: WorksectionUser): string {
  return `${user.name} (${user.email})`;
}

export function formatTaskMarkdown(task: WorksectionTask): string {
  const parts: string[] = [
    `**${task.name}** (ID: ${task.id})`,
    `Status: ${task.status === "active" ? "🟢 Active" : "✅ Done"}`,
    `Priority: ${task.priority}`,
    `Author: ${formatUser(task.user_from)}`,
  ];

  if (task.user_to?.id) {
    parts.push(`Assignee: ${formatUser(task.user_to)}`);
  }

  if (task.project) {
    parts.push(`Project: ${task.project.name} (ID: ${task.project.id})`);
  }

  if (task.date_start) parts.push(`Start: ${task.date_start}`);
  if (task.date_end) parts.push(`Due: ${task.date_end}`);
  if (task.date_closed) parts.push(`Closed: ${task.date_closed}`);
  if (task.max_time) parts.push(`Time estimate: ${task.max_time}h`);
  if (task.max_money) parts.push(`Budget: ${task.max_money}`);

  if (task.tags && Object.keys(task.tags).length > 0) {
    parts.push(`Tags: ${Object.values(task.tags).join(", ")}`);
  }

  if (task.text) {
    parts.push(`\nDescription:\n${task.text}`);
  }

  if (task.child && task.child.length > 0) {
    parts.push(`\nSubtasks (${task.child.length}):`);
    for (const sub of task.child) {
      const statusIcon = sub.status === "active" ? "🟢" : "✅";
      parts.push(`  ${statusIcon} ${sub.name} (ID: ${sub.id})`);
    }
  }

  return parts.join("\n");
}

export function formatProjectMarkdown(project: WorksectionProject): string {
  const parts: string[] = [
    `**${project.name}** (ID: ${project.id})`,
    `Status: ${project.status}`,
    `Author: ${formatUser(project.user_from)}`,
  ];

  if (project.user_to?.id) {
    parts.push(`Manager: ${formatUser(project.user_to)}`);
  }

  if (project.company) parts.push(`Folder: ${project.company}`);
  if (project.date_start) parts.push(`Start: ${project.date_start}`);
  if (project.date_end) parts.push(`Due: ${project.date_end}`);
  if (project.max_time) parts.push(`Time estimate: ${project.max_time}h`);
  if (project.max_money) parts.push(`Budget: ${project.max_money}`);

  if (project.tags && Object.keys(project.tags).length > 0) {
    parts.push(`Tags: ${Object.values(project.tags).join(", ")}`);
  }

  if (project.text) {
    parts.push(`\nDescription:\n${project.text}`);
  }

  if (project.users && project.users.length > 0) {
    parts.push(`\nTeam (${project.users.length}):`);
    for (const u of project.users) {
      parts.push(`  - ${formatUser(u)}`);
    }
  }

  return parts.join("\n");
}

export function formatCommentMarkdown(comment: WorksectionComment): string {
  const parts: string[] = [
    `**${formatUser(comment.user_from)}** — ${comment.date_added}`,
    comment.text,
  ];

  if (comment.files && comment.files.length > 0) {
    parts.push(`Attachments: ${comment.files.map((f) => f.name).join(", ")}`);
  }

  return parts.join("\n");
}

export function truncateIfNeeded(text: string): string {
  if (text.length > CHARACTER_LIMIT) {
    return (
      text.slice(0, CHARACTER_LIMIT) +
      "\n\n... [Response truncated. Use filters or pagination to narrow results.]"
    );
  }
  return text;
}
