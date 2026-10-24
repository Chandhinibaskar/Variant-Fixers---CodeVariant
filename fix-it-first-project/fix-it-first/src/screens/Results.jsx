import React, { useEffect, useMemo, useState } from 'react';
import { useStore, buildEntry } from '../store.jsx';
import { assess, inr } from '../engine.js';
import { MODES, FACTORS, SKILLS, TIMES } from '../config.js';
import { ScoreRing, Stat, Breakdown, useFlip, costText, impactText, effortText } from '../components.jsx';
import { DragCard, ActionZone, Dock, useDnd } from '../dnd.jsx';
import { CanvasBanner } from '../components_canvas.jsx';

const SLIDERS = ['cost', 'effort', 'eco', 'keep'];

export default function Results({ go }) {
  const { state, dispatch } = useStore();
  const dnd = useDnd();
  const { item, problem, ctx, prefs } = state;
  const [view, setView] = useState('cards');
  const flipRef = useFlip();
  useEffect(() => { if (!state.currentId) dispatch({ type: 'beginAssessment' }); }, [state.currentId, dispatch]);

  const r = useMemo(() => assess(item, problem, ctx, prefs), [item, problem, ctx, prefs]);
  const top = r.ranked[0], second = r.ranked[1];
  const saved = state.shelf.some((e) => e.id === state.currentId);
  const optById = (id) => r.options.find((o) => o.id === id);

  // ── primary actions, each triggered ONLY by dropping a card on a zone ──
  const rulesOut = (p) => {
    if (r.ranked.length <= 1) { dnd.notify('At least one option must stay in the ranking'); return false; }
    dispatch({ type: 'exclude', id: p.id });
    dnd.notify(`${optById(p.id).label} ruled out — drag it back from the tray to restore`);
  };
  const restore = (p) => { dispatch({ type: 'restore', id: p.id }); dnd.notify(`${optById(p.id).label} is back in the ranking`); };
  const goWith = (p) => { dispatch({ type: 'save', entry: buildEntry(state, p.id) }); dnd.notify(`✓ Going with ${optById(p.id).label} — saved to your shelf`); };
  const saveShelf = () => { dispatch({ type: 'save', entry: buildEntry(state) }); dnd.notify('💾 Saved to your shelf'); };
  const nextSteps = (p) => go('option/' + p.id);

  const optCard = (o) => (
    <DragCard as="li" key={o.id} payload={{ kind: 'option', id: o.id }} meta={{ icon: o.icon, label: o.label }}
      className={`opt ${o.rank === 1 ? 'best' : ''} ${o.score < 45 ? 'weak' : ''}`} style={{ '--c': o.color }}
      hint={o.rank === 1 ? 'drag me to an action zone ↓' : undefined}>
      <div ref={flipRef(o.id)} className="flip">
        <div className="opt-top">
          <span className="rank" aria-label={`Rank ${o.rank}`}>#{o.rank}</span>
          <div className="opt-title"><h3><span aria-hidden>{o.icon}</span> {o.label}</h3><p>{o.tagline}</p></div>
          <ScoreRing score={o.score} color={o.color} />
        </div>
        {o.flags.length > 0 && <div className="flags">{o.flags.map((f) => <span key={f} className="flag">{f}</span>)}</div>}
        <div className="stats">
          <Stat label="Cost" value={costText(o)} />
          <Stat label="Effort" value={effortText(o)} sub={o.route === 'pro' ? 'by a pro' : o.route === 'diy' ? 'DIY' : undefined} />
          <Stat label="Impact" value={impactText(o)} />
        </div>
        <Breakdown option={o} open={o.rank === 1} />
      </div>
    </DragCard>
  );

  return (
    <div className="results">
      <CanvasBanner />
      <section className="verdict" style={{ '--c': top.color }}>
        <p className="eyebrow">Our recommendation for your {item.name}</p>
        <div className="verdict-main">
          <span className="verdict-ico" aria-hidden>{top.icon}</span>
          <div>
            <h1 className="h1">{top.label} it</h1>
            <p className="lead sm">
              {r.closeCall
                ? <>A close call with <b>{second.label}</b> ({second.score.toFixed(0)} vs {top.score.toFixed(0)}). Try the sliders to see what tips it.</>
                : second ? <>{top.tagline}. It beats the next best option, {second.label}, by {(top.score - second.score).toFixed(0)} points.</> : <>{top.tagline}.</>}
            </p>
            <p className="because"><b>Because:</b> {r.topDrivers.map((d) => d.reason).join(' ')}</p>
          </div>
        </div>
        {r.facts.safetyKind && (
          <div className="alert warn" role="note"><b>⚠️ Safety flag.</b> {r.facts.safetyKind === 'electrical'
            ? 'Electrical faults can shock or start a fire. Unplug the item and keep it out of use.'
            : 'A structural fault can cause collapse and injury. Stop using it until fixed.'}</div>
        )}
        {top.id === 'replace' && <div className="alert info" role="note"><b>Replace won on merit</b> — not by default. See the breakdown for why.</div>}
      </section>

      <section className="panel" aria-labelledby="whatif-h">
        <div className="panel-head">
          <h2 id="whatif-h" className="h3">What matters most to you?</h2>
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
              <input id={`s-${k}`} type="range" min="0" max="10" step="1" value={prefs.importance[k]} onChange={(e) => dispatch({ type: 'importance', patch: { [k]: Number(e.target.value) } })} />
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
          <select aria-label="Skill" value={ctx.skill} onChange={(e) => dispatch({ type: 'ctx', patch: { skill: Number(e.target.value) } })}>{SKILLS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select>
          <span>Time</span>
          <select aria-label="Time" value={ctx.time} onChange={(e) => dispatch({ type: 'ctx', patch: { time: e.target.value } })}>{TIMES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}</select>
        </div>
      </section>

      <div className="list-head">
        <h2 className="h3">Drag an option into a zone ↓</h2>
        <div className="seg small" role="group" aria-label="View">
          <button aria-pressed={view === 'cards'} className={`seg-btn ${view === 'cards' ? 'on' : ''}`} onClick={() => setView('cards')}>Cards</button>
          <button aria-pressed={view === 'table'} className={`seg-btn ${view === 'table' ? 'on' : ''}`} onClick={() => setView('table')}>Side by side</button>
        </div>
      </div>

      <ActionZone id="list" variant="inline" tone="muted" icon="♻️" title="Ranked options" hint="Drop a ruled-out card here to bring it back" accepts={['excluded']} onDrop={restore}>
        {view === 'cards' ? (
          <ol className="opt-list">{r.ranked.map(optCard)}</ol>
        ) : (
          <div className="table-wrap">
            <table className="cmp">
              <thead><tr><th scope="col">Option</th><th scope="col">Score</th><th scope="col">Cost</th><th scope="col">Effort</th><th scope="col">Impact</th></tr></thead>
              <tbody>{r.ranked.map((o) => (
                <tr key={o.id} className={o.rank === 1 ? 'best' : ''}>
                  <th scope="row"><span style={{ color: o.color }} aria-hidden>●</span> #{o.rank} {o.label}</th>
                  <td><b>{o.score.toFixed(0)}</b></td><td>{costText(o)}</td><td>{effortText(o)}</td><td>{impactText(o)}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </ActionZone>

      {r.excluded.length > 0 && (
        <div className="ruled-out" aria-label="Ruled-out options">
          <b>Ruled out:</b>
          {r.excluded.map((o) => (
            <DragCard key={o.id} payload={{ kind: 'excluded', id: o.id }} meta={{ icon: o.icon, label: o.label, touchWhole: true }} grip={false} className="mini">
              {o.icon} {o.label} <small>{o.score.toFixed(0)}</small>
            </DragCard>
          ))}
          <small className="muted">drag back into the list to restore</small>
        </div>
      )}

      <p className="tiny muted center">Not right? <a href="#/item">Edit your answers</a></p>

      <Dock>
        <ActionZone id="rule" icon="🚫" title="Rule out" hint="Remove from ranking" accepts={['option']} tone="red" onDrop={rulesOut} />
        <ActionZone id="steps" icon="📋" title="Next steps" hint="Open the checklist" accepts={['option']} tone="blue" onDrop={nextSteps} />
        <ActionZone id="go" icon="✅" title="Go with this" hint="Choose & save" accepts={['option']} onDrop={goWith} />
        <ActionZone id="save" icon="💾" title="Shelf" hint={saved ? 'Saved · drop to update' : 'Save assessment'} accepts={['option']} tone="amber" onDrop={saveShelf} />
      </Dock>
    </div>
  );
}
