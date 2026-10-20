import { z } from 'zod';
import { stringify } from 'yaml';
import validate from './generated/schema-validator.js';
import schemaMeta from '../schemas/coderabbit.schema.meta.json' with { type: 'json' };

// Disable Zod's optional JIT so strict static hosts need no unsafe-eval.
z.config({ jitless: true });

export { schemaMeta };
export const characterCount = (value: string) => [...value].length;
const text = (max: number, message: string) => z.string().refine(s => characterCount(s) <= max, message);
const rowId = { id: z.string().optional() };
const rule = z.object({ ...rowId, path: z.string().trim().min(1, 'Add a source-file glob, such as src/api/**.').max(2000, 'Keep the path under 2,001 characters (app limit).'),
  instructions: text(20000, 'Use at most 20,000 characters.').transform(s => s.trim()).refine(Boolean, 'Explain what to check and why it matters.') });
const guideline = z.object({ ...rowId, files: z.string().trim(), applyTo: z.string().trim() });
const linked = z.object({ ...rowId, repository: z.string().trim().min(1, 'Add the repository path, without a URL.'), instructions: text(2000, 'Use at most 2,000 characters.').transform(s => s.trim()) });

const answerFields = z.object({
  repository: z.string().max(200, 'Use at most 200 characters for the draft label.'),
  platform: z.enum(['github', 'gitlab', 'bitbucket', 'azure']),
  inheritance: z.boolean(), profile: z.enum(['quiet', 'chill', 'assertive']),
  tone: text(250, 'Use at most 250 characters for tone. Move technical rules to path instructions.'),
  pathFilters: z.string().max(20000, 'Use at most 20,000 characters (app limit).'),
  pathInstructions: z.array(rule).max(100, 'Use at most 100 path rules (app limit).'),
  guidelinesEnabled: z.boolean(), guidelines: z.array(guideline).max(50, 'Use at most 50 sources (app limit).'),
  linkedRepositories: z.array(linked).max(20, 'The official schema allows at most 20 linked repositories.'),
  autoReview: z.boolean(), drafts: z.boolean(), incremental: z.boolean(), baseBranches: z.string().max(2000, 'Use at most 2,000 characters (app limit).'),
  summary: z.boolean(), sequenceDiagrams: z.boolean(), poem: z.boolean(), autoReply: z.boolean(), webSearch: z.boolean(),
});
export type Answers = z.infer<typeof answerFields>;
export const defaults: Answers = {
  repository: '', platform: 'github', inheritance: true, profile: 'chill',
  tone: 'Be concise, constructive, and specific. Explain the impact of each issue and suggest a concrete fix.',
  pathFilters: '', pathInstructions: [], guidelinesEnabled: true, guidelines: [], linkedRepositories: [],
  autoReview: true, drafts: false, incremental: true, baseBranches: '',
  summary: true, sequenceDiagrams: false, poem: false, autoReply: true, webSearch: true,
};
export const lines = (value: string) => [...new Set(value.split('\n').map(s => s.trim()).filter(Boolean))];

