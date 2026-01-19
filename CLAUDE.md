# Paca - Project Context

## Overview
Paca is a TUI-based task manager built with @opentui/react and Prisma 7. The app is offline-first with plans for future GitHub integration and cloud sync.

## Tech Stack
- **Runtime**: Bun (use bun everywhere, not node/npm)
- **TUI Framework**: @opentui/react
- **Database**: SQLite via @prisma/adapter-libsql
- **ORM**: Prisma 7

## Project Structure
```
src/
  index.tsx      - Entry point, CLI setup
  App.tsx        - Main app component, state management
  db.ts          - Database client and operations
  types.ts       - TypeScript types
  components/    - TUI components
    Header.tsx
    StatusBar.tsx
    ProjectList.tsx
    TaskList.tsx
    Dashboard.tsx
    HelpView.tsx
    InputModal.tsx
prisma/
  schema.prisma  - Database schema
generated/
  prisma/        - Generated Prisma client
```

## Key Commands
- `bun run start` - Run the app
- `bun run dev` - Run with watch mode
- `bun run db:migrate` - Run database migrations
- `bunx prisma generate` - Regenerate Prisma client

## Database
- Location: `~/.paca/paca.db`
- Models: Project, Task, Tag, TaskTag, Setting

## Future Features
- GitHub integration (issues, projects, discussions)
- Cloud sync and collaboration
- Tags and filtering
- Due date reminders

## Bun Guidelines
- Use `bun` instead of `node`, `npm`, `yarn`, `pnpm`
- Use `bunx` instead of `npx`
- Bun auto-loads .env files
