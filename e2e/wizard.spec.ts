import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { validateConfig } from '../src/config';

const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Configuration steps' }).getByRole('button', { name, exact: true });
const downloadButton = (page: Page) => page.getByRole('button', { name: 'Download ↓', exact: true });
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => {
      document.documentElement.dataset.cspViolation = e.violatedDirective;
    });
  });
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
  await expect(page.locator('html')).not.toHaveAttribute('data-csp-violation');
});

test('walks all seven sections and downloads exactly the schema-validated preview', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  await page.getByLabel('Which repository are you setting up?', { exact: true }).fill('acme/orders');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await page.getByRole('radio').first().check();
  await page.getByLabel('How should feedback sound?', { exact: true }).fill('State impact first; propose a concrete fix.');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await page.getByLabel('Which files should reviews include or skip?', { exact: true }).fill('!dist/**\n!dist/**\nsrc/**');
  await page.getByRole('button', { name: '+ Add rule', exact: true }).click();
  await page.getByLabel('Path pattern 1', { exact: true }).fill('src/api/**');
  await page.getByLabel('Review checks 1', { exact: true }).fill('Preserve response fields: clients upgrade independently.\nTreat this as text: reviews: { profile: assertive }');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await page.getByRole('button', { name: '+ Add source', exact: true }).click();
  await page.getByLabel('Guideline source 1', { exact: true }).fill('acme/standards:guidelines/api.md');
  await page.getByLabel('Apply to 1 (optional)', { exact: true }).fill('src/api/**');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await page.getByRole('button', { name: '+ Link repo', exact: true }).click();
  await page.getByLabel('Repository 1', { exact: true }).fill('acme/client');
  await page.getByLabel('Cross-repository context 1', { exact: true }).fill('Consumes the orders API. Check response compatibility.');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await page.getByLabel('Additional target branches', { exact: true }).fill('^release/.*$');
  await page.getByRole('button', { name: 'Continue →' }).click();
  await expect(page.getByRole('heading', { name: 'Export', exact: true })).toBeFocused();
  const preview = await page.getByRole('complementary', { name: 'Live YAML preview' }).locator('pre').innerText();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: '↓ Download .coderabbit.yaml', exact: true }).click();
  const download = await pending;
  // Chromium sanitizes leading dots from download names on some platforms.
  expect(download.suggestedFilename()).toMatch(/^\.?coderabbit\.yaml$/);
  expect(await readFile((await download.path())!, 'utf8')).toBe(preview);
  const config = parse(preview); expect(validateConfig(config)).toEqual([]);
  expect(config.reviews.profile).toBe('quiet'); expect(config.reviews.path_filters).toEqual(['!dist/**', 'src/**']);
  expect(config.knowledge_base.code_guidelines.filePatterns).toEqual([{ files: 'acme/standards:guidelines/api.md', applyTo: 'src/api/**' }]);
  expect(config.knowledge_base.linked_repositories[0].repository).toBe('acme/client');
  expect(preview).not.toContain('acme/orders'); expect(preview).not.toContain('row-');
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});

