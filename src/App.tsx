import { useEffect, useRef, useState } from 'react';
import Editor from './Editor';
import Player from './Player';
import { samples } from './samples';
import { createBlankStory, decodeShare, encodeShare, exportStory, loadStory, MAX_JSON_BYTES, parseStory, validateStory } from './story';
import type { Story } from './types';

const DRAFT_KEY = 'storyloom.draft.v1';

function initialStory(): { story: Story; notice: string; shared: boolean } {
  if (location.hash) {
    try { return { story: decodeShare(location.hash), notice: 'Shared adventure opened. Your saved draft is unchanged until you edit.', shared: true }; }
    catch (error) { return { story: readDraft(), notice: `${(error as Error).message} Your saved draft was kept.`, shared: false }; }
  }
  return { story: readDraft(), notice: '', shared: false };
}

function readDraft(): Story {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) return parseStory(saved, true);
  } catch { /* An unavailable or corrupt draft must not prevent opening the app. */ }
  return loadStory() ?? structuredClone(samples[0]);
}

export default function App() {
  const [initial] = useState(initialStory);
  const [story, setStory] = useState(initial.story);
  const [mode, setMode] = useState<'write' | 'play'>(initial.shared ? 'play' : 'write');
  const [notice, setNotice] = useState(initial.notice);
  const [saveState, setSaveState] = useState(initial.shared ? 'Shared story · not saved' : 'Saved on this device');
  const [changed, setChanged] = useState(false);
  const [undo, setUndo] = useState<Story[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const issues = validateStory(story);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const endings = story.passages.filter((passage) => passage.ending).length;

  useEffect(() => {
    function openHash() {
      if (!location.hash) return;
      try {
        const shared = decodeShare(location.hash);
        setChanged(false);
        setStory(shared);
        setUndo([]);
        setShareUrl('');
        setMode('play');
        setSaveState('Shared story · not saved');
        setNotice('Shared adventure opened. Your saved draft is unchanged until you edit.');
      } catch (error) {
        setNotice(`${(error as Error).message} Your story is unchanged.`);
      }
    }
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, []);

  useEffect(() => {
    if (!changed) return;
    try {
      const source = JSON.stringify(story);
      parseStory(source, true);
      localStorage.setItem(DRAFT_KEY, source);
      setSaveState('Saved on this device');
    } catch (error) {
      setSaveState(`Not saved · ${(error as Error).message}`);
    }
  }, [story, changed]);

  function update(next: Story) {
    setUndo((previous) => [...previous.slice(-29), story]);
    setStory(next);
    setChanged(true);
    setShareUrl('');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  function replace(next: Story) {
    if (!window.confirm('Replace the current story? You can undo this, or export your story first.')) return;
    update(structuredClone(next));
    setMode('write');
    setLibraryOpen(false);
    setNotice('A fresh adventure is ready. Make it your own.');
  }

  function download() {
    try {
      const url = URL.createObjectURL(new Blob([exportStory(story)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${story.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60) || 'adventure'}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Story exported. Keep this file as a portable backup.');
    } catch (error) { setNotice(`Cannot export: ${(error as Error).message}`); }
  }

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_JSON_BYTES) throw new Error('JSON files must be no larger than 200 KiB.');
      const next = parseStory(await file.text());
      replace(next);
    } catch (error) { setNotice(`Import failed: ${(error as Error).message} Your story is unchanged.`); }
    finally { if (importRef.current) importRef.current.value = ''; }
  }

  async function share() {
    try {
      const url = `${location.origin}${location.pathname}${encodeShare(story)}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setNotice('Share link copied. Anyone with the link can read and remix this snapshot.');
      } catch {
        setNotice('Your share link is ready below. Select and copy it to share this snapshot.');
      }
    } catch (error) { setNotice(`Cannot share: ${(error as Error).message}`); }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href={location.pathname} aria-label="Storyloom home"><span className="brand-mark" aria-hidden="true">S<span>✧</span></span><span>storyloom<small>EVERY CHOICE, A NEW CHAPTER</small></span></a>
        <div className="header-note"><span className="privacy-dot" /> No account. Just imagination.</div>
        <button className="new-story-button" onClick={() => replace(createBlankStory())}><span aria-hidden="true">＋</span> New story</button>
      </header>

      <section className="intro">
        <div><p className="eyebrow">YOUR VERY OWN BOOK OF POSSIBILITIES</p><h1>One story. <em>Infinite paths.</em></h1><p>Weave a world, leave a choice, and see where the story takes you.</p></div>
        <div className="intro-ornament" aria-hidden="true"><span>✦</span><i>write · wander · wonder</i><span>◇</span></div>
      </section>

      <section className="story-bar" aria-label="Story settings">
        <div className="story-identity"><label htmlFor="story-title">THE ADVENTURE</label><input id="story-title" aria-label="Story title" value={story.title} maxLength={200} onChange={(event) => update({ ...story, title: event.target.value })} /><input className="story-description" aria-label="Story description" placeholder="A little promise of the adventure ahead…" value={story.description} maxLength={2000} onChange={(event) => update({ ...story, description: event.target.value })} /></div>
        <div className="story-stats"><span><strong>{String(story.passages.length).padStart(2, '0')}</strong> passages</span><span><strong>{String(endings).padStart(2, '0')}</strong> endings</span></div>
      </section>

      <div className="workbench-toolbar">
        <div className="mode-tabs" role="group" aria-label="Workspace mode"><button aria-pressed={mode === 'write'} onClick={() => setMode('write')}><span aria-hidden="true">✎</span> Write</button><button aria-pressed={mode === 'play'} onClick={() => setMode('play')}><span aria-hidden="true">▷</span> Play</button></div>
        <div className="tools">
          <button disabled={!undo.length} onClick={() => {
            const previous = undo[undo.length - 1];
            if (previous) { setStory(previous); setUndo(undo.slice(0, -1)); setChanged(true); setShareUrl(''); }
          }}>↶ Undo</button>
          <button aria-expanded={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)}>Sample stories</button>
          <button onClick={() => importRef.current?.click()}>Import JSON</button>
          <button onClick={download}>Export JSON</button>
          <button className="share-button" onClick={share}>Share story <span aria-hidden="true">↗</span></button>
        </div>
        <input ref={importRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import story file" onChange={(event) => void importFile(event.target.files?.[0])} />
      </div>

      {libraryOpen && <section className="sample-library" aria-label="Sample adventures"><div><p className="eyebrow">A LITTLE INSPIRATION</p><h2>Borrow a beginning. Make it yours.</h2><p>Two original adventures, with more than one way home.</p></div>{samples.map((sample, index) => <button key={sample.title} onClick={() => replace(sample)}><span className="sample-symbol" aria-hidden="true">{index === 0 ? '☽' : '❧'}</span><strong>{sample.title}</strong><span>{sample.description}</span><small>{sample.passages.length} passages · {sample.passages.filter((passage) => passage.ending).length} endings →</small></button>)}</section>}
      {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
      {shareUrl && <div className="share-panel"><label htmlFor="share-link">Snapshot link · text is included in the URL, not encrypted</label><input id="share-link" value={shareUrl} readOnly onFocus={(event) => event.target.select()} /><small>Edits after sharing don’t change this link. Large stories? Export JSON instead.</small></div>}

      <div className="workspace-caption"><span>{mode === 'write' ? 'THE WRITING DESK' : 'THE READING ROOM'}</span><span className={errors.length ? 'status-warning' : ''}>{errors.length ? `${errors.length} ${errors.length === 1 ? 'link or story issue' : 'link or story issues'} to resolve` : '✧ All paths connected'}</span></div>
      {mode === 'write' ? <Editor story={story} onChange={update} issues={issues} /> : <Player story={story} />}
      <footer className="app-footer"><span className="save-status"><span aria-hidden="true">◉</span> {saveState}</span><span>Made for the stories only you can tell. <span aria-hidden="true">✧</span></span><a href="https://github.com/gracebilliris/choose-your-adventure" target="_blank" rel="noreferrer">About & guide ↗</a></footer>
    </div>
  );
}
