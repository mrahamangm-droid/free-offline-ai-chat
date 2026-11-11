# Security Policy

## Reporting a vulnerability

Please report security issues privately via GitHub's "Report a vulnerability"
button on this repository's Security tab, rather than opening a public issue.
Include:

- A description of the issue and its impact
- Steps to reproduce
- Your OS, Node.js version, and Ollama version

We'll acknowledge reports as soon as possible and credit you in the fix
unless you ask otherwise.

## Scope and architecture notes for reviewers

This app is designed to run entirely on a single user's own machine, with no
authentication layer, because by default it's only reachable from
`localhost`. That assumption is load-bearing:

- There is **no login system**. If you expose this app's port to a network
  (see "LAN access" in the README), anyone on that network gets full,
  unauthenticated access to chat, uploaded documents, and conversation
  history. This is documented, not a bug — but we're interested in reports
  of ways the app could be *more* exposed than it appears to be.
- File uploads (`/api/documents`) are capped at 10 MB and restricted by MIME
  type / extension, parsed in-process, and never written to disk outside the
  SQLite database.
- Model output is rendered as Markdown and never executed — there is no code
  path that runs model-generated code, shell commands, or Markdown as HTML
  via `dangerouslySetInnerHTML`.
- The only outbound network calls this app makes are to `127.0.0.1:11434`
  (the local Ollama server) and, during a model download you explicitly
  trigger, to Ollama's model registry.

Reports about any of the above behaving differently than described are
exactly what this policy is for.
