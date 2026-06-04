# Worksection MCP Server

[![npm version](https://img.shields.io/npm/v/worksection-mcp-server.svg)](https://www.npmjs.com/package/worksection-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

MCP (Model Context Protocol) server for [Worksection](https://worksection.com) — a project management platform popular in Ukraine and Eastern Europe.

Lets AI assistants like Claude interact with your Worksection account through natural language: manage projects, tasks, comments, members, and tags.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Security](#security)
- [Development](#development)
- [Project Structure](#project-structure)
- [License](#license)

---

## Quick Start

```bash
# 1. Install
git clone https://github.com/VladChs/worksection-mcp-server.git
cd worksection-mcp-server
npm install && npm run build

# 2. Configure credentials (loaded automatically at startup)
cp .env.example .env.local
# edit .env.local and fill in your values

# 3. Run
node dist/index.js
```

Get your API key in Worksection: **Administration → API → Apps → Create** (new interface) or **Account → API → Show API key** (legacy interface). Only the account owner has access.

---

## Installation

### Prerequisites

- Node.js 18 or higher
- A Worksection account with admin access

### From source

```bash
git clone https://github.com/VladChs/worksection-mcp-server.git
cd worksection-mcp-server
npm install
npm run build
```

### Environment variables

The server automatically loads `.env.local` (preferred, gitignored) or `.env` from the project root at startup — copy `.env.example` to get started. Variables passed by the MCP client or shell take precedence over the file.

| Variable | Required | Description |
|---|---|---|
| `WORKSECTION_URL` | yes | Your Worksection URL (e.g. `https://yourcompany.worksection.com`) |
| `WORKSECTION_API_KEY` | yes | Admin API key from Worksection settings |
| `WORKSECTION_DEFAULT_USER_EMAIL` | no | Default author email for created tasks, projects, and comments. Without it, actions are attributed to the API key owner. An explicit `email_user_from` argument always wins. |

---

## Configuration

With credentials in `.env.local`, client configs only need the command — no secrets in JSON files.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "worksection": {
      "command": "node",
      "args": ["/path/to/worksection-mcp-server/dist/index.js"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add worksection -s user -- node /path/to/worksection-mcp-server/dist/index.js
```

(`-s user` makes the server available in all your projects; omit it for project-only scope.)

### Direct execution

```bash
node dist/index.js
```

### Without an env file

If you prefer not to use `.env.local`, you can still pass the variables through the client config's `"env"` block or your shell environment — they take precedence over the file:

```json
"env": {
  "WORKSECTION_URL": "https://yourcompany.worksection.com",
  "WORKSECTION_API_KEY": "your_api_key_here",
  "WORKSECTION_DEFAULT_USER_EMAIL": "you@yourcompany.com"
}
```

---

## Available Tools

The server exposes **21 tools** across 5 categories.

<details>
<summary><b>📁 Projects</b> (7 tools)</summary>

| Tool | Description |
|---|---|
| `worksection_get_projects` | List all projects with optional status filter |
| `worksection_get_project` | Get detailed project info |
| `worksection_create_project` | Create a new project |
| `worksection_update_project` | Update project details |
| `worksection_archive_project` | Archive a project |
| `worksection_activate_project` | Activate an archived project |
| `worksection_get_project_folders` | List project folders |

</details>

<details>
<summary><b>✅ Tasks</b> (8 tools)</summary>

| Tool | Description |
|---|---|
| `worksection_get_all_tasks` | List all tasks across projects |
| `worksection_get_tasks` | List tasks in a specific project |
| `worksection_get_task` | Get detailed task info |
| `worksection_create_task` | Create a task (or subtask) |
| `worksection_update_task` | Update task details |
| `worksection_complete_task` | Mark task as done |
| `worksection_reopen_task` | Reopen a completed task |
| `worksection_search_tasks` | Search tasks by text, assignee, dates, etc. |

</details>

<details>
<summary><b>💬 Comments</b> (2 tools)</summary>

| Tool | Description |
|---|---|
| `worksection_get_comments` | Get all comments on a task |
| `worksection_post_comment` | Post a comment to a task |

</details>

<details>
<summary><b>👥 Members</b> (2 tools)</summary>

| Tool | Description |
|---|---|
| `worksection_get_members` | List all account members |
| `worksection_add_project_members` | Add members to a project |

</details>

<details>
<summary><b>🏷️ Tags</b> (2 tools)</summary>

| Tool | Description |
|---|---|
| `worksection_get_tags` | List available tags/labels |
| `worksection_set_task_tags` | Add tags to a task (and optionally remove others) |

</details>

---

## Authentication

This server uses the **Admin Token** authentication method:

- Generates an MD5 hash from query parameters + API key
- Provides full access to all account data (or the scopes selected when creating the App)
- Only the account owner can generate the API key
- API keys created via the new **Administration → API → Apps** interface work with this method too

For per-user access, see the [Worksection OAuth 2.0 docs](https://worksection.com/en/faq/oauth.html).

### Action authorship

Actions performed through the admin API are attributed to the API key owner by default. To attribute created tasks, projects, and comments to a specific user, set `WORKSECTION_DEFAULT_USER_EMAIL` or pass `email_user_from` per call.

---

## Rate Limits

Worksection enforces a **1 request per second** rate limit. This server handles it automatically — requests are queued with a minimum 1.1s interval, so you don't have to worry about hitting the limit.

---

## Security

- 🔐 API key is read from environment variables only — never hardcoded
- ✅ All inputs validated with Zod schemas
- 🖥️ Runs locally via stdio transport — no network exposure
- 🛡️ Worksection API itself doesn't allow deletion of projects, tasks, comments, or members (safety by design)

---

## Development

```bash
npm run dev    # Watch mode (auto-recompile)
npm run build  # One-time build
npm start      # Run the server
```

---

## Project Structure

```
worksection-mcp-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Shared constants
│   ├── services/
│   │   ├── client.ts         # Worksection API client (auth + rate limit)
│   │   └── formatters.ts     # Markdown formatting helpers
│   └── tools/
│       ├── projects.ts       # Project management tools
│       ├── tasks.ts          # Task management tools
│       ├── comments.ts       # Comment tools
│       ├── members.ts        # Member/team tools
│       └── tags.ts           # Tag/label tools
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ for the Worksection community
</p>
