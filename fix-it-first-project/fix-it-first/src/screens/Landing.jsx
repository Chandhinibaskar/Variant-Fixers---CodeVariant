import React from 'react';
import { useStore } from '../store.jsx';
import { OPTIONS, OPTION_ORDER, EXAMPLES } from '../config.js';
import { DragCard, ActionZone, Dock } from '../dnd.jsx';
import { CanvasBanner } from '../components_canvas.jsx';

export default function Landing({ go }) {
  const { state, dispatch } = useStore();

  const runExample = (ex) => {
    dispatch({ type: 'reset' });
    dispatch({ type: 'load', data: { item: ex.item, problem: ex.problem, ctx: ex.ctx, currentId: null,
      prefs: { mode: 'balanced', budgetCap: false, excluded: [], importance: { cost: 5, effort: 5, eco: 5, keep: ex.ctx.sentiment * 2 } } } });
    go('results');
  };
  const startNew = () => { dispatch({ type: 'reset' }); go('item'); };
  const resume = () => go('item');

  return (
    <div className="landing">
      <CanvasBanner />
      <section className="hero">
        <p className="eyebrow">A guided triage for broken things</p>
        <h1>Don't bin it.<br /><em>Decide it.</em></h1>
        <p className="lead">
          Most broken things get binned because nobody knows the next step. Fix It First weighs
          <strong> all five options</strong> — repair, reuse, repurpose, replace, recycle — ranks them for your situation and tells you exactly why.
        </p>
        <p className="tiny muted">Takes about a minute · No account · Nothing leaves your device</p>
      </section>

      <section className="stage" aria-label="Start here">
        <h2 className="h3">Start here: pick up a card</h2>
        <div className="card-row">
          <DragCard payload={{ kind: 'start' }} meta={{ icon: '🧰', label: 'My broken thing' }} className="big-card" hint="drag me ↓">
            <span className="big-ico" aria-hidden>🧰</span>
            <b>My broken thing</b>
            <small>Drop into <em>Start triage</em> to begin from scratch</small>
          </DragCard>
          {state.item.name && (
            <DragCard payload={{ kind: 'resume' }} meta={{ icon: '▶️', label: `Continue ${state.item.name}` }} className="big-card alt">
              <span className="big-ico" aria-hidden>▶️</span>
              <b>Continue “{state.item.name}”</b>
              <small>Pick up where you left off</small>
            </DragCard>
          )}
        </div>

        <h2 className="h3 sub">Or try an example</h2>
        <div className="card-row">
          {EXAMPLES.map((ex) => (
            <DragCard key={ex.label} payload={{ kind: 'example', ex }} meta={{ icon: ex.icon, label: ex.label }} className="ex-card2">
              <span className="ex-ico" aria-hidden>{ex.icon}</span><span>{ex.label}</span>
            </DragCard>
          ))}
        </div>
      </section>

      <section className="gap" aria-labelledby="gap-h">
        <h2 id="gap-h" className="sr-only">The gap</h2>
        <div className="gap-grid">
          <div className="gap-card">
            <span className="tag">What people see</span>
            <div className="pill-row"><span className="pill">Fix it</span><span className="pill">Bin it</span></div>
            <p>Two options, and “buy new” quietly wins.</p>
          </div>
          <div className="gap-card ok">
            <span className="tag">What actually exists</span>
            <div className="pill-row">
              {OPTION_ORDER.map((id) => <span key={id} className="pill" style={{ '--c': OPTIONS[id].color }}>{OPTIONS[id].icon} {OPTIONS[id].label}</span>)}
            </div>
            <p>Five real choices, compared on cost, effort, safety, sentiment and impact.</p>
          </div>
        </div>
      </section>

      <Dock>
        <ActionZone id="start" icon="🚀" title="Start triage" hint="Drop “My broken thing” or Continue here" accepts={['start', 'resume']}
          onDrop={(p) => (p.kind === 'start' ? startNew() : resume())} />
        <ActionZone id="example" icon="⚡" title="Run example" hint="Drop an example to see results instantly" accepts={['example']} tone="amber"
          onDrop={(p) => runExample(p.ex)} />
      </Dock>
    </div>
  );
}
