# Offline AI Chat

A free, private, offline-first AI chat app — like ChatGPT, but it runs entirely
on your own computer. No API keys, no subscriptions, no account, and no data
ever leaves your machine except when you explicitly choose to download a
model.

<p align="center"><em>Next.js · TypeScript · Tailwind CSS · Ollama · SQLite</em></p>

## What this actually is (read this first)

This is a working local-first chat application, not a mockup:

- The **frontend and backend are one Next.js app** (App Router + Route
  Handlers). There is no separate Python backend — Next.js API routes handle
  everything, as the project brief allowed.
- **AI inference is 100% local**, via [Ollama](https://ollama.com), speaking
  to `http://127.0.0.1:11434` over plain HTTP. The app never calls OpenAI,
  Anthropic, Google, or any other cloud AI API, and has no code path that
  could.
- **Storage is a local SQLite file** (`data/app.db`) using Node.js's built-in
  `node:sqlite` module — no external database server.
- **Retrieval-augmented generation (RAG) is local keyword/lexical matching**,
  not an embeddings model. This is an intentional simplification: it needs no
  extra model download and works offline immediately, but it's less accurate
  than embedding-based retrieval on large or paraphrase-heavy documents. See
  [Known limitations](#known-limitations).
- The "advanced AI features" (coding assistant, writing assistant, research
  assistant, translation, brainstorming) are implemented as **system-prompt
  personas**, not separate fine-tuned pipelines — see `src/lib/personas.ts`.
  This is the honest, inspectable way to describe what's actually running.

## Features

- Multi-conversation chat with history, search, rename, delete
- Streaming responses with stop/regenerate, and inline message editing
- Markdown rendering with syntax-highlighted, copyable code blocks
- Model Library: see installed models, download recommended ones with a
  progress bar, delete models, see RAM/CPU info, set a default model
- Knowledge Base: upload `.txt`, `.md`, `.csv`, `.json`, `.pdf` files (10 MB
  cap) and have the AI answer questions grounded in them, with source citations
- Light/dark/system theme, responsive layout down to phone width
- Export any conversation to Markdown, TXT, or JSON
- Settings: defaults, storage stats, one-click JSON backup, "clear all data"
- A service worker caches the app shell so the **UI** loads without internet
  after the first visit (chat itself always needs Ollama running locally —
  see [Offline behavior, precisely](#offline-behavior-precisely))
- No accounts, no telemetry, no analytics, nothing phoned home — ever

## Requirements

- **Node.js 22.13+** (the app uses Node's built-in `node:sqlite`, which needs
  the `--experimental-sqlite` flag — already wired into `npm run dev/build/start`
  via `cross-env`, so you don't need to set it yourself)
- **[Ollama](https://ollama.com/download)** installed and running
- ~4–8 GB free RAM for small models, more for larger ones (the Model Library
  page shows your free RAM and won't let you forget to check it)
- macOS, Linux, or Windows. Docker is optional (see below).

## Quick start (no Docker)

```bash
# 1. Install Ollama (one-time): https://ollama.com/download
#    Then make sure it's running:
ollama serve &

# 2. Install dependencies
npm install

# 3. Run the app
npm run dev
```

Open <http://localhost:3000>. On first load, go to **Model Library** in the
sidebar and download a small model (Llama 3.2 1B is the smallest, ~1.3 GB).
Once it's downloaded, disconnect from the internet if you like — chat keeps
working.

For a production build:

```bash
npm run build
npm run start
```

### Platform notes

- **macOS / Linux**: the steps above work as-is. If `ollama serve` isn't
  already running as a background service (it usually is after installing
  the Ollama app), run it in its own terminal tab.
- **Windows**: install Ollama from the link above (it installs as a
  background service and starts automatically). Then use the same `npm`
  commands in PowerShell or a Windows terminal. `cross-env` (already a
  dependency) makes the `--experimental-sqlite` flag work the same way on
  Windows as on macOS/Linux — you don't need WSL.
- **Node version managers**: if `node -v` shows below 22.13, install a newer
  Node (e.g. via [nvm](https://github.com/nvm-sh/nvm) or
  [nvm-windows](https://github.com/coreybutler/nvm-windows)) before
  `npm install`.

## Quick start (Docker Compose)

```bash
docker compose up -d
```

This starts two containers: `ollama` (the official `ollama/ollama` image,
with a named volume for models) and `app` (this Next.js app, built from the
included `Dockerfile`, with a named volume for its SQLite data). The app is
published to `127.0.0.1:3000` only, by design — see
[LAN access](#lan-access--security-notes) below before changing that.

After it's up, download a model into the Ollama container:

```bash
docker compose exec ollama ollama pull llama3.2:1b
```

Then open <http://localhost:3000> and use the Model Library page, or the CLI
above, for further models.

> **Honesty note on Docker**: the `Dockerfile` and `docker-compose.yml` were
> written carefully (multi-stage build, Next.js `output: "standalone"`,
> non-root user, named volumes, localhost-only port binding) but **Docker
> itself was not available in the sandboxed environment this project was
> built in**, so the Compose stack has not been run end-to-end here. The
> non-Docker path above *was* fully tested, including real local inference,
> streaming, persistence, RAG, and model management. Please report any Docker
> issues.

## Offline behavior, precisely

- **The app UI**: after the first successful load, a service worker
  (`public/sw.js`) caches the app shell, so reloading the page works without
  internet.
- **Chat / inference**: always requires the local Ollama server to be
  running on this machine — but that's "local," not "internet." No network
  access beyond `127.0.0.1` is ever used for chat.
- **The only time this app touches the public internet** is when you choose
  to download a new model from the Model Library page. Installed models run
  fully offline afterward.

## Model Library and licenses

Models are managed through Ollama. The Model Library page lets you download
any of the following, chosen for being small enough to run on modest
hardware. **Model weights are not covered by this repository's MIT license**
— each has its own license, summarized here as of this writing. Licenses can
change; verify on the linked source before any commercial use or
redistribution.

| Model | License | Commercial use | Redistribution | Source |
|---|---|---|---|---|
| Llama 3.2 (1B/3B) | Meta Llama 3.2 Community License (custom, not OSI) | Allowed, with a special license required above 700M monthly active users | Allowed, must carry the license + a "Built with Llama" notice | [ollama.com/library/llama3.2](https://ollama.com/library/llama3.2) |
| Qwen 2.5 (7B) | Apache 2.0 | Allowed | Allowed | [ollama.com/library/qwen2.5](https://ollama.com/library/qwen2.5) |
| DeepSeek-R1 (7B, Qwen-distilled) | Base model is MIT, but this distilled 7B checkpoint inherits the Qwen 2.5 base's Apache 2.0 terms | Allowed | Allowed | [ollama.com/library/deepseek-r1](https://ollama.com/library/deepseek-r1) |
| Gemma 2 (9B) | Google Gemma Terms of Use (custom, not OSI) | Allowed, subject to Google's Prohibited Use Policy | Allowed, must pass the same terms to recipients | [ollama.com/library/gemma2](https://ollama.com/library/gemma2) |
| Mistral (7B) | Apache 2.0 | Allowed | Allowed | [ollama.com/library/mistral](https://ollama.com/library/mistral) |
| Phi-3 (mini) | MIT | Allowed | Allowed | [ollama.com/library/phi3](https://ollama.com/library/phi3) |

This project does not claim legal expertise — this table is a starting point
for your own review, not legal advice.

## Privacy and security

- No account, no login, no cloud sync, no telemetry, no analytics — by
  default and by design; there is no code to even opt into.
- All conversations, documents, and settings live in one local SQLite file
  under `data/` (configurable via `APP_DATA_DIR`). Delete that folder (or use
  Settings → Clear all data) to wipe everything.
- Uploaded documents: capped at 10 MB, restricted to `.txt` / `.md` / `.csv` /
  `.json` / `.pdf`, parsed in-process, never written anywhere but the local
  database.
- Markdown is rendered with `react-markdown` (no `dangerouslySetInnerHTML`),
  and model output is never passed to `eval`, a shell, or any code execution
  path — the model can *write* code in a chat bubble, but nothing here ever
  *runs* it.
- See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

### LAN access & security notes

By default, both `npm run dev`/`start` and the Docker Compose file bind to
`127.0.0.1` (Docker) or listen on all interfaces but are only reachable from
this machine in practice via `localhost` (Next.js dev server). If you
deliberately want other devices on your network to reach this app:

- **Docker**: change the `app` service's port mapping in `docker-compose.yml`
  from `127.0.0.1:3000:3000` to `3000:3000` (or `0.0.0.0:3000:3000`).
- **Non-Docker**: run `npm run start -- -H 0.0.0.0`.

Doing this exposes an **unauthenticated** chat interface (and your SQLite
data) to everyone on that network. There's no login system — don't do this
on a network you don't trust.

## Architecture

```
src/
  app/
    api/            Route Handlers = the "backend" (chat, models, documents,
                     conversations, messages, settings, backup, health, export)
    page.tsx         Chat UI (reads ?c=<conversationId>)
    models/          Model Library page
    knowledge/       Knowledge Base page
    settings/        Settings page
  components/        Sidebar, ChatView, MessageBubble, MessageInput, ...
  lib/
    db.ts            Lazy SQLite connection + schema (node:sqlite)
    ollama.ts        Thin client for Ollama's HTTP API (list/pull/delete/chat)
    rag.ts           Chunking + local lexical retrieval for the knowledge base
    personas.ts       System-prompt presets ("advanced AI features")
    store.tsx        Small client-side React context (conversations/settings/models)
```

Data flow for a chat message: browser → `POST /api/chat` → inserts the user
message into SQLite → builds a message list (persona system prompt + optional
RAG context + history) → streams from Ollama's `/api/chat` → forwards the
stream to the browser while accumulating it → on completion, writes the
assistant message to SQLite.

## Known limitations

Being upfront about what's *not* fully built, rather than overstating it:

- **RAG is lexical, not embedding-based.** It works well for exact terms and
  short documents but will miss paraphrased questions on long documents. A
  real upgrade path: pull an embedding model (e.g. `nomic-embed-text` via
  Ollama) and swap `src/lib/rag.ts`'s scoring for cosine similarity over
  embeddings — the chunking and storage are already in place.
- **No native installers.** "Installation" means `npm install` (or Docker),
  not a double-click `.exe`/`.dmg`/`.deb`. Packaging this as a native desktop
  app (e.g. with Tauri or Electron) is a reasonable next step but out of
  scope here.
- **`node:sqlite` is an experimental Node.js API** (stable-ish since Node 22,
  still flagged experimental as of this writing). It was chosen over
  `better-sqlite3` after that package's prebuilt native binary **segfaulted**
  on the exact machine this was built on (an older Intel macOS build) —
  `node:sqlite` worked reliably there. If you hit SQLite-related crashes on
  your platform, that's the first thing to check.
- **Docker Compose is written but not run** in this environment (no Docker
  available) — see the honesty note above.
- **PDF support** covers text-based PDFs via `pdf-parse`; scanned/image-only
  PDFs (no embedded text layer) won't extract anything, since there's no OCR
  step.
- **Multi-OS testing** was done on macOS only. Windows/Linux should work
  (nothing here is macOS-specific — no native modules beyond Node's own
  `node:sqlite`, no shell-outs), but hasn't been verified first-hand.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The application code is [MIT-licensed](LICENSE). AI models are not — see
[Model Library and licenses](#model-library-and-licenses) above.
