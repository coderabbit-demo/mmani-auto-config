# Local continuation brief

## Goal and constraints

Build a self-hostable TypeScript questionnaire that generates an initial `.coderabbit.yaml`, without repository tokens or AI API keys. Preserve browser-local generation, static hosting, and the distinction between path instructions, coding guideline documents, and linked-repository context. Follow the official CodeRabbit brand guide while clearly identifying this as an independent community tool. Do not publish or deploy unless instructed.

## Completed October 19, 2026

- Read the original README/handoff and ran the initial nine unit tests, TypeScript checks, and build after installing locked dependencies.
- Exercised the original wizard in an actual browser before expansion: draft recovery, validation/export blocking, radio keyboard input, mobile width, and matching downloaded content.
- Retrieved the live official JSON Schema 2020-12 from `https://coderabbit.ai/integrations/schema.v2.json` (redirects to `www.coderabbit.ai`). Verified current quiet profile, inheritance, guideline object form, and linked repositories against the schema and official docs. Did not use the stale GitHub docs copy.
- Pinned exact schema bytes, provenance metadata, and SHA-256 `ebd53b7c9603a044833dc850fca22b0d7edf43e2fbe88a08ba138ad8e45501c2`. Added explicit schema-update, generation, and verification commands. Ordinary builds are offline with respect to upstream schema.
- Precompiled the complete schema with Ajv for browser-local validation. Questionnaire validation remains independent. Exports require both. No coercion or schema-default mutation; no runtime schema fetch or validator code generation.
- Added precise inline errors with `aria-invalid` / `aria-describedby`, error links that navigate and focus fields, stable row IDs, add/remove focus, heading focus, skip navigation, and visible mobile storage state.
- Kept unfinished and invalid drafts recoverable, migrated prior drafts, surfaced storage failures, and preserved confirmed/cancelled reset behavior. Disabled guideline rows remain in drafts and are omitted from export.
- Added provider-aware linked paths, duplicate detection, shared guideline syntax/traversal/length checks, branch regex syntax errors with line numbers, and Unicode code-point counters.
- Added concrete guidance for API contracts, rolling migrations, authorization, tests, generated code, guideline scopes, shared-source requirements, and cross-repository impact. No examples are inserted automatically.
- Applied the official branding: intact supplied logotype, CR Orange and mauve neutrals, local Geist and Hack fonts with licenses and provenance. Kept community attribution visible on mobile.
- Updated the test runner to remove the dependency audit's reported vulnerabilities.
- Added production browser tests across desktop Chromium, Chromium at a mobile viewport, and desktop Firefox. Tests cover full wizard export with parsed YAML/schema validation, exact download/preview equality, keyboard/row identity and focus, incomplete and invalid draft refresh, clipboard/storage failures, reset, provider syntax, duplicates, disabled guidelines, narrow layouts, and offline generation. They also detect page errors and CSP violations.
- Added CI for unit/build/schema checks plus browser tests on preview and Docker.
- Built and started the Docker image with Compose. Confirmed healthy Nginx running as UID 101, read-only filesystem, localhost binding, and a strict CSP with no runtime connections.

## Final local results

- `npm run check`: passed, including 44 unit tests, full TypeScript checking (application and browser-test sources), schema hash/generated-validator verification, and production build.
- `npm run test:browser`: 27/27 passed on static preview.
- Docker build/Compose startup: passed; container healthy, UID/GID 101.
- Browser suite against Docker with CSP/page-error detection: 27/27 passed.
- Live schema updater exercised in an isolated temporary directory (including a directory name containing spaces): passed and returned the same pinned hash.
- `npm audit` and production-only audit: zero reported vulnerabilities.
- Desktop and 390px mobile screenshots inspected; body, supporting text, and orange primary-action contrast checked.
- Temporary verification containers and the development server were stopped after verification. The user subsequently requested a runnable local version; `docker compose up --build -d --wait` started the normal local service, which remains running on localhost:8080. No external deployment was performed.

## Verification commands

```sh
npm ci
npm run check
npx playwright install chromium firefox
npm run test:browser

docker compose up --build -d --wait
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:browser
docker compose exec web id
docker compose down
```

The Docker build runs `npm run check` itself. For a temporary isolated local verification, use Compose project name `rabbit-config-verify`. Do not leave verification containers running. Tests generate reports under ignored `test-results/` and `playwright-report/` directories.

## Supported scope

The supported target is desktop browsers. Safari and mobile browser support are not release requirements. Existing narrow-viewport tests are extra regression coverage, not a promise of mobile support.

## What remains outside local verification

- Assistive-technology testing and a full WCAG audit have not been performed. Safari/WebKit and mobile-device support are outside the release requirements.
- Live CodeRabbit execution, plan entitlements, installation permissions, source-file existence, and effective inherited configuration. The app intentionally makes no such claims.
- The first remote GitHub Actions run. Workflow is authored locally but has not been pushed.
- CodeRabbit CLI review: local CLI 0.9.0 was detected, but its saved sign-in was unavailable in this sandbox. No CodeRabbit service review was performed; no credential was read or copied.
- Optional feature scope: language, tool/CI overlap, pre-merge checks, retention controls, automatic linking, and an abbreviated setup-depth choice.

Chromium may sanitize `.coderabbit.yaml` to `coderabbit.yaml` during download. The UI explains the rename needed before committing; the bytes match the preview.

The Vite build may report harmless third-party annotation warnings in Zod. No application errors are hidden or suppressed.
