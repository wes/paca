# Contributing to Paca

Thank you for your interest in contributing to Paca! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/paca.git
   cd paca
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Run the app:
   ```bash
   bun run dev
   ```

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher

### Project Structure

```
paca/
├── src/
│   ├── index.tsx       # Entry point
│   ├── App.tsx         # Main app component
│   ├── db.ts           # Database operations
│   ├── stripe.ts       # Stripe integration
│   ├── types.ts        # TypeScript types
│   └── components/     # UI components
├── prisma/
│   └── schema.prisma   # Database schema
└── generated/
    └── prisma/         # Generated Prisma client
```

### Commands

| Command | Description |
|---------|-------------|
| `bun run start` | Run the app |
| `bun run dev` | Run with watch mode |
| `bun run db:migrate` | Run database migrations |
| `bunx prisma studio` | Open Prisma Studio |

### Database Changes

If you modify `prisma/schema.prisma`:

1. Create a migration:
   ```bash
   bun run db:migrate
   ```
2. The Prisma client will be regenerated automatically

## Making Changes

### Code Style

- Use TypeScript
- Follow existing code patterns
- Keep components focused and small
- Use meaningful variable names

### Commits

- Write clear, concise commit messages
- Use present tense ("Add feature" not "Added feature")
- Reference issues when applicable

### Pull Requests

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Test thoroughly
4. Push to your fork
5. Open a Pull Request

### PR Guidelines

- Describe what your PR does
- Include screenshots for UI changes
- Link related issues
- Keep PRs focused on a single change

## Reporting Issues

When reporting bugs:

- Describe the expected behavior
- Describe the actual behavior
- Include steps to reproduce
- Include your environment (OS, Bun version)

## Feature Requests

We welcome feature suggestions! Please:

- Check existing issues first
- Describe the use case
- Explain why it would be useful

## Questions?

Feel free to open an issue for questions or discussion.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
