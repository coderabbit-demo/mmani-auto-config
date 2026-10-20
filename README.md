# Rabbit Config

A self-hostable TypeScript web app that asks pointed questions and generates an initial `.coderabbit.yaml` for a repository. Independent community project; not an official CodeRabbit product.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Run `npm run check` for unit tests, TypeScript checks, and a production build. `npm run preview` serves the resulting build locally.

## Self-host

```sh
docker compose up --build -d
```

Open http://localhost:8080. Alternatively, serve the contents of `dist/` with any static web server after `npm ci && npm run build`. The Docker image runs Nginx as an unprivileged user. Docker packaging is provided but has not been exercised in the initial cloud handoff.

## Starter functionality

- Seven questionnaire sections: repository inheritance, profile/tone, scope/path instructions, guideline sources, linked repositories, automation/output, export.
- Live YAML preview with safe serialization, clipboard copy, and `.coderabbit.yaml` download.
- Browser-local draft saving, including incomplete rows, with a reset confirmation.
- Runtime answer validation with Zod and generator/storage unit tests.
- Standard guideline auto-discovery plus explicit `files` / `applyTo` mappings and shared-repository guideline references.
- No backend, account, repository credentials, AI API key, analytics, or runtime network requests. Docs links open only when clicked. Drafts are stored unencrypted in localStorage on this origin; clear the draft on shared devices.

Repository names are labels only. The app does not inspect repositories, verify permissions, create files in GitHub, or open pull requests. Output is a starting configuration for the user to review and commit.

## Validation status

The starter validates questionnaire types, required rule fields, and documented length/list limits. **It does not yet validate the complete output against a pinned current upstream JSON schema.** The YAML schema header enables editor validation where supported. Platform access, plan entitlement, file existence, effective inheritance, and CodeRabbit review behavior cannot be established by this app.

The schema found in `coderabbitai/coderabbit-docs/main/static/schema/schema.v2.json` during initial research was older than the live reference (it lacked current settings). It was deliberately excluded. Do not treat that GitHub copy as the current schema without verification.

No browser end-to-end run or live CodeRabbit review has been completed for this initial handoff. See [the continuation brief](docs/LOCAL_HANDOFF.md) for priorities and acceptance criteria.

## Configuration references

The questionnaire was mapped to official documentation reviewed October 19, 2026:

- [Configuration reference](https://docs.coderabbit.ai/reference/configuration): `quiet`, `chill`, and `assertive` profiles; tone and review options.
- [Path instructions](https://docs.coderabbit.ai/configuration/path-instructions): changed-file guidance versus file filters.
- [Code guidelines](https://docs.coderabbit.ai/knowledge-base/code-guidelines): auto-discovery, directory scoping, explicit mappings, shared guideline sources.
- [Multi-repo analysis](https://docs.coderabbit.ai/knowledge-base/multi-repo-analysis): repository access and platform/plan constraints. Configuring links does not grant access.
- [Configuration inheritance](https://docs.coderabbit.ai/configuration/configuration-inheritance): explicit child values override parents; parent list items may be merged.

The current implementation writes explicit defaults for the questionnaire's options. Inheritance applies to omitted settings; the preview is the generated file, not the fully resolved parent configuration. Language, tools, pre-merge checks, and knowledge retention controls are future scope.
