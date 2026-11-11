# Changelog

All notable changes to this project are documented in this file.

## [0.1.0] - 2026-11-11

### Added

- Initial release: offline-first AI chat app on Next.js + Ollama + SQLite.
- Streaming chat with stop/regenerate/edit, markdown + syntax highlighting.
- Model Library: list/pull/delete Ollama models, hardware-aware recommendations.
- Knowledge Base: document upload (.txt/.md/.csv/.json/.pdf) with local
  lexical RAG retrieval.
- Multi-conversation history with search, rename, delete, export (md/txt/json).
- Settings: theme, defaults, storage stats, JSON backup, clear-all-data.
- Persona system prompts (general / coding / writing / research / brainstorm).
- PWA app-shell caching via a service worker.
- Docker Compose stack (app + Ollama) with a non-root, standalone-output image.
