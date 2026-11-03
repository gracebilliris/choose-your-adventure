import { useEffect, useRef, useState } from 'react';
import type { Choice, Passage, Story, StoryIssue } from './types';
import './editor.css';
import { deletePassage, MAX_PASSAGES, MAX_CHOICES } from './story';

interface EditorProps {
  story: Story;
  onChange: (story: Story) => void;
  issues: StoryIssue[];
}

function makeId() {
  return crypto.randomUUID();
}

function reachablePassages(story: Story) {
  const found = new Set<string>();
  const pending = [story.startId];
  const byId = new Map(story.passages.map((passage) => [passage.id, passage]));
  while (pending.length) {
    const id = pending.pop()!;
    if (found.has(id)) continue;
    const passage = byId.get(id);
    if (!passage) continue;
    found.add(id);
    if (!passage.ending) pending.push(...passage.choices.map((choice) => choice.target));
  }
  return found;
}

export default function Editor({ story, onChange, issues }: EditorProps) {
  const [selectedId, setSelectedId] = useState(story.startId);
  const [view, setView] = useState<'list' | 'map'>('list');
  const titleRef = useRef<HTMLInputElement>(null);
  const focusTitle = useRef(false);
  const selected = story.passages.find((passage) => passage.id === selectedId)
    ?? story.passages.find((passage) => passage.id === story.startId)
    ?? story.passages[0];
  const reachable = reachablePassages(story);
  const warnings: StoryIssue[] = [...issues];
  for (const passage of story.passages) {
    if (!reachable.has(passage.id) && !warnings.some((issue) =>
      issue.passageId === passage.id && /unreachable|cannot be reached/i.test(issue.message))) {
      warnings.push({ severity: 'warning', passageId: passage.id, message: 'Unreachable from the starting passage.' });
    }
    if (!passage.ending) {
      for (const choice of passage.choices) {
        if (!story.passages.some((destination) => destination.id === choice.target)
          && !warnings.some((issue) => issue.passageId === passage.id && /destination|target|link/i.test(issue.message))) {
          warnings.push({ severity: 'error', passageId: passage.id, message: 'A choice needs a valid destination.' });
        }
      }
    }
  }

  useEffect(() => {
    if (focusTitle.current) {
      titleRef.current?.focus();
      titleRef.current?.select();
      focusTitle.current = false;
    }
  }, [selected?.id]);

  function selectPassage(id: string) {
    focusTitle.current = true;
    setSelectedId(id);
    if (id === selected?.id) titleRef.current?.focus();
  }

  function updatePassage(update: Partial<Passage>) {
    if (!selected) return;
    onChange({
      ...story,
      passages: story.passages.map((passage) => passage.id === selected.id ? { ...passage, ...update } : passage),
    });
  }

  function addPassage() {
    if (story.passages.length >= MAX_PASSAGES) return;
    const passage: Passage = {
      id: makeId(),
      title: 'Untitled passage',
      body: '',
      ending: false,
      choices: [],
    };
    focusTitle.current = true;
    setSelectedId(passage.id);
    onChange({ ...story, startId: story.passages.length ? story.startId : passage.id, passages: [...story.passages, passage] });
  }

  function deleteSelected() {
    if (!selected) return;
    const next = deletePassage(story, selected.id);
    const passages = next.passages;
    const nextId = passages[Math.min(story.passages.indexOf(selected), passages.length - 1)]?.id ?? '';
    focusTitle.current = true;
    setSelectedId(nextId);
    onChange(next);
  }

  function updateChoice(id: string, update: Partial<Choice>) {
    if (selected) updatePassage({ choices: selected.choices.map((choice) => choice.id === id ? { ...choice, ...update } : choice) });
  }

  const endingCount = story.passages.filter((passage) => passage.ending).length;

  return (
    <div className="editor-workspace">
      <aside className="editor-sidebar" aria-label="Story passages">
        <div className="editor-sidebar-heading">
          <div><p className="editor-eyebrow">The story atlas</p><h2>Passages <span>{story.passages.length}</span></h2></div>
          <button type="button" className="editor-add-icon" disabled={story.passages.length >= MAX_PASSAGES} onClick={addPassage} aria-label="Create passage" title="Create passage">+</button>
        </div>
        <div className="editor-view-switch" role="group" aria-label="Passage view">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>Story map</button>
        </div>
        <nav className={`editor-node-list ${view === 'map' ? 'editor-node-map' : ''}`} aria-label="Select a passage">
          {story.passages.map((passage, index) => (
            <div className={`passage-node ${selected?.id === passage.id ? 'passage-node-selected' : ''}`} key={passage.id}>
              <button type="button" className="passage-node-button" aria-label={passage.title || 'Untitled passage'} aria-current={selected?.id === passage.id ? 'true' : undefined} onClick={() => selectPassage(passage.id)}>
                <span className="passage-node-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="passage-node-copy"><span className="passage-node-title">{passage.title || 'Untitled passage'}</span>
                  <span className="passage-node-meta">
                    {passage.id === story.startId ? 'Start' : passage.ending ? 'Ending' : `${passage.choices.length} ${passage.choices.length === 1 ? 'choice' : 'choices'}`}
                    {!reachable.has(passage.id) && <span className="passage-unreachable"> · Unreachable</span>}
                  </span>
                </span>
                <span className="passage-node-symbol" aria-hidden="true">{passage.ending ? '◇' : '→'}</span>
              </button>
              {view === 'map' && !passage.ending && (
                <div className="passage-map-links">
                  {passage.choices.length === 0 && <span>No paths yet</span>}
                  {passage.choices.map((choice) => {
                    const target = story.passages.find((node) => node.id === choice.target);
                    return target
                      ? <button type="button" key={choice.id} onClick={() => selectPassage(target.id)}><span aria-hidden="true">↳ </span>{choice.text || 'Untitled choice'} <span className="passage-map-target">→ {target.title || 'Untitled passage'}</span></button>
                      : <span className="passage-unreachable" key={choice.id}>↳ {choice.text || 'Untitled choice'} → Missing destination</span>;
                  })}
                </div>
              )}
            </div>
          ))}
          {!story.passages.length && <p className="editor-sidebar-empty">Every adventure begins with a single passage.</p>}
        </nav>
        <button type="button" className="editor-add-passage" disabled={story.passages.length >= MAX_PASSAGES} onClick={addPassage}><span aria-hidden="true">＋</span> Add passage</button>
        <div className="editor-atlas-footer"><span>{endingCount} {endingCount === 1 ? 'ending' : 'endings'}</span><span>{reachable.size} reachable</span></div>
      </aside>

      <main className="editor-main" aria-label="Passage editor">
        {selected ? (
          <section className="editor-paper" aria-labelledby="editor-passage-heading">
            <header className="editor-paper-header">
              <p className="editor-eyebrow">Chapter in the making</p>
              <button type="button" className="editor-delete" onClick={deleteSelected}>Delete passage</button>
            </header>
            <h2 id="editor-passage-heading" className="editor-section-heading">A turn in the tale</h2>
            <label className="editor-field-label" htmlFor="passage-title">Passage title</label>
            <input ref={titleRef} id="passage-title" maxLength={200} className="passage-title-input" value={selected.title} onChange={(event) => updatePassage({ title: event.target.value })} placeholder="Give this moment a name" />
            <div className="passage-flags">
              <label><input type="checkbox" checked={selected.id === story.startId} onChange={(event) => { if (event.target.checked) onChange({ ...story, startId: selected.id }); }} /> Starting passage</label>
              <label><input type="checkbox" checked={selected.ending} onChange={(event) => updatePassage({ ending: event.target.checked, ...(event.target.checked ? { choices: [] } : {}) })} /> Ending passage</label>
            </div>
            <label className="editor-field-label" htmlFor="passage-body">Passage text</label>
            <textarea id="passage-body" maxLength={20000} className="passage-body-input" value={selected.body} onChange={(event) => updatePassage({ body: event.target.value })} placeholder="The door opens. What lies on the other side?" />
            <div className="editor-body-footer"><span>Set the scene. Leave room for wonder.</span><span>{selected.body.trim() ? selected.body.trim().split(/\s+/).length : 0} words</span></div>
            <section className="choice-section" aria-labelledby="editor-choice-heading">
              <div className="choice-section-heading"><div><p className="editor-eyebrow">What happens next?</p><h3 id="editor-choice-heading">{selected.ending ? 'The story rests here' : 'Paths to follow'}</h3></div><span className="editor-ornament" aria-hidden="true">✧</span></div>
              {selected.ending && <p className="choice-hint">This is an ending. Marking an ending removes its outgoing choices; Undo restores them.</p>}
              {!selected.ending && !selected.choices.length && <p className="choice-hint">Offer your reader a choice, or mark this passage as an ending.</p>}
              {selected.choices.map((choice, index) => (
                <div className={`choice-card ${selected.ending ? 'choice-card-inactive' : ''}`} key={choice.id}>
                  <span className="choice-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div className="choice-fields">
                    <label className="editor-field-label" htmlFor={`choice-text-${choice.id}`}>Choice text {index + 1}</label>
                    <input id={`choice-text-${choice.id}`} maxLength={500} value={choice.text} placeholder="Follow the lanterns…" onChange={(event) => updateChoice(choice.id, { text: event.target.value })} />
                    <label className="editor-field-label choice-destination-label" htmlFor={`choice-target-${choice.id}`}>Choice destination {index + 1}</label>
                    <select id={`choice-target-${choice.id}`} value={story.passages.some((node) => node.id === choice.target) ? choice.target : ''} onChange={(event) => updateChoice(choice.id, { target: event.target.value })}>
                      <option value="">Choose a destination…</option>
                      {story.passages.map((passage) => <option key={passage.id} value={passage.id}>{passage.title || 'Untitled passage'}{passage.id === selected.id ? ' (this passage)' : ''}</option>)}
                    </select>
                  </div>
                  <button type="button" className="choice-remove" aria-label={`Delete choice ${index + 1}`} title={`Delete choice ${index + 1}`} onClick={() => updatePassage({ choices: selected.choices.filter((item) => item.id !== choice.id) })}>×</button>
                </div>
              ))}
              {!selected.ending && <button type="button" className="choice-add" disabled={selected.choices.length >= MAX_CHOICES} onClick={() => updatePassage({ choices: [...selected.choices, { id: makeId(), text: '', target: '' }] })}><span aria-hidden="true">＋</span> Add choice</button>}
            </section>
          </section>
        ) : (
          <section className="editor-empty"><span className="editor-empty-symbol" aria-hidden="true">✧</span><p className="editor-eyebrow">A blank page. Endless possibilities.</p><h2>Where will your story begin?</h2><p>Create your first passage, then let one choice lead to another.</p><button type="button" className="editor-primary" onClick={addPassage}>Create first passage</button></section>
        )}
        {warnings.length > 0 && <section className="editor-validation" aria-label="Story validation"><h3>Story notes <span>{warnings.length}</span></h3><ul>{warnings.map((issue, index) => <li key={`${issue.passageId}-${issue.message}-${index}`} className={`editor-issue-${issue.severity}`}><span className="editor-issue-severity">{issue.severity === 'error' ? 'Fix' : 'Note'}</span>{issue.passageId && story.passages.some((passage) => passage.id === issue.passageId) ? <button type="button" onClick={() => selectPassage(issue.passageId!)}>{story.passages.find((passage) => passage.id === issue.passageId)?.title || 'Untitled passage'}: {issue.message}</button> : <span>{issue.message}</span>}</li>)}</ul></section>}
      </main>
    </div>
  );
}
