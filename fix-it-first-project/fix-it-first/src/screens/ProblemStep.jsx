import React, { useState } from 'react';
import { useStore, problemReady } from '../store.jsx';
import { SYMPTOMS, CATEGORIES, SAFETY_WORDS } from '../config.js';

export default function ProblemStep({ go }) {
  const { state, dispatch } = useStore();
  const { item, problem } = state;
  const [touched, setTouched] = useState(false);
  const list = SYMPTOMS[item.category] || [];
  const cat = CATEGORIES[item.category];

  const toggle = (id) => {
    const has = problem.symptoms.includes(id);
    dispatch({ type: 'problem', patch: { symptoms: has ? problem.symptoms.filter((x) => x !== id) : [...problem.symptoms, id] } });
  };
  const risky = list.some((s) => s.safety && problem.symptoms.includes(s.id)) ||
    (cat.electrical && SAFETY_WORDS.some((w) => problem.text.toLowerCase().includes(w)));
  const next = (e) => { e.preventDefault(); setTouched(true); if (problemReady(problem)) go('situation'); };

  return (
    <form className="card step" onSubmit={next} noValidate>
      <p className="eyebrow">Step 2 of 4</p>
      <h1 className="h2">What's wrong with your {item.name || 'item'}?</h1>
      <p className="muted">Tap everything that applies — chips are faster than typing.</p>

      <div className="chips" role="group" aria-label="Symptoms">
        {list.map((s) => (
          <button type="button" key={s.id} aria-pressed={problem.symptoms.includes(s.id)}
            className={`chip ${problem.symptoms.includes(s.id) ? 'on' : ''}`} onClick={() => toggle(s.id)}>
            {problem.symptoms.includes(s.id) && <span aria-hidden>✓ </span>}{s.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="desc">Anything else? <span className="muted">(optional)</span></label>
        <textarea id="desc" rows={3} maxLength={300} value={problem.text}
          placeholder="When did it start? Did you drop it? Any smell, sound or sparks?"
          onChange={(e) => dispatch({ type: 'problem', patch: { text: e.target.value } })} />
      </div>

      {risky && (
        <div className="alert warn" role="status">
          <b>⚠️ Safety first.</b> This looks like a safety fault. We'll rank options with that in mind — and strongly avoid handing it on or DIY-ing it.
        </div>
      )}
      {touched && !problemReady(problem) && <p className="err" role="alert">Pick at least one symptom or describe the problem.</p>}

      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => go('item')}>← Back</button>
        <button className="btn primary" type="submit">Next: your situation →</button>
      </div>
    </form>
  );
}
