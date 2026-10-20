import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildConfig, defaults, generateYaml, readDraft, saveDraft } from '../src/config';

describe('configuration export', () => {
  it('generates parsable YAML with supported defaults and no UI metadata', () => {
    const config = parse(generateYaml({ ...defaults, repository: 'example/app' }));
    expect(config.reviews.profile).toBe('chill');
    expect(config.inheritance).toBe(true);
    expect(config.repository).toBeUndefined();
    expect(config.reviews.path_filters).toBeUndefined();
    expect(config.knowledge_base.linked_repositories).toBeUndefined();
  });
  it('serializes strings safely instead of treating instructions as YAML', () => {
    const text = 'Check this: "quoted"\nreviews:\n  profile: assertive\n# comment';
    const config = parse(generateYaml({ ...defaults, pathInstructions: [{ path: '**/*.ts', instructions: text }] }));
    expect(config.reviews.path_instructions).toEqual([{ path: '**/*.ts', instructions: text }]);
    expect(config.reviews.profile).toBe('chill');
  });
  it('supports explicit guideline scopes and shared-repository sources', () => {
    const config = buildConfig({ ...defaults, guidelines: [
      { files: 'docs/standards.md', applyTo: 'src/**/*.ts' },
      { files: 'org/standards:guidelines/**/*.md', applyTo: '' },
    ] });
    expect(config.knowledge_base.code_guidelines.filePatterns).toEqual([
      { files: 'docs/standards.md', applyTo: 'src/**/*.ts' }, 'org/standards:guidelines/**/*.md',
    ]);
  });
  it('omits custom sources when guidelines are disabled', () => {
    const config = buildConfig({ ...defaults, guidelinesEnabled: false, guidelines: [{ files: 'AGENTS.md', applyTo: '' }] });
    expect(config.knowledge_base.code_guidelines).toEqual({ enabled: false });
  });
  it('preserves negative globs and deduplicates nonempty lines', () => {
    const config = buildConfig({ ...defaults, pathFilters: '\n!dist/**\n !dist/** \nsrc/**', baseBranches: 'release/.*\n\n' });
    expect(config.reviews.path_filters).toEqual(['!dist/**', 'src/**']);
    expect(config.reviews.auto_review.base_branches).toEqual(['release/.*']);
  });
  it('rejects incomplete paths, long tone, and malformed linked repositories', () => {
    expect(() => generateYaml({ ...defaults, pathInstructions: [{ path: '', instructions: 'Check it' }] })).toThrow();
    expect(() => generateYaml({ ...defaults, tone: 'a'.repeat(251) })).toThrow();
    expect(() => generateYaml({ ...defaults, linkedRepositories: [{ repository: 'https://github.com/org/repo', instructions: '' }] })).toThrow();
  });
  it('allows nested GitLab paths and enforces linked instruction length', () => {
    expect(buildConfig({ ...defaults, platform: 'gitlab', linkedRepositories: [{ repository: 'group/subgroup/repo', instructions: 'API consumer' }] }).knowledge_base.linked_repositories).toHaveLength(1);
    expect(() => buildConfig({ ...defaults, linkedRepositories: [{ repository: 'org/repo', instructions: 'x'.repeat(2001) }] })).toThrow();
  });
});

describe('local drafts', () => {
  it('restores incomplete rows without losing the other answers', () => {
    const draft = { ...defaults, repository: 'org/app', pathInstructions: [{ path: '', instructions: '' }] };
    expect(readDraft({ getItem: () => JSON.stringify(draft) })).toEqual(draft);
  });
  it('recovers from malformed, incompatible, or unavailable storage', () => {
    for (const value of ['{bad json', '{"profile":"invalid"}', 'null']) expect(readDraft({ getItem: () => value })).toEqual(defaults);
    expect(readDraft({ getItem: () => { throw Error('blocked'); } })).toEqual(defaults);
    expect(saveDraft({ setItem: () => { throw Error('quota'); } }, defaults)).toBe(false);
  });
});
