import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Story } from './types';
import { samples } from './samples';
import {
  advanceStory,
  createBlankStory,
  decodeShare,
  deletePassage,
  encodeShare,
  exportStory,
  getReachableIds,
  loadStory,
  MAX_BODY_LENGTH,
  MAX_CHOICES,
  MAX_HISTORY_LENGTH,
  MAX_JSON_BYTES,
  MAX_PASSAGES,
  MAX_SHARE_LENGTH,
  parseStory,
  saveStory,
  STORAGE_KEY,
  validateStory,
} from './story';

function fixture(): Story {
  return {
    version: 1,
    title: 'The paper moon',
    description: 'A branching test adventure.',
    startId: 'start',
    passages: [
      {
        id: 'start', title: 'Start', body: 'Choose a path.', ending: false,
        choices: [{ id: 'go', text: 'Follow the moon', target: 'end' }],
      },
      { id: 'end', title: 'Home', body: 'You arrive.', ending: true, choices: [] },
    ],
  };
}

function errors(story: Story) {
  return validateStory(story).filter((issue) => issue.severity === 'error');
}

afterEach(() => vi.unstubAllGlobals());

describe('incomplete local drafts', () => {
  it('restores unfinished editor fields without weakening strict imports', () => {
    const story = fixture();
    story.title = '';
    story.passages[0].title = '';
    story.passages[0].choices[0] = { id: 'draft', text: '', target: '' };
    const source = JSON.stringify(story);
    expect(parseStory(source, true)).toEqual(story);
    expect(() => parseStory(source)).toThrow();
  });

  it('restores an empty story but keeps schema and size limits', () => {
    const story = { ...fixture(), startId: '', passages: [] };
    expect(parseStory(JSON.stringify(story), true)).toEqual(story);
    expect(() => parseStory(JSON.stringify({ ...story, unexpected: true }), true)).toThrow();
    expect(() => parseStory(' '.repeat(MAX_JSON_BYTES + 1), true)).toThrow();
  });
});

describe('validation and traversal', () => {
  it('accepts a connected adventure and both original samples', () => {
    for (const story of [fixture(), ...samples]) {
      expect(validateStory(story)).toEqual([]);
      expect(getReachableIds(story).size).toBe(story.passages.length);
      expect(parseStory(exportStory(story))).toEqual(story);
    }
    expect(samples.length).toBeGreaterThanOrEqual(2);
    expect(samples[0].title).toBe('The Lighthouse That Forgot the Sea');
    expect(samples[1].title).toBe('The Last Orchard in the Sky');
    for (const story of samples) {
      expect(story.passages.filter((passage) => passage.ending).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('reports dangling links with the source passage', () => {
    const story = fixture();
    story.passages[0].choices[0].target = 'missing';
    expect(errors(story)).toContainEqual(expect.objectContaining({
      passageId: 'start', message: expect.stringContaining('missing passage "missing"'),
    }));
    expect(getReachableIds(story)).toEqual(new Set(['start']));
  });

  it.each([
    ['story title', (story: Story) => { story.title = ' '; }],
    ['passage ID', (story: Story) => { story.passages[0].id = ''; }],
    ['passage title', (story: Story) => { story.passages[0].title = '\n'; }],
    ['choice ID', (story: Story) => { story.passages[0].choices[0].id = ''; }],
    ['choice text', (story: Story) => { story.passages[0].choices[0].text = ' '; }],
    ['choice target', (story: Story) => { story.passages[0].choices[0].target = ''; }],
    ['missing start', (story: Story) => { story.startId = 'absent'; }],
    ['empty start', (story: Story) => { story.startId = ''; }],
    ['no passages', (story: Story) => { story.passages = []; }],
  ])('reports an invalid %s', (_name, mutate) => {
    const story = fixture();
    mutate(story);
    expect(errors(story).length).toBeGreaterThan(0);
  });

  it('reports duplicate passage and local choice IDs', () => {
    const story = fixture();
    story.passages.push({ ...story.passages[1] });
    story.passages[0].choices.push({ ...story.passages[0].choices[0] });
    expect(errors(story).filter((issue) => issue.message.includes('Duplicate'))).toHaveLength(2);
  });

  it('allows the same choice ID in different passages', () => {
    const story = fixture();
    story.passages[1].ending = false;
    story.passages[1].choices = [{ id: 'go', text: 'Back', target: 'start' }];
    expect(errors(story)).toEqual([]);
    expect(getReachableIds(story)).toEqual(new Set(['start', 'end']));
  });

  it('warns about unreachable passages and unmarked dead ends', () => {
    const story = fixture();
    story.passages.push({ id: 'island', title: 'Island', body: '', ending: false, choices: [] });
    expect(validateStory(story)).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'warning', passageId: 'island', message: expect.stringContaining('unreachable') }),
      expect.objectContaining({ severity: 'warning', passageId: 'island', message: expect.stringContaining('no choices') }),
    ]));
    expect(errors(story)).toEqual([]);
    expect(parseStory(JSON.stringify(story))).toEqual(story);
  });

  it('rejects choices on endings and does not traverse them', () => {
    const story = fixture();
    story.passages[0].ending = true;
    expect(errors(story)[0].message).toContain('ending');
    expect(getReachableIds(story)).toEqual(new Set(['start']));
  });

  it('terminates on cycles including self-links', () => {
    const story = fixture();
    story.passages[0].choices.push({ id: 'loop', text: 'Wait', target: 'start' });
    story.passages[1].ending = false;
    story.passages[1].choices = [{ id: 'return', text: 'Return', target: 'start' }];
    expect(validateStory(story)).toEqual([]);
    expect(getReachableIds(story)).toEqual(new Set(['start', 'end']));
    expect(advanceStory(story, ['start'], 'loop')).toEqual(['start', 'start']);
    expect(advanceStory(story, ['start', 'end'], 'return')).toEqual(['start', 'end', 'start']);
  });
});

