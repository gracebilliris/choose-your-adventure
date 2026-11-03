import type { Passage, Story, StoryIssue } from './types';

export const STORAGE_KEY = 'branchlight.story.v1';
export const MAX_JSON_BYTES = 200 * 1024;
export const MAX_SHARE_LENGTH = 16_000;
export const MAX_PASSAGES = 200;
export const MAX_CHOICES = 20;
export const MAX_HISTORY_LENGTH = 500;
export const MAX_ID_LENGTH = 100;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2_000;
export const MAX_BODY_LENGTH = 20_000;
export const MAX_CHOICE_TEXT_LENGTH = 500;

const encoder = new TextEncoder();

export function getReachableIds(story: Story): Set<string> {
  const passages = new Map(story.passages.map((passage) => [passage.id, passage]));
  const reachable = new Set<string>();
  const pending = [story.startId];
  while (pending.length) {
    const id = pending.pop()!;
    if (reachable.has(id)) continue;
    const passage = passages.get(id);
    if (!passage) continue;
    reachable.add(id);
    if (!passage.ending) pending.push(...passage.choices.map((choice) => choice.target));
  }
  return reachable;
}

export function validateStory(story: Story): StoryIssue[] {
  const issues: StoryIssue[] = [];
  const error = (message: string, passageId?: string) =>
    issues.push({ severity: 'error', message, ...(passageId !== undefined ? { passageId } : {}) });
  if (!story.title.trim()) error('The story title must not be empty.');
  if (!story.passages.length) error('The story needs at least one passage.');
  const ids = new Set<string>();
  for (const passage of story.passages) {
    if (!passage.id.trim()) error('Passage IDs must not be empty.', passage.id);
    if (ids.has(passage.id)) error(`Duplicate passage ID "${passage.id}".`, passage.id);
    ids.add(passage.id);
    if (!passage.title.trim()) error('The passage title must not be empty.', passage.id);
    const choiceIds = new Set<string>();
    for (const choice of passage.choices) {
      if (!choice.id.trim()) error('Choice IDs must not be empty.', passage.id);
      if (choiceIds.has(choice.id)) error(`Duplicate choice ID "${choice.id}".`, passage.id);
      choiceIds.add(choice.id);
      if (!choice.text.trim()) error('Choice text must not be empty.', passage.id);
      if (!choice.target.trim()) error('Choice targets must not be empty.', passage.id);
    }
    if (passage.ending && passage.choices.length) {
      error('An ending passage cannot have choices.', passage.id);
    }
    if (!passage.ending && !passage.choices.length) {
      issues.push({ severity: 'warning', message: 'This passage has no choices; mark it as an ending or add a choice.', passageId: passage.id });
    }
  }
  if (!story.startId.trim() || !ids.has(story.startId)) {
    error('The start passage must refer to an existing passage.');
  }
  const reachable = getReachableIds(story);
  for (const passage of story.passages) {
    for (const choice of passage.choices) {
      if (!ids.has(choice.target)) error(`Choice "${choice.text}" points to missing passage "${choice.target}".`, passage.id);
    }
    if (!reachable.has(passage.id)) {
      issues.push({ severity: 'warning', message: 'This passage is unreachable from the start.', passageId: passage.id });
    }
  }
  return issues;
}

function object(value: unknown, path: string, keys: string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new Error(`${path}.${key} is required.`);
  }
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) throw new Error(`${path} contains unsupported field "${key}".`);
  }
  return record;
}

function text(value: unknown, path: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string') throw new Error(`${path} must be a string.`);
  if (value.length > max) throw new Error(`${path} exceeds the ${max}-character limit.`);
  if (!allowEmpty && !value.trim()) throw new Error(`${path} must not be empty.`);
  return value;
}

function array(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  if (value.length > max) throw new Error(`${path} exceeds the limit of ${max} items.`);
  return value;
}

