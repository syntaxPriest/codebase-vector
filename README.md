# Codebase Vector

Visualize and explore codebases through an interactive dependency graph.

## Stack

- **Frontend** — Next.js 15, React 19, Tailwind CSS 4, xyflow (node graph)
- **Backend** — Mastra agent framework, OpenAI (codebase analysis)
- **Container** — Docker Compose (dev mode with live reload)

## Dev

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend (Mastra Studio): http://localhost:4112

File changes in `frontend/` or `backend/mastra/` auto-reload.
