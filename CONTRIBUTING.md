# Contributing to PXMON

Thank you for your interest in contributing to PXMON. This document outlines the process for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a feature branch from `main`
4. Make your changes
5. Submit a pull request

## Development Setup

### Prerequisites

- Rust 1.75+ with Solana CLI and Anchor framework
- Node.js 18+ with npm
- Python 3.10+ with pip
- PostgreSQL 15+

### Local Environment

```bash
git clone https://github.com/<your-username>/pxmon.git
cd pxmon

# On-chain program
cd programs/pxmon
anchor build
anchor test

# SDK
cd sdk
npm install
npm test

# API server
cd api
npm install
cp .env.example .env
npm run dev

# Agent scripts
cd agents
pip install -r requirements.txt
pytest
```

## Branch Naming

Use the following conventions:

- `feat/description` -- New features
- `fix/description` -- Bug fixes
- `refactor/description` -- Code refactoring
- `docs/description` -- Documentation updates
- `test/description` -- Test additions or fixes
- `chore/description` -- Build, CI, or tooling changes

## Commit Messages

Write clear, concise commit messages in the imperative mood:

```
feat: add capture probability calculation
fix: correct type effectiveness for ghost/dark
refactor: extract battle damage into shared module
docs: update API endpoint documentation
test: add gym challenge integration tests
```

## Code Style

### Rust (On-chain Program)

- Follow standard Rust formatting (`cargo fmt`)
- Run `cargo clippy` before committing
- All public functions must have doc comments
- Error types must use the custom `PxmonError` enum

### TypeScript (SDK and API)

- Use strict TypeScript with no `any` types
- Format with Prettier (config included)
- Lint with ESLint (config included)
- Export types from dedicated type files

### Python (Agent Scripts)

- Follow PEP 8
- Type hints on all function signatures
- Format with Black
- Lint with Ruff

## Testing

All pull requests must include tests for new functionality.

- **Rust**: Write unit tests in the same file and integration tests in `tests/`
- **TypeScript**: Use Jest for unit and integration tests
- **Python**: Use pytest with fixtures

Ensure all existing tests pass before submitting:

```bash
cd programs/pxmon && anchor test
cd sdk && npm test
cd api && npm test
cd agents && pytest
```

## Pull Request Process

1. Fill out the pull request template completely
2. Ensure CI passes on all checks
3. Request review from at least one maintainer
4. Address all review feedback
5. Squash commits before merge if requested

## Reporting Bugs

Use the bug report issue template. Include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Solana version, Node version)
- Transaction signatures if applicable

## Feature Requests

Use the feature request issue template. Describe:

- The problem your feature solves
- Your proposed solution
- Any alternatives you considered

## Security

If you discover a security vulnerability, do NOT open a public issue. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## License

By contributing to PXMON, you agree that your contributions will be licensed under the MIT License.