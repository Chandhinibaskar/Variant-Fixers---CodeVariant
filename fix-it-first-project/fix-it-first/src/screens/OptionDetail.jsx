import React, { useMemo, useState } from 'react';
import { useStore, buildEntry } from '../store.jsx';
import { assess, tradeoffs, checklist } from '../engine.js';
import { ScoreRing, Stat, Breakdown, costText, impactText, effortText } from '../components.jsx';
import { DragCard, ActionZone, Dock, useDnd } from '../dnd.jsx';
import { CanvasBanner } from '../components_canvas.jsx';

export default function OptionDetail({ go, optionId }) {
  const { state, dispatch } = useStore();
  const dnd = useDnd();
  const { item, problem, ctx, prefs } = state;
  const [tab, setTab] = useState('steps');
  const r = useMemo(() => assess(item, problem, ctx, prefs), [item, problem, ctx, prefs]);
  const o = r.options.find((x) => x.id === optionId);
  if (!o) return <div className="card"><p>Option not found.</p><a href="#/results">Back to results</a></div>;

  const { pros, cons } = tradeoffs(o);
  const steps = checklist(o.id, r.facts, item);
  const key = `${state.currentId}:${o.id}`;
  const done = new Set(state.checks[key] || []);
  const pct = Math.round((done.size / steps.length) * 100);
  const chosen = state.shelf.find((e) => e.id === state.currentId)?.chosen === o.id;
  const setStep = (i, on) => { if (done.has(i) !== on) dispatch({ type: 'toggleCheck', id: state.currentId, option: o.id, index: i }); };

  const commit = () => { dispatch({ type: 'save', entry: buildEntry(state, o.id) }); dnd.notify(`✓ You're going with ${o.label} — saved to your shelf`); };

  const stepCard = (i, isDone) => (
    <DragCard key={i} as="li" payload={{ kind: 'step', i }} meta={{ icon: isDone ? '✅' : '📌', label: `Step ${i + 1}`, touchWhole: true }} grip={false}
      className={`step-card ${isDone ? 'done' : ''}`} onClick={() => setStep(i, !isDone)}>
      <span className="step-n">{i + 1}</span><span>{steps[i]}</span>
    </DragCard>
  );
  const todo = steps.map((_, i) => i).filter((i) => !done.has(i));
  const doneList = steps.map((_, i) => i).filter((i) => done.has(i));

  return (
    <div className="detail" style={{ '--c': o.color }}>
      <CanvasBanner />
      <p className="tiny"><a href="#/results">← All options</a></p>

      <DragCard payload={{ kind: 'option', id: o.id }} meta={{ icon: o.icon, label: o.label }} className="detail-card" hint="drag me to a zone ↓">
        <header className="detail-head">
          <span className="verdict-ico" aria-hidden>{o.icon}</span>
          <div>
            <p className="eyebrow">{o.rank ? `Rank #${o.rank}` : 'Ruled out'} for your {item.name}</p>
            <h1 className="h1">{o.label}</h1>
            <p className="lead sm">{o.tagline}</p>
          </div>
          <ScoreRing score={o.score} color={o.color} size={76} />
        </header>
        <div className="stats big">
          <Stat label="Cost" value={costText(o)} sub={o.route === 'pro' ? 'professional' : o.route === 'diy' ? 'do it yourself' : undefined} />
          <Stat label="Your effort" value={effortText(o)} />
          <Stat label="Impact" value={impactText(o)} sub="vs. buying new" />
        </div>
        {o.flags.length > 0 && <div className="flags">{o.flags.map((f) => <span key={f} className="flag">{f}</span>)}</div>}
      </DragCard>

      <div className="seg" role="group" aria-label="Detail sections">
        <button aria-pressed={tab === 'steps'} className={`seg-btn ${tab === 'steps' ? 'on' : ''}`} onClick={() => setTab('steps')}><b>Next steps</b></button>
        <button aria-pressed={tab === 'why'} className={`seg-btn ${tab === 'why' ? 'on' : ''}`} onClick={() => setTab('why')}><b>Why it fits</b></button>
      </div>

      {tab === 'steps' ? (
        <section className="card" aria-labelledby="chk-h">
          <div className="panel-head"><h2 id="chk-h" className="h3">Drag steps into “Done”</h2><span className="muted">{done.size}/{steps.length}</span></div>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct}%` }} /></div>
          <ActionZone id="todo" variant="inline" tone="muted" icon="📌" title="To do" accepts={['step']} onDrop={(p) => setStep(p.i, false)}>
            <ul className="step-list">{todo.length ? todo.map((i) => stepCard(i, false)) : <li className="muted tiny">Nothing left 🎉</li>}</ul>
          </ActionZone>
          <ActionZone id="done" variant="inline" icon="✅" title="Done" accepts={['step']} onDrop={(p) => setStep(p.i, true)}>
            <ul className="step-list">{doneList.length ? doneList.map((i) => stepCard(i, true)) : <li className="muted tiny">Drop finished steps here</li>}</ul>
          </ActionZone>
          {pct === 100 && <div className="alert ok" role="status">🎉 All done — one more thing kept out of the bin.</div>}
        </section>
      ) : (
        <section className="card" aria-labelledby="why-h">
          <h2 id="why-h" className="h3">Trade-offs</h2>
          <div className="proscons">
            <div><h3 className="pc good">What works</h3>{pros.length ? <ul>{pros.map((f) => <li key={f.id}><b>{f.label}.</b> {f.reason}</li>)}</ul> : <p className="muted">Nothing stands out strongly.</p>}</div>
            <div><h3 className="pc bad">What to watch</h3>{cons.length ? <ul>{cons.map((f) => <li key={f.id}><b>{f.label}.</b> {f.reason}</li>)}</ul> : <p className="muted">No major drawbacks.</p>}</div>
          </div>
          <Breakdown option={o} open />
        </section>
      )}

      <Dock>
        <ActionZone id="back" icon="←" title="All options" hint="Drop to compare" accepts={['option']} tone="muted" onDrop={() => go('results')} />
        <ActionZone id="go" icon="✅" title={chosen ? 'Going with this ✓' : `Go with ${o.label}`} hint="Choose & save to shelf" accepts={['option']} onDrop={commit} className={chosen ? '' : 'pulse'} />
      </Dock>
    </div>
  );
}
