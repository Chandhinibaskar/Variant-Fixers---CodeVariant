import React, { useMemo, useState } from 'react';
import { useStore, buildEntry } from '../store.jsx';
import { assess, tradeoffs, checklist, inr } from '../engine.js';
import { OPTIONS } from '../config.js';
import { ScoreRing, Stat, Breakdown, costText, impactText, effortText } from '../components.jsx';

export default function OptionDetail({ go, optionId }) {
  const { state, dispatch } = useStore();
  const { item, problem, ctx, prefs } = state;
  const [tab, setTab] = useState('steps');
  const [toast, setToast] = useState('');
  const r = useMemo(() => assess(item, problem, ctx, prefs), [item, problem, ctx, prefs]);
  const o = r.options.find((x) => x.id === optionId);
  if (!o) return <div className="card"><p>Option not found.</p><button className="btn primary" onClick={() => go('results')}>Back to results</button></div>;

  const { pros, cons } = tradeoffs(o);
  const steps = checklist(o.id, r.facts, item);
  const key = `${state.currentId}:${o.id}`;
  const done = new Set(state.checks[key] || []);
  const pct = Math.round((done.size / steps.length) * 100);
  const chosen = state.shelf.find((e) => e.id === state.currentId)?.chosen === o.id;

  const commit = () => {
    dispatch({ type: 'save', entry: buildEntry(state, o.id) });
    setToast(`Saved — you're going with ${o.label}`); setTimeout(() => setToast(''), 2400);
  };

  return (
    <div className="detail" style={{ '--c': o.color }}>
      <button className="linkbtn back" onClick={() => go('results')}>← All options</button>
      <header className="detail-head">
        <span className="verdict-ico" aria-hidden>{o.icon}</span>
        <div>
          <p className="eyebrow">Rank #{o.rank} for your {item.name}</p>
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

      <div className="seg" role="tablist" aria-label="Detail sections">
        <button role="tab" aria-selected={tab === 'steps'} className={`seg-btn ${tab === 'steps' ? 'on' : ''}`} onClick={() => setTab('steps')}><b>Next steps</b></button>
        <button role="tab" aria-selected={tab === 'why'} className={`seg-btn ${tab === 'why' ? 'on' : ''}`} onClick={() => setTab('why')}><b>Why it fits</b></button>
      </div>

      {tab === 'steps' ? (
        <section className="card" aria-labelledby="chk-h">
          <div className="panel-head"><h2 id="chk-h" className="h3">Your checklist</h2><span className="muted">{done.size}/{steps.length} done</span></div>
          <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct}%` }} /></div>
          <ul className="checks">
            {steps.map((s, i) => (
              <li key={i} className={done.has(i) ? 'done' : ''}>
                <label>
                  <input type="checkbox" checked={done.has(i)} onChange={() => dispatch({ type: 'toggleCheck', id: state.currentId, option: o.id, index: i })} />
                  <span>{s}</span>
                </label>
              </li>
            ))}
          </ul>
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

      <div className="actions sticky">
        <button className="btn ghost" onClick={() => go('results')}>← Compare</button>
        <button className="btn primary" onClick={commit}>{chosen ? '✓ Going with this' : `Go with ${o.label} & save`}</button>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
