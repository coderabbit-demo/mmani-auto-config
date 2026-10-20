import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { answersSchema, buildConfig, characterCount, defaults, generateYaml, loadDraft, prepareExport, readDraft, schemaMeta, saveDraft, validateConfig } from '../src/config';

const fixture = parse(readFileSync(new URL('./fixtures/comprehensive.yaml', import.meta.url), 'utf8'));
describe('official pinned schema', () => {
  it('pins the exact official snapshot by hash', () => {
    const bytes = readFileSync(new URL('../schemas/coderabbit.schema.json', import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(schemaMeta.sha256);
    expect(schemaMeta.source).toBe('https://coderabbit.ai/integrations/schema.v2.json');
  });
  it('accepts a representative independently authored fixture and quiet/inheritance/scoped guidelines', () => {
    expect(validateConfig(fixture)).toEqual([]);
    expect(validateConfig({ reviews: { profile: 'quiet' }, inheritance: false })).toEqual([]);
  });
  it.each([
    [{ reviews: { profile: 'silent' } }, '/reviews/profile'],
    [{ inheritance: 'yes' }, '/inheritance'],
    [{ tone_instructions: 'x'.repeat(251) }, '/tone_instructions'],
    [{ reviews: { path_instructions: [{ path: '**' }] } }, '/reviews/path_instructions/0'],
    [{ knowledge_base: { code_guidelines: { filePatterns: [{ files: 'docs/api.md' }] } } }, '/knowledge_base/code_guidelines/filePatterns/0'],
    [{ knowledge_base: { linked_repositories: [{ repository: 'https://github.com/org/repo' }] } }, '/knowledge_base/linked_repositories/0/repository'],
    [{ knowledge_base: { linked_repositories: [{ repository: 'org/repo', token: 'must-not-exist' }] } }, '/knowledge_base/linked_repositories/0'],
    [{ knowledge_base: { linked_repositories: Array.from({ length: 21 }, () => ({ repository: 'org/repo' })) } }, '/knowledge_base/linked_repositories'],
    [{ unknown_setting: true }, '/'],
  ])('rejects invalid output with a precise schema path', (config, path) => {
    expect(validateConfig(config).some(e => e.path === path)).toBe(true);
  });
  it('does not mutate the supplied configuration or add upstream defaults', () => {
    const minimal = { inheritance: true }; expect(validateConfig(minimal)).toEqual([]); expect(minimal).toEqual({ inheritance: true });
  });
  it('counts Unicode code points consistently with JSON Schema', () => {
    expect(characterCount('🐇')).toBe(1);
    expect(validateConfig({ tone_instructions: '🐇'.repeat(250) })).toEqual([]);
    expect(prepareExport({ ...defaults, tone: '🐇'.repeat(250) }).yaml).toBeTruthy();
    expect(prepareExport({ ...defaults, tone: '🐇'.repeat(251) }).yaml).toBe('');
  });
  it('strips all row identity, draft label and platform metadata from YAML', () => {
    const config = parse(generateYaml({ ...defaults, repository: 'UI ONLY', platform: 'gitlab',
      pathInstructions: [{ id: 'secret-id', path: 'src/**', instructions: 'Check contracts' }],
      guidelines: [{ id: 'secret-id', files: 'AGENTS.md', applyTo: '' }],
      linkedRepositories: [{ id: 'secret-id', repository: 'group/subgroup/repo', instructions: '' }] }));
    expect(JSON.stringify(config)).not.toMatch(/secret-id|UI ONLY|platform/);
    expect(validateConfig(config)).toEqual([]);
  });
});
describe('answer guidance validation', () => {
  it.each([
    ['github', 'acme/api', true], ['github', 'group/subgroup/api', false], ['github', 'bad owner/repo', false],
    ['gitlab', 'group/subgroup/api', true], ['bitbucket', 'workspace/api', true],
    ['azure', 'My Project/backend-api', true], ['azure', 'org/project/repo', false],
    ['github', 'org/../repo', false], ['github', 'org/repo.git', false],
  ] as const)('checks %s repository syntax: %s', (platform, repository, valid) => {
    expect(answersSchema.safeParse({ ...defaults, platform, linkedRepositories: [{ repository, instructions: '' }] }).success).toBe(valid);
  });
  it('rejects duplicate paths, scoped sources and case-insensitive GitHub links', () => {
    const result = prepareExport({ ...defaults,
      pathInstructions: [{ path: 'src/**', instructions: 'One' }, { path: ' src/** ', instructions: 'Two' }],
      guidelines: [{ files: 'docs/api.md', applyTo: 'src/**' }, { files: 'docs/api.md', applyTo: 'src/**' }],
      linkedRepositories: [{ repository: 'Acme/API', instructions: '' }, { repository: 'acme/api', instructions: '' }],
    });
    expect(result.yaml).toBe('');
    expect(result.answerErrors.map(e => e.path.join('.'))).toEqual(expect.arrayContaining(['pathInstructions.1.path', 'guidelines.1.files', 'linkedRepositories.1.repository']));
  });
  it.each(['org/repo:../rules.md', '/etc/rules.md', 'org/repo:path:extra', 'C:\\rules.md', 'https://host/rules.md', 'org/repo:' + 'a'.repeat(504)])('rejects unsafe/malformed guideline reference %s', files => {
    expect(prepareExport({ ...defaults, guidelines: [{ files, applyTo: '' }] }).yaml).toBe('');
  });
  it('keeps disabled incomplete guideline rows in draft but omits them from export', () => {
    const a = { ...defaults, guidelinesEnabled: false, guidelines: [{ files: '', applyTo: '' }, { files: 'x'.repeat(2001), applyTo: '../invalid/**' }] };
    expect(buildConfig(a).knowledge_base.code_guidelines).toEqual({ enabled: false });
    expect(readDraft({ getItem: () => JSON.stringify(a) }).guidelines).toEqual(a.guidelines);
  });
  it('limits shared guideline platforms to the documented providers', () => {
    expect(prepareExport({ ...defaults, platform: 'azure', guidelines: [{ files: 'org/repo:rules.md', applyTo: '' }] }).yaml).toBe('');
  });
  it('does not report a saved draft that exceeds recovery bounds', () => {
    const storage = { setItem: () => { throw new Error('should not write'); } };
    expect(saveDraft(storage, { ...defaults, tone: 'x'.repeat(50001) })).toBe(false);
  });
  it('reports the source line for malformed branch regex without evaluating matches', () => {
    const result = prepareExport({ ...defaults, baseBranches: '^release/.*$\n[' });
    expect(result.yaml).toBe(''); expect(result.answerErrors[0].message).toContain('Line 2');
  });
  it('migrates old drafts and preserves invalid tone/regex as well as unfinished rows', () => {
    const { platform: _, ...legacy } = { ...defaults, tone: 'x'.repeat(251), baseBranches: '[', guidelines: [{ files: '', applyTo: '' }] };
    const result = loadDraft({ getItem: () => JSON.stringify(legacy) });
    expect(result.status).toBe('restored'); expect(result.answers).toEqual({ ...legacy, platform: 'github' }); expect(prepareExport(result.answers).yaml).toBe('');
  });
});
