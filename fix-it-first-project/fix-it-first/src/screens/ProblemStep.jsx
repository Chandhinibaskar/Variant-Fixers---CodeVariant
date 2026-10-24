import React from 'react';
import { useStore, problemReady } from '../store.jsx';
import { SYMPTOMS, CATEGORIES, SAFETY_WORDS } from '../config.js';
import { DragCard, ActionZone, Dock, useDnd } from '../dnd.jsx';
import { CanvasBanner } from '../components_canvas.jsx';

export default function ProblemStep({ go }) {
  const { state, dispatch } = useStore();
  const dnd = useDnd();
  const { item, problem } = state;
  const list = SYMPTOMS[item.category] || [];
  const cat = CATEGORIES[item.category];
  const chosen = list.filter((s) => problem.symptoms.includes(s.id));
  const pool = list.filter((s) => !problem.symptoms.includes(s.id));

  const setSyms = (symptoms) => dispatch({ type: 'problem', patch: { symptoms } });
  const add = (id) => !problem.symptoms.includes(id) && setSyms([...problem.symptoms, id]);
  const remove = (id) => setSyms(problem.symptoms.filter((x) => x !== id));
  const toggle = (id) => (problem.symptoms.includes(id) ? remove(id) : add(id));

  const risky = chosen.some((s) => s.safety) || (cat.electrical && SAFETY_WORDS.some((w) => problem.text.toLowerCase().includes(w)));
  const ready = problemReady(problem);

  const submit = () => {
    if (!ready) { dnd.notify('Card is empty — drag at least one symptom into the tray, or describe the problem'); return false; }
    go('situation');
  };

  const chip = (s, on) => (
    <DragCard key={s.id} payload={{ kind: 'symptom', id: s.id }} meta={{ icon: '🩹', label: s.label, touchWhole: true }} grip={false}
      className={`chip ${on ? 'on' : ''}`} onClick={() => toggle(s.id)}>
      {s.label}
    </DragCard>
  );

  return (
    <div className="step">
      <CanvasBanner />
      <div className="card">
        <p className="eyebrow">Step 2 of 4</p>
        <h1 className="h2">What's wrong with your {item.name || 'item'}?</h1>
        <p className="muted">Drag symptom cards into the tray (or just tap them). Drag back out to remove.</p>

        <ActionZone id="pool" variant="inline" icon="🗂️" title="Symptoms" accepts={['symptom']} onDrop={(p) => remove(p.id)}>
          <div className="chips">{pool.length ? pool.map((s) => chip(s, false)) : <p className="muted tiny">All symptoms are in the tray.</p>}</div>
        </ActionZone>

        <ActionZone id="tray" variant="inline" tone="amber" icon="🩹" title="What's wrong (tray)" accepts={['symptom']} onDrop={(p) => add(p.id)}>
          <div className="chips">{chosen.length ? chosen.map((s) => chip(s, true)) : <p className="muted tiny">Drop symptoms here ↓</p>}</div>
        </ActionZone>

        <div className="field">
          <label htmlFor="desc">Anything else? <span className="muted">(optional)</span></label>
          <textarea id="desc" rows={3} maxLength={300} value={problem.text}
            placeholder="When did it start? Did you drop it? Any smell, sound or sparks?"
            onChange={(e) => dispatch({ type: 'problem', patch: { text: e.target.value } })} />
        </div>

        {risky && <div className="alert warn" role="status"><b>⚠️ Safety first.</b> This looks like a safety fault. We'll rank options with that in mind — and strongly avoid handing it on or DIY-ing it.</div>}
      </div>

      <DragCard payload={{ kind: 'problem' }} meta={{ icon: '🩹', label: `Problem: ${item.name}` }} className={`data-card ${ready ? 'ready' : 'incomplete'}`} hint={ready ? 'drag me ↓' : ''}>
        <span className="eyebrow">Problem card</span>
        <b className="dc-title">{cat.icon} {item.name}</b>
        <span className="dc-meta">{chosen.length ? chosen.map((s) => s.label).join(' · ') : problem.text.trim() ? 'Described in words' : 'No symptoms yet'}</span>
        <span className="dc-status">{ready ? '✓ Ready — drag me to the next zone' : 'Add a symptom or a short description'}</span>
      </DragCard>

      <Dock>
        <ActionZone id="back" icon="←" title="Back" hint="Drop to go back" accepts={['problem']} tone="muted" onDrop={() => go('item')} />
        <ActionZone id="next" icon="🧭" title="Your situation" hint="Drop the problem card here" accepts={['problem']} onDrop={submit} className={ready ? 'pulse' : ''} />
      </Dock>
    </div>
  );
}
