import React, { useState } from 'react';
import { useStore, itemReady } from '../store.jsx';
import { CATEGORIES } from '../config.js';

export default function ItemStep({ go }) {
  const { state, dispatch } = useStore();
  const { item } = state;
  const [touched, setTouched] = useState(false);
  const set = (patch) => dispatch({ type: 'item', patch });

  const errs = {
    category: !item.category && 'Pick a category',
    name: !item.name.trim() && 'Give it a name, e.g. “Blue kettle”',
    age: (item.age === '' || Number(item.age) < 0) && 'How old is it? (0 if new)',
    value: !(Number(item.value) > 0) && 'Roughly what would a new one cost?',
  };
  const next = (e) => { e.preventDefault(); setTouched(true); if (itemReady(item)) go('problem'); };

  return (
    <form className="card step" onSubmit={next} noValidate>
      <p className="eyebrow">Step 1 of 4</p>
      <h1 className="h2">What's the item?</h1>
      <p className="muted">One decision per screen. This takes about 15 seconds.</p>

      <fieldset className="field">
        <legend>Category</legend>
        <div className="cat-grid" role="radiogroup" aria-label="Category">
          {Object.values(CATEGORIES).map((c) => (
            <button type="button" key={c.id} role="radio" aria-checked={item.category === c.id}
              className={`cat ${item.category === c.id ? 'on' : ''}`} onClick={() => set({ category: c.id })}>
              <span className="cat-ico" aria-hidden>{c.icon}</span>
              <b>{c.label}</b>
              <small>{c.examples}</small>
            </button>
          ))}
        </div>
        {touched && errs.category && <p className="err" role="alert">{errs.category}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="name">Item name</label>
        <input id="name" value={item.name} maxLength={40} placeholder="e.g. Blue electric kettle"
          onChange={(e) => set({ name: e.target.value })} aria-invalid={touched && !!errs.name} />
        {touched && errs.name && <p className="err" role="alert">{errs.name}</p>}
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="age">Age (years)</label>
          <input id="age" type="number" inputMode="decimal" min="0" max="60" step="0.5" value={item.age} placeholder="3"
            onChange={(e) => set({ age: e.target.value })} aria-invalid={touched && !!errs.age} />
          {touched && errs.age && <p className="err" role="alert">{errs.age}</p>}
        </div>
        <div className="field">
          <label htmlFor="value">Price of a new one (₹)</label>
          <input id="value" type="number" inputMode="numeric" min="1" step="50" value={item.value} placeholder="1800"
            onChange={(e) => set({ value: e.target.value })} aria-invalid={touched && !!errs.value} />
          {touched && errs.value && <p className="err" role="alert">{errs.value}</p>}
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => go('')}>← Back</button>
        <button className="btn primary" type="submit">Next: what's wrong? →</button>
      </div>
    </form>
  );
}
