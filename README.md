# Numbies

A better payments app.

[Numbies.xyz](https://numbies.xyz) · [TestFlight](https://testflight.apple.com/join/A7Mw4Eg6)

![Numbies](https://numbies.xyz/og-image.png)

Built with [One](https://onestack.dev/), [Tamagui](https://tamagui.dev/), [Privy](https://www.privy.io/), [Convex](https://www.convex.dev/), [Tempo](https://tempo.xyz/), and [Superset](https://www.superset.sh/).

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Setup

We use Bun as the package manager.

1. Install dependencies:
```bash
bun install
```

2. Copy the environment template and fill in your values:
```bash
cp .env.example .env
```

3. Initialize Convex (first time only):
```bash
bunx convex dev
```

## Developing

Start the Convex development server in one terminal:
```bash
bunx convex dev
```

Then start the app in another terminal:
```bash
bun dev           # Web development
bun ios           # iOS development
bun android       # Android development
```

## Linting

```bash
bunx biome check .           # Check for issues
bunx biome check . --write   # Auto-fix issues
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
