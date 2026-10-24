import React, { useEffect, useMemo, useState } from 'react';
import { useStore, snapshotOf, buildEntry } from '../store.jsx';
import { assess, inr } from '../engine.js';
import { MODES, FACTORS, SKILLS, TIMES } from '../config.js';
import { ScoreRing, Stat, Breakdown, useFlip, costText, impactText, effortText } from '../components.jsx';

const SLIDERS = ['cost', 'effort', 'eco', 'keep'];

export default function Results({ go }) {
  const { state, dispatch } = useStore();
  const { item, problem, ctx, prefs } = state;
  const [view, setView] = useState('cards');
  const [toast, setToast] = useState('');
  const flipRef = useFlip();
  useEffect(() => { if (!state.currentId) dispatch({ type: 'beginAssessment' }); }, [state.currentId, dispatch]);

  const r = useMemo(() => assess(item, problem, ctx, prefs), [item, problem, ctx, prefs]);
  const top = r.ranked[0], second = r.ranked[1];
  const saved = state.shelf.some((e) => e.id === state.currentId);

  const save = () => {
    dispatch({ type: 'save', entry: buildEntry(state) });
    setToast('Saved to your shelf'); setTimeout(() => setToast(''), 2200);
  };
  const editAnswers = (step) => go(step);

  return (
    <div className="results">
      <section className="verdict" style={{ '--c': top.color }}>
        <p className="eyebrow">Our recommendation for your {item.name}</p>
        <div className="verdict-main">
          <span className="verdict-ico" aria-hidden>{top.icon}</span>
          <div>
            <h1 className="h1">{top.label} it{top.id === 'recycle' ? '' : ''}</h1>
            <p className="lead sm">
              {r.closeCall
                ? <>A close call with <b>{second.label}</b> ({second.score.toFixed(0)} vs {top.score.toFixed(0)}). Try the sliders to see what tips it.</>
                : <>{top.tagline}. It beats the next best option, {second.label}, by {(top.score - second.score).toFixed(0)} points.</>}
            </p>
            <p className="because"><b>Because:</b> {r.topDrivers.map((d) => d.reason).join(' ')}</p>
          </div>
        </div>
        {r.facts.safetyKind && (
          <div className="alert warn" role="note">
            <b>⚠️ Safety flag.</b> {r.facts.safetyKind === 'electrical'
              ? 'Electrical faults can shock or start a fire. Unplug the item and keep it out of use.'
              : 'A structural fault can cause collapse and injury. Stop using it until fixed.'}
          </div>
        )}
        {top.id === 'replace' && (
          <div className="alert info" role="note"><b>Replace won on merit</b> — not by default. Reuse, repair and repurpose all scored lower for your situation. See why below.</div>
        )}
      </section>

      <section className="panel" aria-labelledby="whatif-h">
        <div className="panel-head">
          <h2 id="whatif-h" className="h3">What matters most to you?</h2>
          <button className="linkbtn" onClick={() => dispatch({ type: 'mode', mode: 'balanced' })}>Reset</button>
        </div>
        <div className="modes" role="group" aria-label="Scoring mode">
          {Object.values(MODES).map((m) => (
            <button key={m.id} aria-pressed={prefs.mode === m.id} className={`mode ${prefs.mode === m.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'mode', mode: m.id })}>
              <span aria-hidden>{m.icon}</span><b>{m.label}</b><small>{m.blurb}</small>
            </button>
          ))}
        </div>
        <div className="sliders">
          {SLIDERS.map((k) => (
            <div className="slider" key={k}>
              <label htmlFor={`s-${k}`}>{FACTORS[k].label}<span className="val">{prefs.importance[k]}/10</span></label>
              <input id={`s-${k}`} type="range" min="0" max="10" step="1" value={prefs.importance[k]}
                onChange={(e) => dispatch({ type: 'importance', patch: { [k]: Number(e.target.value) } })} />
            </div>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={prefs.budgetCap} onChange={(e) => dispatch({ type: 'budgetCap', on: e.target.checked })} />
          <span>Hard budget cap — heavily penalise anything above {ctx.budget ? inr(ctx.budget) : '₹0'}</span>
        </label>
        <div className="inline-edit">
          <span>Budget</span>
          <input aria-label="Budget in rupees" type="number" min="0" step="100" value={ctx.budget} placeholder="0" onChange={(e) => dispatch({ type: 'ctx', patch: { budget: e.target.value } })} />
          <span>Skill</span>
          <select aria-label="Skill" value={ctx.skill} onChange={(e) => dispatch({ type: 'ctx', patch: { skill: Number(e.target.value) } })}>
            {SKILLS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <span>Time</span>
          <select aria-label="Time" value={ctx.time} onChange={(e) => dispatch({ type: 'ctx', patch: { time: e.target.value } })}>
            {TIMES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
        </div>
      </section>

      <div className="list-head">
        <h2 className="h3">All five options, ranked</h2>
        <div className="seg small" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === 'cards'} className={`seg-btn ${view === 'cards' ? 'on' : ''}`} onClick={() => setView('cards')}>Cards</button>
          <button role="tab" aria-selected={view === 'table'} className={`seg-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')}>Side by side</button>
        </div>
      </div>

      {view === 'cards' ? (
        <ol className="opt-list">
          {r.ranked.map((o) => (
            <li key={o.id} ref={flipRef(o.id)} className={`opt ${o.rank === 1 ? 'best' : ''} ${o.score < 45 ? 'weak' : ''}`} style={{ '--c': o.color }}>
              <div className="opt-top">
                <span className="rank" aria-label={`Rank ${o.rank}`}>#{o.rank}</span>
                <div className="opt-title">
                  <h3><span aria-hidden>{o.icon}</span> {o.label}</h3>
                  <p>{o.tagline}</p>
                </div>
                <ScoreRing score={o.score} color={o.color} />
              </div>
              {o.flags.length > 0 && <div className="flags">{o.flags.map((f) => <span key={f} className="flag">{f}</span>)}</div>}
              <div className="stats">
                <Stat label="Cost" value={costText(o)} />
                <Stat label="Effort" value={effortText(o)} sub={o.route === 'pro' ? 'by a pro' : o.route === 'diy' ? 'DIY' : undefined} />
                <Stat label="Impact" value={impactText(o)} />
              </div>
              <Breakdown option={o} open={o.rank === 1} />
              <button className="btn outline full" onClick={() => go('option/' + o.id)}>Next steps for {o.label.toLowerCase()} →</button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="table-wrap">
          <table className="cmp">
            <thead><tr><th scope="col">Option</th><th scope="col">Score</th><th scope="col">Cost</th><th scope="col">Effort</th><th scope="col">Impact</th></tr></thead>
            <tbody>
              {r.ranked.map((o) => (
                <tr key={o.id} className={o.rank === 1 ? 'best' : ''}>
                  <th scope="row"><span style={{ color: o.color }} aria-hidden>●</span> #{o.rank} {o.label}</th>
                  <td><b>{o.score.toFixed(0)}</b></td><td>{costText(o)}</td><td>{effortText(o)}</td><td>{impactText(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="actions sticky">
        <button className="btn ghost" onClick={() => editAnswers('item')}>✎ Edit answers</button>
        <button className="btn ghost" onClick={() => go('shelf')}>Shelf ({state.shelf.length})</button>
        <button className="btn primary" onClick={save}>{saved ? '✓ Saved · Update' : 'Save to shelf'}</button>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