const segment = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
function repositoryPath(value: string, platform: Answers['platform'], shorthand = false) {
  const parts = value.split('/');
  if (parts.some(x => !x || x === '.' || x === '..' || x.endsWith('.git'))) return false;
  if (shorthand && parts.length === 1) return segment.test(value);
  if (platform === 'gitlab') return parts.length >= 2 && parts.every(x => segment.test(x) || /^\.[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(x));
  if (parts.length !== 2) return false;
  if (platform === 'github') return /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(parts[0]) && /^[A-Za-z0-9_.-]+$/.test(parts[1]);
  if (platform === 'azure') return parts.every(x => /^[A-Za-z0-9][A-Za-z0-9 _.\-]*[A-Za-z0-9_.\-]$/.test(x) || /^[A-Za-z0-9]$/.test(x));
  return parts.every(x => segment.test(x));
}
function relativePath(value: string) {
  return !!value && !value.startsWith('/') && !value.includes('\\') && !value.includes(':')
    && !value.split('/').some(s => s === '..') && !/[\u0000-\u001f\u007f]/.test(value);
}

export const answersSchema = answerFields.superRefine((a, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  const seen = new Map<string, number>();
  a.pathInstructions.forEach((r, i) => {
    if (r.path && !relativePath(r.path)) issue(['pathInstructions', i, 'path'], 'Use a repository-relative glob, without parent traversal, backslashes, or a URL.');
    if (r.path && seen.has(r.path)) issue(['pathInstructions', i, 'path'], `This path is already in rule ${seen.get(r.path)! + 1}. Combine the checks or choose another path.`);
    seen.set(r.path, i);
  });
  const sources = new Map<string, number>();
  a.guidelines.forEach((g, i) => {
    if (!a.guidelinesEnabled) return;
    if (!g.files) issue(['guidelines', i, 'files'], 'Name a guideline document, such as docs/standards.md.');
    if (characterCount(g.files) > 2000) issue(['guidelines', i, 'files'], 'Use at most 2,000 characters for the source (app limit).');
    if (characterCount(g.applyTo) > 2000) issue(['guidelines', i, 'applyTo'], 'Use at most 2,000 characters for source-file scopes (app limit).');
    const parts = g.files.split(':');
    if (parts.length > 1) {
      if (a.platform === 'azure') issue(['guidelines', i, 'files'], 'Shared guideline sources are documented for GitHub, GitLab, and Bitbucket Cloud. Use a local document on Azure DevOps.');
      if (parts.length !== 2 || !repositoryPath(parts[0], a.platform, true) || !relativePath(parts[1])) issue(['guidelines', i, 'files'], 'Use repo:docs/standards.md or owner/repo:docs/standards.md with a relative file path and one colon.');
      if (characterCount(g.files) > 512) issue(['guidelines', i, 'files'], 'A shared guideline reference can contain at most 512 characters.');
    } else if (g.files && !relativePath(g.files)) issue(['guidelines', i, 'files'], 'Use a relative document path, without parent traversal, backslashes, or a URL.');
    if (g.applyTo && !relativePath(g.applyTo)) issue(['guidelines', i, 'applyTo'], 'Use source-file globs relative to this repository, such as src/**/*.ts.');
    const key = `${g.files}\0${g.applyTo}`;
    if (g.files && sources.has(key)) issue(['guidelines', i, 'files'], `This source and scope are already in source ${sources.get(key)! + 1}. Remove the duplicate.`);
    sources.set(key, i);
  });
  const repos = new Map<string, number>();
  a.linkedRepositories.forEach((r, i) => {
    if (r.repository && !repositoryPath(r.repository, a.platform)) issue(['linkedRepositories', i, 'repository'], a.platform === 'gitlab' ? 'Use group/repo or group/subgroup/repo, without a URL or .git suffix.' : a.platform === 'azure' ? 'Use project/repo, such as My Project/backend-api, without a URL.' : 'Use owner/repo, without a URL, spaces, a .git suffix, or extra path segments.');
    const key = ['github', 'bitbucket'].includes(a.platform) ? r.repository.toLowerCase() : r.repository;
    if (key && repos.has(key)) issue(['linkedRepositories', i, 'repository'], `Already linked in repository ${repos.get(key)! + 1}. Keep one entry with the combined context.`);
    repos.set(key, i);
  });
  a.baseBranches.split('\n').forEach((value, i) => {
    if (!value.trim()) return;
    try { new RegExp(value.trim()); } catch { issue(['baseBranches'], `Line ${i + 1} is not a valid regular expression. Try ^release/.*$ or .* for all branches.`); }
  });
});

/** Only questionnaire settings enter the config; UI platform, label and row IDs never do. */
function configFromAnswers(a: Answers) {
  const paths = lines(a.pathFilters), branches = lines(a.baseBranches);
  return {
    inheritance: a.inheritance, tone_instructions: a.tone,
    reviews: {
      profile: a.profile, high_level_summary: a.summary, sequence_diagrams: a.sequenceDiagrams, poem: a.poem,
      ...(paths.length ? { path_filters: paths } : {}),
      ...(a.pathInstructions.length ? { path_instructions: a.pathInstructions.map(({ path, instructions }) => ({ path, instructions })) } : {}),
      auto_review: { enabled: a.autoReview, drafts: a.drafts, auto_incremental_review: a.incremental, ...(branches.length ? { base_branches: branches } : {}) },
    },
    chat: { auto_reply: a.autoReply },
    knowledge_base: {
      web_search: { enabled: a.webSearch },
      code_guidelines: { enabled: a.guidelinesEnabled, ...(a.guidelinesEnabled && a.guidelines.length ? { filePatterns: a.guidelines.map(({ files, applyTo }) => applyTo ? { files, applyTo } : files) } : {}) },
      ...(a.linkedRepositories.length ? { linked_repositories: a.linkedRepositories.map(({ repository, instructions }) => ({ repository, instructions })) } : {}),
    },
  };
}
export type ConfigIssue = { path: string; message: string };
/** Separate output validation; no mutation, coercion, remote refs or defaults. */
export function validateConfig(config: unknown): ConfigIssue[] {
  if (validate(config)) return [];
  return (validate.errors ?? []).map(e => ({ path: e.instancePath || '/', message: e.message ?? 'Does not match the pinned schema.' }));
}
export function buildConfig(input: Answers) {
  const config = configFromAnswers(answersSchema.parse(input));
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.map(e => `${e.path}: ${e.message}`).join('\n'));
  return config;
}
function serialize(config: ReturnType<typeof configFromAnswers>) {
  return '# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json\n'
    + `# Official schema snapshot: ${schemaMeta.verifiedOn}\n# SHA-256: ${schemaMeta.sha256}\n`
    + '# Generated by Rabbit Config. Review before committing to your repository.\n'
    + stringify(config, { lineWidth: 100 });
}
export function generateYaml(input: Answers) { return serialize(buildConfig(input)); }
export function prepareExport(input: Answers) {
  const result = answersSchema.safeParse(input);
  if (!result.success) return { yaml: '', answerErrors: result.error.issues, schemaErrors: [] as ConfigIssue[] };
  const config = configFromAnswers(result.data), schemaErrors = validateConfig(config);
  return { yaml: schemaErrors.length ? '' : serialize(config), answerErrors: [], schemaErrors };
}

