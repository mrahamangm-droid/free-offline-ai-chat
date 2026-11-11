# Contributing

Thanks for considering a contribution to Offline AI Chat.

## Development setup

```bash
npm install
ollama serve &          # if not already running
npm run dev
```

Pull a small model (e.g. `ollama pull llama3.2:1b`) before testing chat.

## Before opening a PR

```bash
npx tsc --noEmit    # type-check
npm run lint         # eslint
npm run build        # production build (also type-checks)
```

All three should pass cleanly. If `eslint` flags
`react-hooks/set-state-in-effect` on a straightforward "fetch data on mount"
effect, that's a known over-eager case in this still-experimental lint rule —
see the inline comments already in the codebase for the accepted pattern
(`// eslint-disable-next-line react-hooks/set-state-in-effect` with a one-line
reason), rather than restructuring working code to dodge it.

## Code style

- No comments explaining *what* code does — names should do that. Comments
  are for non-obvious *why* (a workaround, a constraint, a gotcha).
- Don't add abstractions, config options, or error handling for cases that
  can't happen. Keep changes scoped to what they're actually fixing/adding.
- Match the existing patterns: Route Handlers for backend logic, the
  `useApp()` context for cross-component client state, Tailwind utility
  classes (no CSS modules / styled-components).

## Adding a model to the Model Library

Edit `RECOMMENDED_MODELS` in `src/lib/ollama.ts`. Before adding a model:

1. Check its actual license on its model card / source repo — don't assume
   MIT or Apache. Add it to the license table in `README.md`.
2. Note realistic RAM requirements; the Model Library page displays these
   next to the user's actual free RAM, so don't lowball them.

## Reporting bugs / proposing features

Open a GitHub issue. For bugs, include your OS, Node version, Ollama
version, and the model you were using.

## Security issues

Do not open a public issue — see [SECURITY.md](SECURITY.md).