describe('strict bounded JSON import and export', () => {
  it.each(['', '{', 'null', '[]', '"a story"', '42', '{"version":1}'])('rejects malformed or incomplete JSON %j', (source) => {
    expect(() => parseStory(source)).toThrow(Error);
  });

  it.each([
    ['version', { version: 2 }],
    ['title', { title: 12 }],
    ['description', { description: null }],
    ['startId', { startId: [] }],
    ['passages', { passages: {} }],
    ['unsupported field', { script: 'ignored?' }],
  ])('explains an invalid root %s', (field, patch) => {
    expect(() => parseStory(JSON.stringify({ ...fixture(), ...patch }))).toThrow(new RegExp(field));
  });

  it.each([
    ['body', { body: 3 }],
    ['ending', { ending: 'false' }],
    ['choices', { choices: null }],
    ['title', { title: '' }],
    ['unsupported field', { html: '<script>no</script>' }],
  ])('explains an invalid passage %s', (field, patch) => {
    const story = fixture();
    Object.assign(story.passages[0], patch);
    expect(() => parseStory(JSON.stringify(story))).toThrow(new RegExp(field));
  });

  it.each([
    ['id', { id: null }],
    ['text', { text: [] }],
    ['target', { target: 1 }],
    ['text', { text: ' ' }],
  ])('explains an invalid choice %s', (field, patch) => {
    const story = fixture();
    Object.assign(story.passages[0].choices[0], patch);
    expect(() => parseStory(JSON.stringify(story))).toThrow(new RegExp(`choices\\[0\\].${field}`));
  });

  it('requires every field, including body and ending', () => {
    for (const field of ['body', 'ending', 'choices']) {
      const story = JSON.parse(JSON.stringify(fixture()));
      delete story.passages[0][field];
      expect(() => parseStory(JSON.stringify(story))).toThrow(`${field} is required`);
    }
  });

  it('rejects unsafe extra keys instead of merging them', () => {
    const source = JSON.stringify(fixture()).replace('"version":1', '"version":1,"__proto__":{"polluted":true}');
    expect(() => parseStory(source)).toThrow('unsupported field');
    expect(Object.hasOwn({}, 'polluted')).toBe(false);
  });

  it('rejects invalid graph errors but preserves harmless literal text', () => {
    const story = fixture();
    story.passages[0].body = '<script>alert("hello")</script> & "quotes"';
    expect(parseStory(exportStory(story)).passages[0].body).toBe(story.passages[0].body);
    story.passages[0].choices[0].target = 'missing';
    expect(() => parseStory(JSON.stringify(story))).toThrow('missing passage');
    expect(() => exportStory(story)).toThrow('missing passage');
  });

  it('bounds total UTF-8 bytes before parsing, including multibyte input', () => {
    expect(() => parseStory(' '.repeat(MAX_JSON_BYTES + 1))).toThrow('byte limit');
    expect(() => parseStory('🌙'.repeat(Math.floor(MAX_JSON_BYTES / 4) + 1))).toThrow('byte limit');
    const source = JSON.stringify(fixture());
    expect(parseStory(source + ' '.repeat(MAX_JSON_BYTES - source.length))).toEqual(fixture());
  });

  it('bounds passage count at 200', () => {
    const story = fixture();
    story.passages = Array.from({ length: MAX_PASSAGES }, (_, index) => ({
      id: index === 0 ? 'start' : `p${index}`, title: 'Room', body: '', ending: true, choices: [],
    }));
    expect(parseStory(JSON.stringify(story)).passages).toHaveLength(MAX_PASSAGES);
    story.passages.push({ ...story.passages[0], id: 'extra' });
    expect(() => parseStory(JSON.stringify(story))).toThrow('200');
  });

  it('bounds choices per passage at 20', () => {
    const story = fixture();
    story.passages[0].choices = Array.from({ length: MAX_CHOICES }, (_, index) => ({
      id: `c${index}`, text: 'Continue', target: 'end',
    }));
    expect(parseStory(JSON.stringify(story)).passages[0].choices).toHaveLength(MAX_CHOICES);
    story.passages[0].choices.push({ id: 'extra', text: 'More', target: 'end' });
    expect(() => parseStory(JSON.stringify(story))).toThrow('20 items');
  });

  it.each([
    ['title', 200],
    ['description', 2_000],
    ['startId', 100],
  ])('bounds story %s text', (field, max) => {
    expect(() => parseStory(JSON.stringify({ ...fixture(), [field]: 'x'.repeat(max + 1) }))).toThrow('character limit');
  });

  it.each([
    ['id', 100],
    ['title', 200],
    ['body', MAX_BODY_LENGTH],
  ])('bounds passage %s text', (field, max) => {
    const story = fixture();
    Object.assign(story.passages[0], { [field]: 'x'.repeat(max + 1) });
    expect(() => parseStory(JSON.stringify(story))).toThrow('character limit');
  });

  it.each([
    ['id', 100],
    ['text', 500],
    ['target', 100],
  ])('bounds choice %s text', (field, max) => {
    const story = fixture();
    Object.assign(story.passages[0].choices[0], { [field]: 'x'.repeat(max + 1) });
    expect(() => parseStory(JSON.stringify(story))).toThrow('character limit');
  });
});

