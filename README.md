# Whiteboard Practice

Technical whiteboarding practice app with AI evaluation.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start app (frontend)
pnpm dev

# Start server (in another terminal)
pnpm dev:server
```

## Structure

```
├── apps/
│   ├── app/       # React + Vite + Tailwind 4
│   └── server/    # Bun API server
├── llm/           # LLM config, instructions, templates
└── data/          # Sessions, examples (gitignored)
```

## Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind 4
- **Server**: Bun, opencode CLI integration
- **Styling**: OpenCode-inspired grayscale theme

## Configuration

Edit `llm/config/defaults.json` to customize default session settings.