/** Imports are schema-checked; graph errors are rejected, but editorial warnings are allowed. */
export function parseStory(source: string, draft = false): Story {
  if (typeof source !== 'string') throw new Error('Story JSON must be text.');
  if (source.length > MAX_JSON_BYTES || encoder.encode(source).length > MAX_JSON_BYTES) {
    throw new Error(`Story JSON exceeds the ${MAX_JSON_BYTES}-byte limit.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('Invalid story JSON. Check commas, quotation marks, and brackets.');
  }
  const root = object(value, 'story', ['version', 'title', 'description', 'startId', 'passages']);
  if (root.version !== 1) throw new Error('Unsupported story version. Expected version 1.');
  const passages: Passage[] = array(root.passages, 'story.passages', MAX_PASSAGES).map((value, index) => {
    const path = `story.passages[${index}]`;
    const passage = object(value, path, ['id', 'title', 'body', 'ending', 'choices']);
    if (typeof passage.ending !== 'boolean') throw new Error(`${path}.ending must be a boolean.`);
    return {
      id: text(passage.id, `${path}.id`, MAX_ID_LENGTH),
      title: text(passage.title, `${path}.title`, MAX_TITLE_LENGTH, draft),
      body: text(passage.body, `${path}.body`, MAX_BODY_LENGTH, true),
      ending: passage.ending,
      choices: array(passage.choices, `${path}.choices`, MAX_CHOICES).map((value, index) => {
        const choicePath = `${path}.choices[${index}]`;
        const choice = object(value, choicePath, ['id', 'text', 'target']);
        return {
          id: text(choice.id, `${choicePath}.id`, MAX_ID_LENGTH),
          text: text(choice.text, `${choicePath}.text`, MAX_CHOICE_TEXT_LENGTH, draft),
          target: text(choice.target, `${choicePath}.target`, MAX_ID_LENGTH, draft),
        };
      }),
    };
  });
  const story: Story = {
    version: 1,
    title: text(root.title, 'story.title', MAX_TITLE_LENGTH, draft),
    description: text(root.description, 'story.description', MAX_DESCRIPTION_LENGTH, true),
    startId: text(root.startId, 'story.startId', MAX_ID_LENGTH, draft),
    passages,
  };
  const errors = validateStory(story).filter((issue) => issue.severity === 'error');
  if (!draft && errors.length) throw new Error(`Invalid story: ${errors.map((issue) => issue.message).join(' ')}`);
  return story;
}

export function exportStory(story: Story): string {
  const source = JSON.stringify(story, null, 2);
  parseStory(source);
  return source;
}

export function encodeShare(story: Story): string {
  // Compact JSON keeps links small while the regular export remains human-readable.
  const source = JSON.stringify(parseStory(JSON.stringify(story)));
  const bytes = encoder.encode(source);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const hash = `#story=${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
  if (hash.length > MAX_SHARE_LENGTH) {
    throw new Error(`Share link exceeds the ${MAX_SHARE_LENGTH}-character limit. Export a JSON file instead.`);
  }
  return hash;
}

export function decodeShare(hash: string): Story {
  if (typeof hash !== 'string' || hash.length > MAX_SHARE_LENGTH) {
    throw new Error(`Share link exceeds the ${MAX_SHARE_LENGTH}-character limit or is not text.`);
  }
  if (!/^#story=[A-Za-z0-9_-]+$/.test(hash)) throw new Error('Malformed share link. Expected #story= followed by base64url data.');
  const encoded = hash.slice(7);
  if (encoded.length % 4 === 1) throw new Error('Malformed share link: invalid base64url length.');
  let source: string;
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    // Reject noncanonical trailing bits instead of silently accepting corrupted data.
    if (btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== encoded) {
      throw new Error('Noncanonical base64url');
    }
    source = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    throw new Error('Malformed share link: invalid base64url or UTF-8 data.');
  }
  return parseStory(source);
}

export function saveStory(story: Story): void {
  const source = exportStory(story);
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    throw new Error('Unable to save this story. Browser storage may be full or unavailable. Export a JSON file to keep your work.');
  }
}

export function loadStory(): Story | null {
  try {
    const source = localStorage.getItem(STORAGE_KEY);
    return source === null ? null : parseStory(source);
  } catch {
    return null;
  }
}

export function deletePassage(story: Story, id: string): Story {
  const passages = story.passages
    .filter((passage) => passage.id !== id)
    .map((passage) => ({ ...passage, choices: passage.choices.filter((choice) => choice.target !== id) }));
  return {
    ...story,
    passages,
    startId: story.startId === id ? (passages[0]?.id ?? '') : story.startId,
  };
}

export function createBlankStory(): Story {
  return {
    version: 1,
    title: 'Untitled adventure',
    description: '',
    startId: 'opening',
    passages: [{ id: 'opening', title: 'The beginning', body: '', ending: false, choices: [] }],
  };
}

/** Revisits are allowed. Only the most recent 500 passage IDs are retained. */
export function advanceStory(story: Story, history: string[], choiceId: string): string[] {
  const currentId = history.length ? history[history.length - 1] : story.startId;
  const passage = story.passages.find((candidate) => candidate.id === currentId);
  if (!passage || passage.ending) return history;
  const choice = passage.choices.find((candidate) => candidate.id === choiceId);
  if (!choice || !story.passages.some((candidate) => candidate.id === choice.target)) return history;
  return [...(history.length ? history : [currentId]), choice.target].slice(-MAX_HISTORY_LENGTH);
}
