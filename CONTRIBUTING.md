# Contributing

This project welcomes contributions! Please follow these guidelines to ensure smooth collaboration.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/electron-ipc.git`
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make changes and run tests: `pnpm run test`
6. Commit with conventional format: `git commit -m "feat: add your feature"`
7. Push and create a pull request

## Code Style

- **Language:** All code and comments in English
- **TypeScript:** Strict mode, explicit types, no `any`
- **Linting:** Run `pnpm run lint` before committing
- **Formatting:** Prettier with no semicolons
- **Commits:** Follow [Conventional Commits](https://conventionalcommits.org/)
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation
  - `test:` testing
  - `chore:` maintenance

## Testing

- Write Vitest tests for new functions
- Include edge cases and error scenarios
- Run `pnpm run test` to ensure all tests pass

## Pull Requests

- Provide a clear description of changes
- Reference related issues
- Ensure CI passes
- Squash commits if needed

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
