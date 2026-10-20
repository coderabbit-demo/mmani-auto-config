# Local continuation brief

## Goal and user decisions

Build a self-hostable TypeScript web application that asks pointed questions to produce an initial `.coderabbit.yaml` for a given repository. The user requested a runnable MVP, then moved development to a local workspace at https://github.com/coderabbit-demo/mmani-auto-config.

The original question areas were profile, tone, path instructions, coding guidelines, and multi-repo linkage. Added areas are repository inheritance, review scope/exclusions, automatic review triggers, and PR output/chat/web-search preferences.

## What exists

- React + TypeScript + Vite static application.
- Seven-step wizard with free navigation and a live YAML preview.
- Typed answer model, Zod validation, YAML serialization, copy/download, browser-local drafts, reset confirmation.
- Guideline document scoping with `files` and `applyTo`; explicit manual linked-repo context.
- Unit tests for generator safety, omitted fields, limits, guideline mappings, and draft recovery.
- Dockerfile and Compose static hosting setup.

Cloud environment startup/network access delayed implementation. This is a runnable starter, not a finished or browser-verified product. No other repository's application files or AGENTS.md instructions were copied here.

## Checks completed at upload

`npm run check` passed: 9 unit tests, TypeScript checking, and Vite production build. Vite emitted non-fatal third-party annotation warnings from Zod. Browser interaction and Docker execution have not been verified.

## Next work, in order

1. Read this file, README.md, package.json, and src/config.ts; run `npm ci` and `npm run check`, then start the app.
2. Exercise the wizard in a real browser on desktop/mobile. Test keyboard navigation, adding/removing repeated rows, validation, refresh with incomplete drafts, reset confirmation, clipboard failure, and downloading/reading `.coderabbit.yaml`. Add a small meaningful Playwright suite.
3. Obtain the current official JSON schema from https://coderabbit.ai/integrations/schema.v2.json. Pin a verified snapshot with source, retrieval date, hash, and an update mechanism. The GitHub docs repository's static copy was stale during this handoff. Do not silently substitute it.
4. Validate generated output against that schema, keep answer-validation separate, and add representative fixtures. Confirm `quiet`, inheritance, `filePatterns` object form, and linked repositories against the snapshot. Expose schema version and precise field errors. Do not label output fully schema-valid until this is implemented.
5. Validate platform-specific repo paths, guideline reference syntax and limits, duplicate rule/link rows, and branch regex syntax. Explain plan/access requirements without claiming to verify them. Audit max lengths against the schema; the UI's JavaScript string counters currently count UTF-16 code units.
6. Refine the questions so they elicit concrete project rules. Add examples for API compatibility, migrations, authorization, tests, and generated code without auto-inserting generic rules. Consider an optional setup-depth choice to avoid overwhelming users.
7. Consider language, existing CI/tool overlap, pre-merge checks, knowledge sources/retention, and manual versus automatic linking. Keep advanced features optional. Plan-sensitive features should not promise effectiveness. Be especially careful before exposing knowledge-base opt-out because CodeRabbit documents deletion of retained knowledge.
8. Test Docker build and Compose startup, inspect the production bundle, and add CI for `npm ci && npm run check` plus browser tests.

## Product and implementation constraints

- Keep self-hosting simple. A static browser application is enough for the MVP.
- No repository tokens or model API keys are required. Do not add remote AI calls, analytics, repo uploads, or hosted dependencies without an intentional product decision.
- Use a YAML library; never interpolate answers into YAML strings.
- Never put UI-only repository metadata into the generated CodeRabbit configuration.
- Keep path instructions (guidance for changed source paths), coding guidelines (documents to use as standards), and linked repositories (cross-repo context) distinct.
- Clearly explain defaults versus inherited settings. The live preview is not an effective-config resolver.
- Do not fetch arbitrary repo URLs from a new backend without a deliberate access/network design.
- Do not claim CodeRabbit reviewed this application or executed the generated settings. No such review was requested or performed.
- Do not publish, deploy, or change external app settings unless requested. The initial GitHub upload was explicitly authorized.

## Acceptance criteria for a completed MVP

- A new user can generate a schema-validated `.coderabbit.yaml` without reading YAML documentation first.
- Every non-obvious answer has an explanation and a concrete example.
- Valid previews and downloads match exactly; incomplete rows prevent export and survive refresh.
- Draft recovery, storage/clipboard failures, repeated-row identity/focus, mobile layout, and keyboard use are tested.
- No runtime requests send questionnaire answers off the device.
- Node/npm startup and Docker self-hosting work from a fresh clone.

## Suggested continuation prompt

Continue this project toward a finished, self-hostable TypeScript MVP. Read README.md and docs/LOCAL_HANDOFF.md first, inspect the existing code, and run its checks. Verify the existing starter in a real browser before expanding scope. Then implement current upstream JSON-schema validation, actionable question/error guidance, and meaningful browser tests. Preserve browser-local generation and simple static hosting. Work autonomously through build, testing, and fixes, and report what is complete versus still unverified. Do not publish or deploy without my instruction.
