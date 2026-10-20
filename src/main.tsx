import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { answersSchema, defaults, generateYaml, readDraft, saveDraft, type Answers } from './config';
import './style.css';

const steps = ['Repository', 'Profile & tone', 'Scope & paths', 'Coding guidelines', 'Linked repositories', 'Automation & output', 'Export'];
const descriptions = [
  'Start with the settings this repository should own.',
  'Decide how much feedback helps your team, and how it should sound.',
  'Tell the reviewer where to look and what matters there.',
  'Point to the standards your team already maintains.',
  'Make the boundaries between repositories visible.',
  'Choose when reviews run and what they leave behind.',
  'A considered starting point. Ready for your first pull request.',
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>;
}
function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="toggle"><div><strong>{label}</strong><small>{hint}</small></div><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /></label>;
}
function App() {
  const [a, setA] = useState<Answers>(() => { try { return readDraft(localStorage); } catch { return structuredClone(defaults); } });
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(true);
  const [message, setMessage] = useState('');
  const [resetting, setResetting] = useState(false);
  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => setA(prev => ({ ...prev, [key]: value }));
  useEffect(() => { try { setSaved(saveDraft(localStorage, a)); } catch { setSaved(false); } }, [a]);
  const result = answersSchema.safeParse(a);
  const yaml = result.success ? generateYaml(result.data) : '';
  const errors = result.success ? [] : result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  function download() {
    if (!yaml) return;
    const url = URL.createObjectURL(new Blob([yaml], { type: 'application/yaml;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = '.coderabbit.yaml'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Downloaded .coderabbit.yaml');
  }
  async function copy() {
    try { await navigator.clipboard.writeText(yaml); setMessage('Configuration copied.'); }
    catch { setMessage('Clipboard unavailable. Use Download YAML or select the preview text.'); }
  }
  return <div className="app">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-icon">r.</span><span>rabbit<span className="brand-light">config</span></span></a>
      <p className="eyebrow">A BETTER FIRST REVIEW</p>
      <nav aria-label="Configuration steps">{steps.map((s, i) => <button key={s} className={i === step ? 'nav-item active' : 'nav-item'} aria-current={i === step ? 'step' : undefined} onClick={() => { setStep(i); setMessage(''); }}><span className="step-number">{String(i + 1).padStart(2, '0')}</span>{s}{i === step && <span className="nav-arrow">↗</span>}</button>)}</nav>
      <div className="sidebar-bottom"><span className="privacy-dot" /> Your answers stay in this browser.<small>No account. No API key. Self-hostable.</small><a href="https://docs.coderabbit.ai/reference/configuration" target="_blank" rel="noreferrer">CodeRabbit configuration docs ↗</a><p>Independent community tool.</p></div>
    </aside>
    <main>
      <header className="topbar"><span>Configuration studio <span className="slash">/</span> <strong>{a.repository || 'New repository'}</strong></span><span className="save-state">{saved ? '● Draft saved locally' : 'Draft saving unavailable'}</span></header>
      <div className="workspace">
        <section className="questionnaire" aria-label="Questionnaire">
          <div className="section-header"><span className="eyebrow">STEP {String(step + 1).padStart(2, '0')} / 07</span><h1>{steps[step]}</h1><p>{descriptions[step]}</p></div>
          {step === 0 && <>
            <Field label="Which repository are you setting up?" hint="A label for your draft. No code is fetched and this name is not exported."><input value={a.repository} maxLength={200} placeholder="your-org/your-repository" onChange={e => update('repository', e.target.value)} /></Field>
            <div className="question-card"><Toggle label="Inherit shared settings" hint="Use parent configuration for settings you leave unspecified. Your explicit answers override inherited values." checked={a.inheritance} onChange={v => update('inheritance', v)} /><p className="note">If you turn this off, unspecified options use CodeRabbit defaults. With inheritance enabled, parent list entries can also be merged into your lists.</p></div>
            <div className="callout"><span>↗</span><div><strong>Start with intent.</strong><p>A few specific rules are more useful than a long list of generic advice. You can skip any section and revisit it.</p></div></div>
          </>}
          {step === 1 && <>
            <fieldset><legend>How much feedback is useful?</legend><div className="profiles">{([
              ['quiet', 'Quiet', 'Keep the most important feedback inline; group other comments in the summary.'],
              ['chill', 'Balanced', 'A practical balance of useful feedback and review noise.'],
              ['assertive', 'Thorough', 'More feedback, including details that may feel nitpicky.'],
            ] as const).map(([value, label, text]) => <label key={value} className={'profile ' + (a.profile === value ? 'selected' : '')}><input type="radio" name="profile" value={value} checked={a.profile === value} onChange={() => update('profile', value)} /><strong>{label}</strong><small>{text}</small><code>{value}</code></label>)}</div></fieldset>
            <Field label="How should feedback sound?" hint="Describe communication style. Put technical rules in path instructions or guideline documents."><textarea value={a.tone} rows={4} maxLength={250} onChange={e => update('tone', e.target.value)} /><small className="counter">{a.tone.length} / 250</small></Field>
          </>}
          {step === 2 && <>
            <Field label="Which files should reviews include or skip?" hint="One glob per line. Prefix exclusions with ! (for example !dist/**). Leave blank for CodeRabbit defaults; positive patterns narrow scope."><textarea className="mono" rows={4} placeholder={'!dist/**\n!coverage/**\n!**/*.generated.ts'} value={a.pathFilters} onChange={e => update('pathFilters', e.target.value)} /></Field>
            <div className="row-heading"><h2>What must be true in a specific path?</h2><button className="secondary" onClick={() => update('pathInstructions', [...a.pathInstructions, { path: '', instructions: '' }])}>+ Add rule</button></div>
            {!a.pathInstructions.length && <p className="empty">Add guidance for API handlers, migrations, tests, or other areas where your team has specific expectations.</p>}
            {a.pathInstructions.map((rule, i) => <div className="question-card" key={i}><Field label={`Path pattern ${i + 1}`}><input className="mono" value={rule.path} placeholder="src/api/**" onChange={e => update('pathInstructions', a.pathInstructions.map((r, n) => n === i ? { ...r, path: e.target.value } : r))} /></Field><Field label="What should the reviewer check, and why?"><textarea rows={4} value={rule.instructions} maxLength={20000} placeholder="Verify every handler checks tenant membership before reading a record. Cross-tenant reads expose customer data." onChange={e => update('pathInstructions', a.pathInstructions.map((r, n) => n === i ? { ...r, instructions: e.target.value } : r))} /></Field><button className="text-button" onClick={() => update('pathInstructions', a.pathInstructions.filter((_, n) => n !== i))}>Remove rule {i + 1}</button></div>)}
          </>}
          {step === 3 && <>
            <Toggle label="Use coding guideline documents" hint="CodeRabbit auto-discovers standard files such as AGENTS.md and CLAUDE.md. Add custom sources below." checked={a.guidelinesEnabled} onChange={v => update('guidelinesEnabled', v)} />
            {a.guidelinesEnabled && <><div className="row-heading"><h2>Where do your standards live?</h2><button className="secondary" onClick={() => update('guidelines', [...a.guidelines, { files: '', applyTo: '' }])}>+ Add source</button></div><p className="note">Local documents apply to their directory and descendants. Use “Apply to” to map a document in docs/ to source code. Shared sources can use org/standards:guidelines/**/*.md.</p>
              {a.guidelines.map((g, i) => <div className="question-card" key={i}><Field label={`Guideline source ${i + 1}`}><input className="mono" value={g.files} placeholder="docs/engineering.md" onChange={e => update('guidelines', a.guidelines.map((r, n) => n === i ? { ...r, files: e.target.value } : r))} /></Field><Field label="Apply to (optional)" hint="Source file glob, for example src/**/*.ts. Blank uses default scoping."><input className="mono" value={g.applyTo} onChange={e => update('guidelines', a.guidelines.map((r, n) => n === i ? { ...r, applyTo: e.target.value } : r))} /></Field><button className="text-button" onClick={() => update('guidelines', a.guidelines.filter((_, n) => n !== i))}>Remove source {i + 1}</button></div>)}
            </>}
          </>}
          {step === 4 && <>
            <div className="callout"><span>⇄</span><div><strong>Link dependencies with a reason.</strong><p>Which repo consumes an API, schema, or shared type that this repo can change? Linking provides context; it does not grant access.</p></div></div>
            <p className="note">CodeRabbit needs read access. Repositories must use the same Git platform; GitHub Cloud links must stay in the same organization. Active link counts depend on your CodeRabbit plan.</p>
            <div className="row-heading"><h2>Related repositories</h2><button className="secondary" disabled={a.linkedRepositories.length >= 20} onClick={() => update('linkedRepositories', [...a.linkedRepositories, { repository: '', instructions: '' }])}>+ Link repo</button></div>
            {a.linkedRepositories.map((r, i) => <div className="question-card" key={i}><Field label={`Repository ${i + 1}`}><input className="mono" value={r.repository} placeholder="your-org/backend" onChange={e => update('linkedRepositories', a.linkedRepositories.map((v, n) => n === i ? { ...v, repository: e.target.value } : v))} /></Field><Field label="What could break across this boundary?"><textarea rows={3} maxLength={2000} value={r.instructions} placeholder="Consumes the /orders API. Check response field names and status values for compatibility." onChange={e => update('linkedRepositories', a.linkedRepositories.map((v, n) => n === i ? { ...v, instructions: e.target.value } : v))} /></Field><button className="text-button" onClick={() => update('linkedRepositories', a.linkedRepositories.filter((_, n) => n !== i))}>Remove repository {i + 1}</button></div>)}
          </>}
          {step === 5 && <>
            <h2>When should CodeRabbit review?</h2>
            <Toggle label="Review automatically" hint="Start reviews automatically for eligible pull requests." checked={a.autoReview} onChange={v => update('autoReview', v)} />
            <Toggle label="Include draft pull requests" hint="Get feedback before a pull request is marked ready." checked={a.drafts} onChange={v => update('drafts', v)} />
            <Toggle label="Review new pushes" hint="Run incremental reviews as commits are added." checked={a.incremental} onChange={v => update('incremental', v)} />
            <Field label="Additional target branches" hint="One regular expression per line, e.g. release/.*. CodeRabbit always includes the default branch."><textarea className="mono" rows={2} value={a.baseBranches} onChange={e => update('baseBranches', e.target.value)} /></Field>
            <h2>What should a review include?</h2>
            {([
              ['summary', 'High-level summary', 'Summarize the pull request changes.'],
              ['sequenceDiagrams', 'Sequence diagrams', 'Illustrate interactions in the review walkthrough.'],
              ['poem', 'A review poem', 'Add a little personality to the walkthrough.'],
              ['autoReply', 'Automatic chat replies', 'Respond to review conversations automatically.'],
              ['webSearch', 'Web search context', 'Allow CodeRabbit to use web search during reviews.'],
            ] as const).map(([key, label, hint]) => <Toggle key={key} label={label} hint={hint} checked={a[key]} onChange={v => update(key, v)} />)}
          </>}
          {step === 6 && <>
            <div className="export-mark">↗</div><h2>Your first configuration, made intentional.</h2><p>Download the file and add it to the root of your repository. Review it in a pull request, then use <code>@coderabbitai configuration</code> to inspect the effective settings.</p>
            <div className="question-card"><strong>Before your first review</strong><ol><li>Commit <code>.coderabbit.yaml</code> at the repository root.</li><li>Confirm guideline paths exist and linked repositories are accessible.</li><li>Check your plan supports the selected features.</li><li>Adjust the rules after a few real reviews.</li></ol></div>
            <p className="note">This starter checks questionnaire types and documented length limits. Full validation against a pinned current upstream schema is still planned. It cannot verify your repository paths, permissions, plan, or inherited settings.</p>
            <button className="primary download" disabled={!yaml} onClick={download}>↓ Download .coderabbit.yaml</button>
          </>}
          {errors.length > 0 && <div className="errors" role="alert"><strong>Finish these fields to export:</strong><ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
          <footer className="step-footer"><button className="text-button" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button><span>{step + 1} of {steps.length}</span>{step < 6 ? <button className="primary" onClick={() => setStep(step + 1)}>Continue →</button> : <button className="secondary" onClick={() => setStep(0)}>Revisit answers</button>}</footer>
        </section>
        <aside className="preview" aria-label="Live YAML preview"><div className="preview-heading"><div><span className="eyebrow">YOUR CONFIGURATION</span><h2>.coderabbit.yaml</h2></div><span className="live"><span /> LIVE</span></div><div className="code-toolbar"><span>YAML</span><button disabled={!yaml} onClick={copy}>Copy</button></div><pre tabIndex={0}><code>{yaml || '# Finish the highlighted fields to preview your configuration.'}</code></pre><div className="preview-bottom"><span>{yaml ? '✓ Answers validated' : '○ Needs attention'}</span><button disabled={!yaml} onClick={download}>Download ↓</button></div><p className="preview-caption">Generated locally. Only the settings you see here are exported.</p></aside>
      </div>
      <div className="utility-bar"><span role="status">{message}</span>{resetting ? <span>Clear this draft? <button className="text-button" onClick={() => { setA(structuredClone(defaults)); setStep(0); setResetting(false); setMessage('Draft reset.'); }}>Yes, reset</button><button className="text-button" onClick={() => setResetting(false)}>Cancel</button></span> : <button className="text-button" onClick={() => setResetting(true)}>Reset draft</button>}</div>
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
