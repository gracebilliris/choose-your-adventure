export interface Choice {
  id: string;
  text: string;
  target: string;
}

export interface Passage {
  id: string;
  title: string;
  body: string;
  ending: boolean;
  choices: Choice[];
}

export interface Story {
  version: 1;
  title: string;
  description: string;
  startId: string;
  passages: Passage[];
}

export interface StoryIssue {
  severity: 'error' | 'warning';
  message: string;
  passageId?: string;
}
