import React, { useMemo, useState } from 'react';
import { useStore, assessSnapshot } from '../store.jsx';
import { CATEGORIES, OPTIONS } from '../config.js';
import { checklist } from '../engine.js';
import { costText, impactText, effortText } from '../components.jsx';

export default function Shelf({ go }) {
  const { state, dispatch } = useStore();
  const [sel, setSel] = useState([]);

  const rows = useMemo(() => state.shelf.map((e) => {
    const r = assessSnapshot(e.snapshot);
    const focus = r.options.find((o) => o.id === (e.chosen || e.topId)) || r.ranked[0];
    const steps = checklist(focus.id, r.facts, e.snapshot.item).length;
    const done = (state.checks[`${e.id}:${focus.id}`] || []).length;
    return { e, r, focus, steps, done };
  }), [state.shelf, state.checks]);

  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  const reopen = (e) => {
    dispatch({ type: 'load', data: { ...e.snapshot, currentId: e.id } });
    go('results');
  };
  const compared = rows.filter((x) => sel.includes(x.e.id));

  if (!rows.length) {
    return (
      <div className="card empty">
        <div className="empty-ico" aria-hidden>🗄️</div>
        <h1 className="h2">Your shelf is empty</h1>
        <p className="muted">Assess an item and tap “Save to shelf” to keep it here for this session — review it, reopen it or compare it later.</p>
        <button className="btn primary" onClick={() => { dispatch({ type: 'reset' }); go('item'); }}>Start a triage →</button>
      </div>
    );
  }

  return (
    <div className="shelf">
      <div className="panel-head">
        <div><h1 className="h2">Session shelf</h1><p className="muted">{rows.length} item{rows.length > 1 ? 's' : ''} · stays for this browser session</p></div>
        <button className="btn primary" onClick={() => { dispatch({ type: 'reset' }); go('item'); }}>+ New item</button>
      </div>

      <ul className="shelf-list">
        {rows.map(({ e, focus, steps, done }) => {
          const cat = CATEGORIES[e.snapshot.item.category];
          return (
            <li key={e.id} className="shelf-item" style={{ '--c': focus.color }}>
              <div className="shelf-top">
                <span className="cat-ico" aria-hidden>{cat.icon}</span>
                <div className="grow">
                  <h3>{e.snapshot.item.name}</h3>
                  <p className="muted tiny">{cat.label} · {new Date(e.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <label className="cmp-pick"><input type="checkbox" checked={sel.includes(e.id)} onChange={() => toggle(e.id)} disabled={!sel.includes(e.id) && sel.length >= 3} /> Compare</label>
              </div>
              <div className="shelf-mid">
                <span className="badge" style={{ background: focus.color }}>{focus.icon} {focus.label}</span>
                <span className="muted tiny">{e.chosen ? 'You chose this' : 'Top recommendation'} · score {focus.score.toFixed(0)}</span>
              </div>
              <div className="progress small" aria-label={`${done} of ${steps} steps done`}><div style={{ width: `${(done / steps) * 100}%` }} /></div>
              <p className="tiny muted">{done}/{steps} steps done</p>
              <div className="actions row">
                <button className="btn outline" onClick={() => reopen(e)}>Reopen</button>
                <button className="btn ghost danger" onClick={() => { dispatch({ type: 'remove', id: e.id }); setSel((s) => s.filter((x) => x !== e.id)); }}>Remove</button>
              </div>
            </li>
          );
        })}
      </ul>

      {compared.length >= 2 ? (
        <section className="card" aria-labelledby="cmp-h">
          <h2 id="cmp-h" className="h3">Side by side</h2>
          <div className="table-wrap">
            <table className="cmp">
              <thead><tr><th scope="col" />{compared.map(({ e }) => <th scope="col" key={e.id}>{e.snapshot.item.name}</th>)}</tr></thead>
              <tbody>
                <tr><th scope="row">Path</th>{compared.map(({ e, focus }) => <td key={e.id}><b style={{ color: focus.color }}>{focus.icon} {focus.label}</b></td>)}</tr>
                <tr><th scope="row">Score</th>{compared.map(({ e, focus }) => <td key={e.id}>{focus.score.toFixed(0)}</td>)}</tr>
                <tr><th scope="row">Cost</th>{compared.map(({ e, focus }) => <td key={e.id}>{costText(focus)}</td>)}</tr>
                <tr><th scope="row">Effort</th>{compared.map(({ e, focus }) => <td key={e.id}>{effortText(focus)}</td>)}</tr>
                <tr><th scope="row">Impact</th>{compared.map(({ e, focus }) => <td key={e.id}>{impactText(focus)}</td>)}</tr>
                <tr><th scope="row">Progress</th>{compared.map(({ e, done, steps }) => <td key={e.id}>{done}/{steps}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : <p className="muted tiny center">Tick “Compare” on two or three items to see them side by side.</p>}

      <div className="totals card">
        <h2 className="h3">Kept out of the bin</h2>
        <p>
          <b>{rows.filter((x) => !['recycle', 'replace'].includes(x.focus.id)).length}</b> of {rows.length} items are on a repair / reuse / repurpose path ·
          est. <b>{rows.reduce((a, x) => a + x.focus.co2, 0)} kg CO₂e</b> avoided
        </p>
        <button className="linkbtn danger" onClick={() => { if (confirm('Clear the whole shelf?')) { dispatch({ type: 'clearShelf' }); setSel([]); } }}>Clear shelf</button>
      </div>
    </div>
  );
}
