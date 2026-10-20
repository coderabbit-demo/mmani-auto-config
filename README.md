# CodeRabbit Configuration Builder

A self-hostable TypeScript application that asks pointed questions and generates an initial `.coderabbit.yaml`. Independent community project, not an official CodeRabbit product.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. The app uses React, TypeScript, Vite, Zod, YAML serialization, and a precompiled JSON Schema validator. No backend, repository token, account, or AI API key is needed.

```sh
npm run check                  # schema integrity, unit tests, types, production build
npx playwright install chromium firefox
npm run test:browser           # build dist/ first with npm run check
```

The supported target is desktop browsers; Safari and mobile browser support are not release requirements. Browser tests run against the production preview and cover desktop Chromium and Firefox, with an additional narrow-viewport regression project. They exercise all seven sections, downloads matching the preview, keyboard and row focus, invalid draft recovery, clipboard/storage failures, reset, field errors, platform paths, and offline generation. Test failures retain traces and screenshots under `test-results/`; the HTML report is in `playwright-report/`.

## Self-host

```sh
docker compose up --build -d --wait
```

Open http://localhost:8080. The image runs Nginx as UID 101 on port 8080 with a health check, a read-only filesystem, and a temporary `/tmp`. Its Content Security Policy permits local scripts/fonts/assets and disallows runtime network connections. Compose binds to localhost by default; configure `BIND_ADDRESS` and `PORT` for your intended host or reverse proxy. Use HTTPS on public hosts.

