# 🤖 Cursor AI Operational Guide

Welcome! This repository is engineered to work with **Cursor's Agentic Workflow**. It uses a disciplined, research-first framework that transforms the AI from a simple autocomplete tool into an **Autonomous Principal Engineer**.
> For general AI agent instructions (build, test, conventions), see AGENT.md.

---

## 🧠 Core Doctrine

The AI in this project is governed by the rules in `.cursor/rules/`. Its "Operating Doctrine" (`agent-core.mdc`) mandates:

- **Research First:** It will never change code without first mapping the system and dependencies.
- **Source of Truth:** It prioritizes actual code and live configurations over potentially outdated documentation.
- **Safety & Precision:** It uses non-destructive research and performs self-audits (linting/testing) before reporting completion.

---

## 🛠️ One-Time Setup

Since Cursor's custom **Slash Commands** are currently stored in your local application settings (not synced via Git), you need to add them manually once:

1. Open **Cursor Settings** (`Ctrl/Cmd + ,`).
2. Go to **General** > **Rules for AI**.
3. In the **Commands** section, click **+ New** for each of these:

| Command    | Label             | Content Source                       | Purpose                                                       |
| ---------- | ----------------- | ------------------------------------ | ------------------------------------------------------------- |
| `/request` | **Mission Start** | `.cursor/commands/request.md`       | Start a new feature or fix with full context.                 |
| `/refresh` | **Root Cause**    | `.cursor/commands/refresh.md`       | Use when the agent is stuck or a bug is persistent.           |
| `/retro`   | **Self-Improve**  | `.cursor/commands/retro.md`          | Reflect on the session and update project rules.              |
| `/docs`    | **Sync Docs**     | `.cursor/commands/docs.md`          | Audit and synchronize documentation with code.               |
| `/review`  | **Code Review**   | `.cursor/commands/review.md`        | Perform code review before committing.                        |
| `/test`    | **Run Tests**     | `.cursor/commands/test.md`          | Execute and verify test coverage.                             |
| `/commit`  | **Commit**        | `.cursor/commands/commit.md`       | Create structured commit messages.                            |
| `/secure`  | **Security Audit**| `.cursor/commands/secure.md`        | Security audit and threat modeling (OWASP Top 10).            |
| `/spark`   | **Brainstorm**    | `.cursor/commands/spark.md`         | Socratic brainstorming and architectural exploration (no code).|
| `/upgrade` | **Modernize**     | `.cursor/commands/upgrade.md`       | Audit for legacy patterns and propose modernization.           |
| `/concise` | **Conciseness**   | `.cursor/commands/concise.md`        | Enforce radical conciseness in AI responses.                  |
| `/no-absolute-right` | **Tone**  | `.cursor/commands/no-absolute-right.md` | Avoid sycophantic language; brief acknowledgments only.   |
| `/explain` | **Walkthrough**   | `.cursor/prompts/explain.md`        | Get a detailed, line-by-line mentorship-style explanation of any code. |

---

## 🚀 Daily Workflow

### 1. Initiating a Task

Open the **Composer (`Ctrl/Cmd + I`)** or **Chat (`Ctrl/Cmd + L`)** and use the `/request` command:

> `/request {Describe your feature or bug fix here}`

### 2. Automatic Rule Enforcement

You don't need to remind the AI of our tech stack. Rules in `.cursor/rules/` are **automatically applied** by file type (globs). Summary:

- **agent-core.mdc** – Research-first protocol, source of truth (code over docs), autonomous execution.
- **000-convention-precedence.mdc** – When rules conflict: docs → local code patterns → .mdc rules → general knowledge.
- **react-typescript.mdc** – Arrow function components, strict typing, PascalCase components, camelCase hooks.
- **typescript-logic.mdc** – Guard clauses, immutability, optional chaining, async/await, type guards.
- **documentation-standards.mdc** – TSDoc/JSDoc for exports; update README for new env vars or npm scripts.
- **formatting-quality.mdc** – Run lint/format before completion; fix introduced lint errors.
- **testing-standards.mdc** – Vitest/Jest and React Testing Library; ask if tests are required for new work.
- **security-standards.mdc** – Input validation (Zod/Valibot), no hardcoded secrets, supply-chain checks, RSC permission checks.
- **architecture-evolution.mdc** – Tech radar (e.g. TanStack Query, Zustand); suggest modern patterns for legacy code.
- **liquid-frontend.mdc** – Liquid syntax and best practices (when editing .liquid files).

### 3. The "Stuck" Protocol

If the agent is looping or failing to fix a bug, don't argue with it. Type `/refresh`. This forces the AI to abandon its current assumptions and perform a deep root-cause analysis of the environment.

### 4. Closing the Loop

When a feature is finished, run `/retro`. The agent will analyze its performance and, if it found a project-specific "gotcha," it will suggest an update to your `.cursor/rules/` files to prevent that mistake from happening again.

---

## 📂 Repository Structure

- **`.cursor/rules/`** – Automatic behavioral instructions (the "Brain"). Applied by glob (e.g. `**/*.{ts,tsx}`). Includes agent-core, convention precedence, React/TS, security, testing, documentation, formatting, architecture evolution, and Liquid.
- **`.cursor/commands/`** – Templates for manual slash commands (the "Briefings"). Add each via Cursor Settings > General > Rules for AI > Commands; point "Content Source" to the corresponding `.md` file.

---

> **Note:** This setup is optimized for **Cursor v2.4+**. Ensure your "Agent" mode is toggled on in the Composer for maximum autonomy.