describe('share links', () => {
  it('round-trips Unicode, emoji, punctuation, and both samples', () => {
    const story = fixture();
    story.title = '月の果樹園 🌿 — café';
    story.passages[0].body = '“Hello,” said the 海. مرحبًا\nA new line.';
    for (const candidate of [story, ...samples]) {
      const hash = encodeShare(candidate);
      expect(hash).toMatch(/^#story=[A-Za-z0-9_-]+$/);
      expect(decodeShare(hash)).toEqual(candidate);
    }
  });

  it.each(['', '#story=', '#story=A', '#story=@@@', '#story=YQ==', '#story=YQ&x=1', '#other=e30', '#story=YR', '#story=_w', '#story=e30'])(
    'rejects malformed, corrupted, invalid UTF-8, or non-story link %j',
    (hash) => expect(() => decodeShare(hash)).toThrow(Error),
  );

  it('rejects oversize links before decoding and offers file export', () => {
    expect(() => decodeShare(`#story=${'a'.repeat(MAX_SHARE_LENGTH)}`)).toThrow('limit');
    const story = fixture();
    story.passages[0].body = 'x'.repeat(MAX_BODY_LENGTH);
    expect(() => encodeShare(story)).toThrow('Export a JSON file');
    expect(() => exportStory(story)).not.toThrow();
  });
});

describe('browser storage', () => {
  it('saves and restores a validated story without altering it', () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => memory.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => memory.set(key, value)),
    });
    expect(loadStory()).toBeNull();
    const story = fixture();
    saveStory(story);
    expect(memory.has(STORAGE_KEY)).toBe(true);
    expect(loadStory()).toEqual(story);
    expect(localStorage.setItem).toHaveBeenCalledOnce();
  });

  it.each(['not JSON', '{}', JSON.stringify({ ...fixture(), version: 9 }), 'x'.repeat(MAX_JSON_BYTES + 1)])(
    'safely ignores malformed or oversize stored data',
    (value) => {
      vi.stubGlobal('localStorage', { getItem: () => value });
      expect(loadStory()).toBeNull();
    },
  );

  it('handles unavailable storage and explains save failures', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Blocked'); },
      setItem: () => { throw new Error('QuotaExceeded'); },
    });
    expect(loadStory()).toBeNull();
    expect(() => saveStory(fixture())).toThrow('Browser storage may be full or unavailable');
    vi.stubGlobal('localStorage', undefined);
    expect(loadStory()).toBeNull();
    expect(() => saveStory(fixture())).toThrow('Export a JSON file');
  });

  it('does not overwrite a saved story with an invalid import', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    const story = fixture();
    story.startId = 'missing';
    expect(() => saveStory(story)).toThrow('start passage');
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('editing and playback', () => {
  it('creates independent valid blank drafts', () => {
    const first = createBlankStory();
    const second = createBlankStory();
    expect(errors(first)).toEqual([]);
    expect(getReachableIds(first)).toEqual(new Set([first.startId]));
    first.passages[0].choices.push({ id: 'wait', text: 'Wait', target: first.startId });
    expect(second.passages[0].choices).toEqual([]);
  });

  it('deletes passages and incoming references immutably, assigning a new start', () => {
    const story = fixture();
    const original = JSON.stringify(story);
    const result = deletePassage(story, 'start');
    expect(result.startId).toBe('end');
    expect(result.passages.map((passage) => passage.id)).toEqual(['end']);
    const withoutEnd = deletePassage(story, 'end');
    expect(withoutEnd.startId).toBe('start');
    expect(withoutEnd.passages[0].choices).toEqual([]);
    expect(JSON.stringify(story)).toBe(original);
    expect(deletePassage(story, 'missing')).toEqual(story);
    expect(deletePassage(result, 'end')).toMatchObject({ startId: '', passages: [] });
  });

  it('advances from the start or an existing history without mutating it', () => {
    const story = fixture();
    const history = ['start'];
    expect(advanceStory(story, [], 'go')).toEqual(['start', 'end']);
    expect(advanceStory(story, history, 'go')).toEqual(['start', 'end']);
    expect(history).toEqual(['start']);
    expect(advanceStory(story, history, 'nope')).toBe(history);
    const invalid = ['missing'];
    expect(advanceStory(story, invalid, 'go')).toBe(invalid);
    const ending = ['start', 'end'];
    expect(advanceStory(story, ending, 'go')).toBe(ending);
    story.passages[0].choices[0].target = 'absent';
    expect(advanceStory(story, history, 'go')).toBe(history);
  });

  it('bounds cyclic playback to the most recent 500 entries', () => {
    const story = fixture();
    story.passages[0].choices[0].target = 'start';
    let history = ['start'];
    for (let i = 0; i < 1_000; i++) history = advanceStory(story, history, 'go');
    expect(history).toHaveLength(MAX_HISTORY_LENGTH);
    expect(history.every((id) => id === 'start')).toBe(true);
    const longHistory = Array.from({ length: 600 }, (_, index) => `old-${index}`);
    longHistory.push('start');
    const advanced = advanceStory(story, longHistory, 'go');
    expect(advanced).toEqual([...longHistory, 'start'].slice(-MAX_HISTORY_LENGTH));
  });
});