To run the same browser suite against Docker:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:browser
docker compose exec web id
docker compose down
```

Alternatively, run `npm ci && npm run check` and serve `dist/` at the root of any static web server. No Node process is needed in production. The app is usable offline after loading, but does not install a service worker for offline reloads.

## Host on Vercel

Live application: [fe-coderabbit-auto-config.vercel.app](https://fe-coderabbit-auto-config.vercel.app). The `coderabbitai/fe-coderabbit-auto-config` project is connected to this repository with `main` as its production branch.

Import this repository into Vercel as a Vite project. The committed `vercel.json` installs with `npm ci`, runs `npm run check`, and serves `dist/`. Node.js 24 is selected by `package.json`. No environment variables, backend, or API keys are needed.

The Vercel project is `coderabbitai/fe-coderabbit-auto-config`. For CLI deployment from a linked checkout:

```sh
vercel --prod --scope coderabbitai
```

Vercel builds include `@vercel/analytics/react` for basic page-view counts. Web Analytics must be enabled in the Vercel project. The Vercel CSP allows same-origin analytics connections; Docker and ordinary static builds omit analytics and keep runtime connections disabled. Drafts belong to the current browser origin, so an existing localhost draft will not appear on the hosted domain.

## What the questions configure

- Repository inheritance, profile and tone.
- Review file filters and path instructions for **changed source files**.
- Coding guideline **documents**: auto-discovery, local directory scoping, explicit `files` / `applyTo` mappings, and shared repository sources.
- Linked repositories for **cross-repository code context**, with a description of the dependency.
- Automatic review triggers, additional target branches, summaries, diagrams, poems, chat replies, and web-search preferences.

Repository labels, the selected Git platform, and stable form-row IDs are UI metadata and never enter the YAML. Examples explain concrete API, migration, authorization, testing, and generated-code rules; they are not inserted automatically.

The wizard exports explicit values for every exposed switch and profile, including untouched defaults. Those override inherited settings. Settings not exposed here can still inherit; parent list entries may merge. The preview represents the generated file, not the effective parent configuration.

## Pinned official schema validation

The complete official JSON schema is bundled in [`schemas/coderabbit.schema.json`](schemas/coderabbit.schema.json), retrieved from [CodeRabbit's live endpoint](https://coderabbit.ai/integrations/schema.v2.json), which redirects to `www.coderabbit.ai`. The GitHub documentation repository's stale static copy is not used.

The October 19, 2026 snapshot uses JSON Schema 2020-12. Its SHA-256 is:

```text
ebd53b7c9603a044833dc850fca22b0d7edf43e2fbe88a08ba138ad8e45501c2
```

[`schemas/coderabbit.schema.meta.json`](schemas/coderabbit.schema.meta.json) records the source, resolved URL, retrieval timestamp, ETag, last-modified header, dialect, and hash. Upstream declares no release version; the snapshot date and content hash identify this pin. The app displays these details and includes provenance in exported YAML.

Questionnaire validation is separate from output validation. Zod validates completeness, duplicate rows, platform-specific repository syntax, relative guideline references, and branch regex syntax. Ajv validates the generated object against the full pinned schema without coercion or adding defaults. Only output passing both stages is available for preview, copy, or download. Character limits count Unicode code points, matching JSON Schema.

Ajv's standalone validator is compiled at development time and committed in `src/generated/`. The browser neither downloads the schema nor compiles it with `eval`. Zod's optional JIT is disabled, so strict hosts need no `unsafe-eval` policy.

To deliberately update the schema pin:

```sh
npm run schema:update          # fetch only the official endpoint, check shape, repin and regenerate
npm run check
npm run test:browser
```

Review the schema and metadata diff, official documentation, and representative fixtures before committing an update. Ordinary builds do not fetch upstream. `npm run schema:verify` checks both the exact snapshot hash and the generated validator; `npm run schema:generate` regenerates from the current pin without network access.

The schema's relevant limits are 250 tone characters, 20,000 instruction characters per path, 2,000 context characters per linked repository, and at most 20 configured links. The app additionally caps path rules at 100, custom guideline sources at 50, and some text fields for local draft size. Shared guideline references have the documented 512-character limit. These app limits do not imply upstream schema restrictions.

## Local drafts and privacy

All questionnaire generation, validation, drafts, and downloads stay in the browser. There is no remote AI call, repository inspection, or runtime request carrying answers. Vercel-hosted builds count page views with Vercel Web Analytics; custom events are blocked, URL query strings and fragments are removed before tracking, and questionnaire values are never passed to analytics. Local development, Docker, and ordinary static builds do not load analytics. Fonts and the approved CodeRabbit logotype are served locally. Documentation links contact external sites only when clicked. The `web_search` answer configures CodeRabbit's future review behavior; it does not activate web requests in this app.

Drafts are stored unencrypted in localStorage on the current origin. Incomplete rows and invalid answers survive reloads; legacy drafts migrate with GitHub as the platform default. Storage failures show a persistent notice and generation/download remain available. Reset requires confirmation. Clear drafts on shared devices. Browser storage capacity and availability still depend on the host browser.

Some browsers remove a leading dot from downloaded filenames. Rename `coderabbit.yaml` to `.coderabbit.yaml` before committing it at the repository root. Downloaded content matches the preview exactly.

## Branding and scope

The interface follows the [official CodeRabbit brand guidelines](https://www.coderabbit.ai/brand): the intact supplied orange logotype, CR Orange `#FF570A`, mauve neutrals, Geist 400/600, and Hack 400/700 for technical text. Dark text on orange controls preserves readable contrast. Asset provenance and font licenses are bundled under `public/brand/` and `public/fonts/`. Community attribution remains visible on desktop and mobile.

The app cannot verify file existence, repository or installation access, plan entitlement, effective inheritance, or actual CodeRabbit review behavior. Shared guidelines are documented for GitHub, GitLab, and Bitbucket Cloud; provider-specific access and retention requirements still apply. Linking never grants access. Regex syntax is checked with JavaScript RegExp without running matches; CodeRabbit performs actual branch matching.

Language selection, tool/CI overlap, pre-merge checks, knowledge retention controls, and automatic repository linking are future scope. No settings have been executed by CodeRabbit. No publishing or deployment is part of local verification.

## Official references

Configuration and behavior were checked October 19, 2026:

- [Configuration reference](https://docs.coderabbit.ai/reference/configuration)
- [Path instructions](https://docs.coderabbit.ai/configuration/path-instructions)
- [Code guidelines and shared sources](https://docs.coderabbit.ai/knowledge-base/code-guidelines)
- [Multi-repo analysis](https://docs.coderabbit.ai/knowledge-base/multi-repo-analysis)
- [Configuration inheritance](https://docs.coderabbit.ai/configuration/configuration-inheritance)

See [`docs/LOCAL_HANDOFF.md`](docs/LOCAL_HANDOFF.md) for verification details and remaining gaps. GitHub Actions runs the same checks and browser suite against static preview and Docker; its first remote run is pending.
