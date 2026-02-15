# Contributing to Numbies

Thanks for your interest in contributing to Numbies! This document outlines the process for contributing to this project.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Node.js](https://nodejs.org/) 18+
- For iOS development: Xcode and iOS Simulator
- For Android development: Android Studio and an emulator

### Getting Started

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```
4. Start the Convex development server:
   ```bash
   bunx convex dev
   ```
5. In another terminal, start the app:
   ```bash
   bun dev        # Web
   bun ios        # iOS
   bun android    # Android
   ```

## Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting. The configuration enforces:

- 2-space indentation
- Single quotes
- No semicolons

### Commands

```bash
bunx biome check .           # Check for issues
bunx biome check . --write   # Auto-fix issues
```

Please run the linter before submitting a pull request.

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure:
   - Code passes linting (`bunx biome check .`)
   - Types check (`bun typecheck`)
   - The app runs without errors

3. Write clear, concise commit messages that explain the "why" behind changes

4. Push your branch and open a pull request against `main`

5. Fill out the PR template with:
   - A summary of changes
   - Any breaking changes
   - Screenshots for UI changes

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Platform (web/iOS/Android) and device info
- Screenshots or error logs if applicable

## Project Structure

```
numbies-xyz/
├── app/              # Routes and layouts (One framework)
├── convex/           # Backend (schema, queries, mutations)
├── src/
│   ├── auth/         # Authentication (Privy)
│   ├── blockchain/   # Blockchain interactions (viem)
│   ├── hooks/        # Custom React hooks
│   ├── ui/           # UI components
│   └── utils/        # Utility functions
├── config/           # Tamagui theme configuration
└── public/           # Static assets
```

## AI-Assisted Development

This project includes Claude Code skills and commands in the `.claude/` directory to help with common development tasks:

### Commands (Slash Commands)

- `/check` - Run type and lint checks
- `/push` - Stage, commit, and push changes
- `/create-prd` - Create a Product Requirements Document
- `/runitup` - Implement the most recent PRD

### Skills

- `vercel-react-native-skills` - React Native and Expo best practices for building performant mobile apps

These resources are automatically available when using Claude Code in this repository.

## Questions?

Feel free to open an issue for any questions about contributing.
