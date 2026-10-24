import React from 'react';
import { useStore } from '../store.jsx';
import { OPTIONS, OPTION_ORDER, EXAMPLES } from '../config.js';

export default function Landing({ go }) {
  const { state, dispatch } = useStore();

  const loadExample = (ex) => {
    dispatch({ type: 'reset' });
    dispatch({ type: 'load', data: { item: ex.item, problem: ex.problem, ctx: ex.ctx, currentId: null,
      prefs: { mode: 'balanced', budgetCap: false, importance: { cost: 5, effort: 5, eco: 5, keep: ex.ctx.sentiment * 2 } } } });
    go('results');
  };
  const start = () => { dispatch({ type: 'reset' }); go('item'); };

  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">A guided triage for broken things</p>
        <h1>Don't bin it.<br /><em>Decide it.</em></h1>
        <p className="lead">
          Most broken things get binned because nobody knows the next step. Fix It First weighs
          <strong> all five options</strong> — repair, reuse, repurpose, replace, recycle — ranks them for your situation and tells you exactly why.
        </p>
        <div className="cta-row">
          <button className="btn primary big" onClick={start}>Start a triage <span aria-hidden>→</span></button>
          {state.item.name && <button className="btn ghost big" onClick={() => go('item')}>Continue “{state.item.name}”</button>}
        </div>
        <p className="tiny muted">Takes about a minute · No account · Nothing leaves your device</p>
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
              {OPTION_ORDER.map((id) => (
                <span key={id} className="pill" style={{ '--c': OPTIONS[id].color }}>{OPTIONS[id].icon} {OPTIONS[id].label}</span>
              ))}
            </div>
            <p>Five real choices, compared on cost, effort, safety, sentiment and impact.</p>
          </div>
        </div>
      </section>

      <section className="how" aria-labelledby="how-h">
        <h2 id="how-h">How it works</h2>
        <ol className="how-list">
          <li><b>Describe</b> the item and what is wrong with it</li>
          <li><b>Tell us</b> your budget, skill, time and how attached you are</li>
          <li><b>See</b> five options ranked with a full score breakdown</li>
          <li><b>Act</b> with a checklist, and save it to your shelf</li>
        </ol>
      </section>

      <section className="examples" aria-labelledby="ex-h">
        <h2 id="ex-h">Or try an example</h2>
        <div className="ex-grid">
          {EXAMPLES.map((ex) => (
            <button key={ex.label} className="ex-card" onClick={() => loadExample(ex)}>
              <span className="ex-ico" aria-hidden>{ex.icon}</span>
              <span>{ex.label}</span>
              <span className="arrow" aria-hidden>→</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
