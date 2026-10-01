# ApplyFlow Agent Instructions

ApplyFlow is intended to become a polished, genuinely usable product rather than a prototype or demo.

## Autonomy

You may, without asking for routine approval:

- inspect and modify files in this repository
- install appropriate development dependencies
- create and modify the local database and migrations
- run development servers
- run tests, linters, type checks, and builds
- fix failures caused by your changes
- inspect the application in the browser
- inspect browser console and network errors
- refactor code when it materially improves the implementation
- create Git commits as logical checkpoints
- make reasonable implementation and UI/UX decisions

When the requested outcome is clear, prefer making a reasonable engineering decision and continuing over asking about minor implementation details.

## Boundaries

Do not:

- introduce paid APIs or paid infrastructure without asking
- commit API keys, credentials, tokens, or other secrets
- perform destructive actions outside this repository
- silently discard user data
- replace working technology solely for novelty

Prefer free, local, or open-source dependencies when they satisfy the requirement.

## Quality

Treat features as incomplete until the relevant implementation works end-to-end.

For substantial work:

1. implement the feature
2. run relevant validation
3. inspect the actual application when visual behavior is involved
4. fix discovered problems
5. leave the repository in a working state

Do not stop at mockups, placeholder implementations, or scaffolding when the requested feature can reasonably be completed.

The user's explicit instructions take precedence over general guidance in this file.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
