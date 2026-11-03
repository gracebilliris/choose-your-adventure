import { useEffect, useRef, useState } from 'react';
import type { Story } from './types';
import './editor.css';
import { MAX_HISTORY_LENGTH } from './story';

interface PlayerProps {
  story: Story;
}

interface Step {
  passageId: string;
  choiceText?: string;
}

export default function Player({ story }: PlayerProps) {
  const [journey, setJourney] = useState<{ story: Story; steps: Step[] }>({
    story,
    steps: [{ passageId: story.startId }],
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocus = useRef(false);
  // Use the new start immediately; the effect also discards the old history.
  const steps = journey.story === story ? journey.steps : [{ passageId: story.startId }];
  const current = story.passages.find((passage) => passage.id === steps[steps.length - 1]?.passageId);

  useEffect(() => {
    setJourney({ story, steps: [{ passageId: story.startId }] });
  }, [story]);

  useEffect(() => {
    if (shouldFocus.current) {
      headingRef.current?.focus();
      shouldFocus.current = false;
    }
  }, [journey]);

  function navigate(nextSteps: Step[]) {
    shouldFocus.current = true;
    setJourney({ story, steps: nextSteps });
  }

  function restart() {
    navigate([{ passageId: story.startId }]);
  }

  return (
    <main className="player-stage" aria-label="Story player">
      <div className="player-topline"><span className="player-edition">An interactive tale</span><span className="player-step">Passage {steps.length}</span></div>
      <article className="player-page">
        <div className="player-book-title">{story.title || 'An untitled adventure'}</div>
        <div className="player-flourish" aria-hidden="true">— ✧ —</div>
        {current ? <>
          <p className="player-eyebrow">{current.ending ? 'Every journey finds its ending' : steps.length === 1 ? 'Your story begins' : 'The adventure continues'}</p>
          <h1 ref={headingRef} tabIndex={-1} className="player-heading">{current.title || 'Untitled passage'}</h1>
          {current.body ? <div className="player-prose">{current.body}</div> : <p className="player-empty-text">This page is waiting for its story.</p>}
          {current.ending ? (
            <div className="player-ending"><span aria-hidden="true">◇</span><h2>The end</h2><p>One path ends. Another is waiting to be discovered.</p><button type="button" className="player-primary" onClick={restart}>Read again</button></div>
          ) : (
            <section className="player-choices" aria-label="Choose your path">
              {current.choices.length > 0 && <p className="player-choice-prompt">What will you do?</p>}
              {current.choices.map((choice, index) => {
                const valid = story.passages.some((passage) => passage.id === choice.target);
                return <div key={choice.id} className="player-choice-wrap"><button type="button" className="player-choice" disabled={!valid} aria-describedby={!valid ? `player-invalid-${choice.id}` : undefined} onClick={() => {
                  if (valid) navigate([...steps, { passageId: choice.target, choiceText: choice.text || 'Untitled choice' }].slice(-MAX_HISTORY_LENGTH));
                }}><span className="player-choice-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{choice.text || 'Untitled choice'}</span><span className="player-choice-arrow" aria-hidden="true">→</span></button>{!valid && <p className="player-choice-unavailable" id={`player-invalid-${choice.id}`}>This path needs a destination in the editor.</p>}</div>;
              })}
              {!current.choices.length && <p className="player-paused">The path pauses here. Go back to explore another choice, or add a path in the editor.</p>}
            </section>
          )}
        </> : (
          <div className="player-empty"><h1 ref={headingRef} tabIndex={-1} className="player-heading">{story.passages.length ? 'The beginning is missing' : 'A story waiting to happen'}</h1><p>{story.passages.length ? 'Choose a valid starting passage in the editor to begin your adventure.' : 'Add your first passage in the editor, then return to turn the page.'}</p></div>
        )}
        <footer className="player-navigation"><button type="button" disabled={steps.length <= 1} onClick={() => navigate(steps.slice(0, -1))}>← Back</button><span aria-hidden="true">✧</span><button type="button" onClick={restart} disabled={!current && !story.passages.some((passage) => passage.id === story.startId)}>Restart ↺</button></footer>
      </article>
      {steps.length > 1 && <details className="player-history"><summary>Your journey <span>{steps.length - 1} {steps.length === 2 ? 'choice' : 'choices'} made</span></summary><p>Up to the latest 500 passages are kept.</p><ol>{steps.map((step, index) => <li key={`${index}-${step.passageId}`}>{step.choiceText && <span className="player-history-choice">“{step.choiceText}” → </span>}<span>{story.passages.find((passage) => passage.id === step.passageId)?.title || 'Untitled passage'}</span>{index === steps.length - 1 && <span className="player-history-current"> · You are here</span>}</li>)}</ol></details>}
      <p className="player-colophon">The next chapter is yours.</p>
    </main>
  );
}
