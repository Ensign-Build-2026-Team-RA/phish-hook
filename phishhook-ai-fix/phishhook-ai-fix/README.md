# PhishHook AI integration fix

This package includes a replacement backend and a frontend patch script.

## Files
- `src/index.js` — replacement Cloudflare Worker backend, using Workers AI.
- `patch_app.py` — patches `phish-hook/src/App.tsx` in your repository, preserving the existing UI.

## Apply on a fresh branch

1. Check out the latest `main`, then create `fix-ai-analysis`.
2. Copy `src/index.js` to the repository's root-level `src/index.js`.
3. Place `patch_app.py` in the repository root and run `python patch_app.py`.
4. Run `npm ci && npm run build` at the repository root (follow your existing workflow), and `npm ci && npm run build` in `phish-hook/` if needed.
5. Commit, open a PR, review checks, and merge only after testing.

## Cloudflare
Your `wrangler.jsonc` already declares `ai.binding = "AI"`. Ensure the deployed Worker has the `AI` binding. No OpenAI API key is required for this implementation.

The backend uses `@cf/meta/llama-3.1-8b-instruct`, a standard Workers AI text generation model. Model availability and quota must be checked in your Cloudflare account. If the call still fails, inspect Worker logs; the backend does not fabricate an AI result.

Test POST `/api/analyze` with `Content-Type: application/json` and body:

```json
{"text":"URGENT: Your account is locked. Verify your password at https://example.invalid/login"}
```

Expected success structure: `{ "success": true, "analysis": {"score": ..., "level": ..., "summary": ..., "flags": [...], "advice": ...}, "source": "workers-ai" }`.

**Privacy:** User text is sent to Cloudflare Workers AI. Avoid submitting secrets or sensitive personal information. Existing frontend localStorage history/draft behavior is unchanged by this patch.
