# Contributing

## Setup

Node.js >= 24.0.0 and pnpm required.

```bash
pnpm install
pnpm build
pnpm test
```

## Commands

- `pnpm build` - Build
- `pnpm test` - Run tests
- `pnpm lint` - Lint
- `pnpm typecheck` - Type check

## Workflow

1. Open an issue
2. Fork and create a branch
3. Make changes with tests
4. Run `pnpm typecheck && pnpm lint && pnpm test`
5. Open a pull request