export const DRAFT_KEY = 'rabbit-config:draft:v1';
// Drafts deliberately tolerate invalid/incomplete answers, independently of export validation.
const draftText = z.string().max(50000);
const draftSchema = answerFields.extend({
  platform: answerFields.shape.platform.default('github'),
  repository: draftText, tone: draftText, pathFilters: draftText, baseBranches: draftText,
  pathInstructions: z.array(z.object({ ...rowId, path: draftText, instructions: draftText })).max(100),
  guidelines: z.array(z.object({ ...rowId, files: draftText, applyTo: draftText })).max(50),
  linkedRepositories: z.array(z.object({ ...rowId, repository: draftText, instructions: draftText })).max(20),
});
export function loadDraft(storage: Pick<Storage, 'getItem'>): { answers: Answers; status: 'new' | 'restored' | 'discarded' | 'unavailable' } {
  const empty = structuredClone(defaults);
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return { answers: empty, status: 'new' };
    if (raw.length > 4_000_000) return { answers: empty, status: 'discarded' };
    const result = draftSchema.safeParse(JSON.parse(raw));
    return result.success ? { answers: result.data, status: 'restored' } : { answers: empty, status: 'discarded' };
  } catch { return { answers: empty, status: 'unavailable' }; }
}
export function readDraft(storage: Pick<Storage, 'getItem'>): Answers { return loadDraft(storage).answers; }
export function saveDraft(storage: Pick<Storage, 'setItem'>, answers: Answers): boolean {
  try {
    if (!draftSchema.safeParse(answers).success) return false;
    const raw = JSON.stringify(answers);
    if (raw.length > 4_000_000) return false;
    storage.setItem(DRAFT_KEY, raw); return true;
  } catch { return false; }
}
