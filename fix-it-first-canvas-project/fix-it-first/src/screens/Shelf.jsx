import React, { useMemo, useState } from 'react';
import { useStore, assessSnapshot } from '../store.jsx';
import { CATEGORIES } from '../config.js';
import { checklist } from '../engine.js';
import { costText, impactText, effortText } from '../components.jsx';
import { DragCard, ActionZone, Dock, useDnd } from '../../../../fix-it-first-project/fix-it-first/src/dnd.jsx';
import { CanvasBanner } from '../../../../fix-it-first-project/fix-it-first/src/components_canvas.jsx';

export default function Shelf({ go }) {
  const { state, dispatch } = useStore();
  const dnd = useDnd();
  const [sel, setSel] = useState([]);

  const rows = useMemo(() => state.shelf.map((e) => {
    const r = assessSnapshot(e.snapshot);
    const focus = r.options.find((o) => o.id === (e.chosen || e.topId)) || r.ranked[0];
    const steps = checklist(focus.id, r.facts, e.snapshot.item).length;
    const done = (state.checks[`${e.id}:${focus.id}`] || []).length;
    return { e, r, focus, steps, done };
  }), [state.shelf, state.checks]);
  const byId = (id) => rows.find((x) => x.e.id === id);

  const startNew = () => { dispatch({ type: 'reset' }); go('item'); };
  const reopen = (p) => { const x = byId(p.id); if (!x) return; dispatch({ type: 'load', data: { ...x.e.snapshot, currentId: x.e.id } }); go('results'); };
  const addCompare = (p) => {
    if (sel.includes(p.id)) { dnd.notify('Already in the compare tray'); return false; }
    if (sel.length >= 3) { dnd.notify('The compare tray holds up to 3 items'); return false; }
    setSel([...sel, p.id]);
  };
  const removeCard = (p) => {
    if (p.kind === 'shelfAll') {
      if (!window.confirm('Clear the whole shelf?')) return false;
      dispatch({ type: 'clearShelf' }); setSel([]); dnd.notify('Shelf cleared'); return;
    }
    if (p.kind === 'cmp') { setSel(sel.filter((x) => x !== p.id)); return; }
    dispatch({ type: 'remove', id: p.id }); setSel(sel.filter((x) => x !== p.id)); dnd.notify('Removed from shelf');
  };
  const compared = rows.filter((x) => sel.includes(x.e.id));

  const dock = (
    <Dock>
      <ActionZone id="reopen" icon="🔄" title="Reopen" hint="Back to results" accepts={['shelf', 'cmp']} onDrop={reopen} disabled={!rows.length} />
      <ActionZone id="compare" icon="⚖️" title="Compare" hint="Up to 3" accepts={['shelf']} tone="blue" onDrop={addCompare} disabled={!rows.length} />
      <ActionZone id="remove" icon="🗑️" title="Remove" hint="Delete from shelf" accepts={['shelf', 'cmp', 'shelfAll']} tone="red" onDrop={removeCard} disabled={!rows.length} />
      <ActionZone id="new" icon="➕" title="New item" hint="Start a triage" accepts={['start']} tone="amber" onDrop={startNew} />
    </Dock>
  );

  const startCard = (
    <DragCard payload={{ kind: 'start' }} meta={{ icon: '🧰', label: 'New broken thing' }} className="big-card slim" hint="drag me ↓">
      <span className="big-ico" aria-hidden>🧰</span><b>New broken thing</b><small>Drop into “New item”</small>
    </DragCard>
  );

  if (!rows.length) {
    return (
      <div className="shelf">
        <CanvasBanner />
        <div className="card empty">
          <div className="empty-ico" aria-hidden>🗄️</div>
          <h1 className="h2">Your shelf is empty</h1>
          <p className="muted">Drop an option card into the “Shelf” or “Go with this” zone on the results page to keep it here for this session.</p>
          <div className="card-row center-row">{startCard}</div>
        </div>
        {dock}
      </div>
    );
  }

  return (
    <div className="shelf">
      <CanvasBanner />
      <DragCard payload={{ kind: 'shelfAll' }} meta={{ icon: '🗄️', label: 'Whole shelf' }} className="shelf-head" hint="">
        <h1 className="h2">Session shelf</h1>
        <p className="muted">{rows.length} item{rows.length > 1 ? 's' : ''} · stays for this browser session · drag any card into a zone below</p>
      </DragCard>

      <ActionZone id="shelflist" variant="inline" tone="muted" icon="🗄️" title="Saved items" hint="Drop a compare chip here to put it back" accepts={['cmp']} onDrop={(p) => setSel(sel.filter((x) => x !== p.id))}>
        <ul className="shelf-list">
          {rows.map(({ e, focus, steps, done }) => {
            const cat = CATEGORIES[e.snapshot.item.category];
            return (
              <DragCard as="li" key={e.id} payload={{ kind: 'shelf', id: e.id }} meta={{ icon: cat.icon, label: e.snapshot.item.name }} className="shelf-item" style={{ '--c': focus.color }}>
                <div className="shelf-top">
                  <span className="cat-ico" aria-hidden>{cat.icon}</span>
                  <div className="grow">
                    <h3>{e.snapshot.item.name}</h3>
                    <p className="muted tiny">{cat.label} · {new Date(e.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {sel.includes(e.id) && <span className="badge slate">in compare</span>}
                </div>
                <div className="shelf-mid">
                  <span className="badge" style={{ background: focus.color }}>{focus.icon} {focus.label}</span>
                  <span className="muted tiny">{e.chosen ? 'You chose this' : 'Top recommendation'} · score {focus.score.toFixed(0)}</span>
                </div>
                <div className="progress small" aria-label={`${done} of ${steps} steps done`}><div style={{ width: `${(done / steps) * 100}%` }} /></div>
                <p className="tiny muted">{done}/{steps} steps done</p>
              </DragCard>
            );
          })}
        </ul>
      </ActionZone>

      <ActionZone id="tray" variant="inline" tone="blue" icon="⚖️" title="Compare tray" hint={compared.length < 2 ? 'Drop 2–3 items on the Compare zone' : undefined} accepts={['shelf']} onDrop={addCompare}>
        {compared.length > 0 && (
          <div className="ruled-out">
            {compared.map(({ e, focus }) => (
              <DragCard key={e.id} payload={{ kind: 'cmp', id: e.id }} meta={{ icon: focus.icon, label: e.snapshot.item.name, touchWhole: true }} grip={false} className="mini">
                {focus.icon} {e.snapshot.item.name}
              </DragCard>
            ))}
          </div>
        )}
        {compared.length >= 2 && (
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
        )}
      </ActionZone>

      <div className="totals card">
        <h2 className="h3">Kept out of the bin</h2>
        <p><b>{rows.filter((x) => !['recycle', 'replace'].includes(x.focus.id)).length}</b> of {rows.length} items are on a repair / reuse / repurpose path · est. <b>{rows.reduce((a, x) => a + x.focus.co2, 0)} kg CO₂e</b> avoided</p>
        <p className="tiny muted">Tip: drag the “Session shelf” header onto Remove to clear everything.</p>
      </div>
      <div className="card-row center-row">{startCard}</div>
      {dock}
    </div>
  );
}
