# Phishing Hook frontend

This directory contains the React, TypeScript, and Vite frontend for Phishing Hook.

See the [repository README](../README.md) for the product overview, architecture, Cloudflare configuration, inbound email workflow, privacy model, API documentation, validation, and deployment instructions.

## Commands

```bash
npm ci
npm run dev
npm run build
npm run lint
```

The production build is written to `dist/` and served by the Cloudflare Worker through the `ASSETS` binding in the repository's `wrangler.jsonc`.