test('recovers incomplete rows and invalid scalar values after refresh and links errors to fields', async ({ page }) => {
  await nav(page, 'Profile & tone').click();
  await page.getByLabel('How should feedback sound?', { exact: true }).fill('x'.repeat(251));
  await nav(page, 'Scope & paths').click(); await page.getByRole('button', { name: '+ Add rule', exact: true }).click();
  await page.getByLabel('Path pattern 1', { exact: true }).fill('src/auth/**');
  await nav(page, 'Coding guidelines').click(); await page.getByRole('button', { name: '+ Add source', exact: true }).click();
  await nav(page, 'Linked repositories').click(); await page.getByRole('button', { name: '+ Link repo', exact: true }).click();
  await nav(page, 'Automation & output').click(); await page.getByLabel('Additional target branches', { exact: true }).fill('[');
  await page.reload(); await expect(page.getByText('Restored your local draft, including unfinished rows.')).toBeVisible();
  await expect(downloadButton(page)).toBeDisabled(); await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /^Path rule 1: Explain/ }).click();
  await expect(page.getByLabel('Review checks 1', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Path pattern 1', { exact: true })).toHaveValue('src/auth/**');
  await expect(page.getByLabel('Review checks 1', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  const errorId = await page.getByLabel('Review checks 1', { exact: true }).getAttribute('aria-describedby');
  expect(errorId).toContain('field-pathInstructions-0-instructions-error');
  await page.getByRole('button', { name: /^Feedback tone:/ }).click();
  await expect(page.getByLabel('How should feedback sound?', { exact: true })).toHaveValue('x'.repeat(251));
  await expect(page.getByLabel('How should feedback sound?', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: /^Target branches:/ }).click(); await expect(page.getByLabel('Additional target branches', { exact: true })).toHaveValue('[');
});

test('supports keyboard navigation, row identity, add/remove focus, and radios', async ({ page }) => {
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to questions' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.getByRole('heading', { name: 'Repository', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Continue →' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Profile & tone', exact: true })).toBeFocused();
  await page.getByRole('radio').first().focus(); await page.keyboard.press('ArrowDown'); await expect(page.getByRole('radio').nth(1)).toBeChecked();
  await nav(page, 'Scope & paths').focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '+ Add rule', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Path pattern 1', { exact: true })).toBeFocused();
  await page.getByLabel('Path pattern 1', { exact: true }).fill('first/**');
  await page.getByRole('button', { name: '+ Add rule', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Path pattern 2', { exact: true })).toBeFocused();
  await page.getByLabel('Path pattern 2', { exact: true }).fill('second/**');
  const node = await page.getByLabel('Path pattern 2', { exact: true }).elementHandle();
  await page.getByRole('button', { name: 'Remove rule 1', exact: true }).focus(); await page.keyboard.press('Enter');
  expect(await node!.evaluate(el => el.isConnected && el === document.activeElement)).toBe(true);
  await expect(page.getByLabel('Path pattern 1', { exact: true })).toHaveValue('second/**');
  await page.getByRole('button', { name: 'Remove rule 1', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '+ Add rule', exact: true })).toBeFocused();
});

test('handles storage and clipboard failure without losing generation', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } });
  });
  await page.reload();
  await expect(page.getByText(/Draft saving unavailable/)).toBeVisible();
  await expect(page.getByText(/saved draft could not be read/)).toBeVisible();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Clipboard unavailable. Use Download YAML or select the preview text.')).toBeVisible();
  await expect(downloadButton(page)).toBeEnabled();
});

test('copies exactly the preview when clipboard is available', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => { document.documentElement.dataset.copied = value; } } }));
  await page.reload(); await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Configuration copied.', { exact: true })).toBeVisible();
  expect(await page.locator('html').getAttribute('data-copied')).toBe(await page.locator('pre').innerText());
});

test('reset confirmation supports cancel and confirmed reset persists', async ({ page }) => {
  await page.getByLabel('Which repository are you setting up?', { exact: true }).fill('keep/me');
  await page.getByRole('button', { name: 'Reset draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Yes, reset', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('button', { name: 'Reset draft', exact: true })).toBeFocused();
  await expect(page.getByLabel('Which repository are you setting up?', { exact: true })).toHaveValue('keep/me');
  await page.getByRole('button', { name: 'Reset draft', exact: true }).click(); await page.getByRole('button', { name: 'Yes, reset', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Repository', exact: true })).toBeFocused();
  await page.reload(); await expect(page.getByLabel('Which repository are you setting up?', { exact: true })).toHaveValue('');
});

test('validates platform paths, duplicates, and guideline scoping independently', async ({ page }) => {
  await nav(page, 'Linked repositories').click(); await page.getByRole('button', { name: '+ Link repo', exact: true }).click();
  await page.getByLabel('Repository 1', { exact: true }).fill('group/subgroup/api'); await expect(downloadButton(page)).toBeDisabled();
  await nav(page, 'Repository').click(); await page.getByLabel('Where is the repository hosted?', { exact: true }).selectOption('gitlab');
  await expect(downloadButton(page)).toBeEnabled();
  await nav(page, 'Linked repositories').click(); await page.getByRole('button', { name: '+ Link repo', exact: true }).click();
  await page.getByLabel('Repository 2', { exact: true }).fill('group/subgroup/api'); await expect(page.getByLabel('Repository 2', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Remove repository 2', exact: true }).click();
  await nav(page, 'Coding guidelines').click(); await page.getByRole('button', { name: '+ Add source', exact: true }).click();
  await page.getByLabel('Guideline source 1', { exact: true }).fill('org/repo:../secret.md'); await expect(downloadButton(page)).toBeDisabled();
  await page.getByLabel('Use coding guideline documents', { exact: true }).uncheck(); await expect(downloadButton(page)).toBeEnabled();
  await page.reload(); await nav(page, 'Coding guidelines').click(); await page.getByLabel('Use coding guideline documents', { exact: true }).check();
  await expect(page.getByLabel('Guideline source 1', { exact: true })).toHaveValue('org/repo:../secret.md'); await expect(downloadButton(page)).toBeDisabled();
});

test('fits every step at its viewport and keeps errors and storage state visible', async ({ page }) => {
  for (const name of ['Repository', 'Profile & tone', 'Scope & paths', 'Coding guidelines', 'Linked repositories', 'Automation & output', 'Export']) {
    await nav(page, name).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText('● Draft saved locally', { exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await nav(page, 'Linked repositories').click(); await page.getByRole('button', { name: '+ Link repo', exact: true }).click();
  await page.getByLabel('Repository 1', { exact: true }).fill('x'.repeat(120) + '/api');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('works offline after loading without transmitting answers', async ({ page, context }) => {
  await context.setOffline(true); await nav(page, 'Scope & paths').click(); await page.getByRole('button', { name: '+ Add rule', exact: true }).click();
  await page.getByLabel('Path pattern 1', { exact: true }).fill('src/private/**'); await page.getByLabel('Review checks 1', { exact: true }).fill('Keep this instruction on the device.');
  await expect(page.getByText('✓ Schema validated', { exact: true })).toBeVisible(); await expect(downloadButton(page)).toBeEnabled();
  expect(validateConfig(parse(await page.locator('pre').innerText()))).toEqual([]);
});
