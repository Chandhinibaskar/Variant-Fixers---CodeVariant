import React, { useState } from 'react';
import { useStore, itemReady } from '../store.jsx';
import { CATEGORIES } from '../config.js';
import { DragCard, ActionZone, Dock, useDnd } from '../../../../fix-it-first-project/fix-it-first/src/dnd.jsx';
import { CanvasBanner } from '../../../../fix-it-first-project/fix-it-first/src/components_canvas.jsx';

export default function ItemStep({ go }) {
  const { state, dispatch } = useStore();
  const dnd = useDnd();
  const { item } = state;
  const [touched, setTouched] = useState(false);
  const set = (patch) => dispatch({ type: 'item', patch });
  const cat = CATEGORIES[item.category];

  const errs = {
    category: !item.category && 'Pick a category',
    name: !item.name.trim() && 'Give it a name, e.g. “Blue kettle”',
    age: (item.age === '' || Number(item.age) < 0) && 'How old is it? (0 if new)',
    value: !(Number(item.value) > 0) && 'Roughly what would a new one cost?',
  };
  const missing = Object.entries(errs).filter(([, v]) => v).map(([k]) => ({ category: 'category', name: 'name', age: 'age', value: 'new price' }[k]));

  const submit = () => {
    setTouched(true);
    if (!itemReady(item)) { dnd.notify(`Card incomplete — still needs: ${missing.join(', ')}`); return false; }
    go('problem');
  };

  return (
    <div className="step">
      <CanvasBanner />
      <div className="card">
        <p className="eyebrow">Step 1 of 4</p>
        <h1 className="h2">What's the item?</h1>
        <p className="muted">Fill in the card, then drag it into the glowing zone.</p>

        <fieldset className="field">
          <legend>Category</legend>
          <div className="cat-grid" role="radiogroup" aria-label="Category">
            {Object.values(CATEGORIES).map((c) => (
              <button type="button" key={c.id} role="radio" aria-checked={item.category === c.id}
                className={`cat ${item.category === c.id ? 'on' : ''}`} onClick={() => set({ category: c.id })}>
                <span className="cat-ico" aria-hidden>{c.icon}</span>
                <b>{c.label}</b><small>{c.examples}</small>
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
      </div>

      <DragCard payload={{ kind: 'item' }} meta={{ icon: cat ? cat.icon : '📦', label: item.name || 'Item card' }} className={`data-card ${missing.length ? 'incomplete' : 'ready'}`} hint={missing.length ? '' : 'drag me ↓'}>
        <span className="eyebrow">Item card</span>
        <b className="dc-title">{cat ? cat.icon : '📦'} {item.name || 'Unnamed item'}</b>
        <span className="dc-meta">{cat ? cat.label : 'No category'} · {item.age === '' ? '? yrs' : `${item.age} yrs`} · {Number(item.value) > 0 ? `₹${Number(item.value).toLocaleString('en-IN')} new` : '₹?'}</span>
        <span className="dc-status">{missing.length ? `Still needs: ${missing.join(', ')}` : '✓ Ready — drag me to the next zone'}</span>
      </DragCard>

      <Dock>
        <ActionZone id="back" icon="←" title="Back" hint="Drop to go back" accepts={['item']} tone="muted" onDrop={() => go('')} />
        <ActionZone id="next" icon="🔧" title="Describe the problem" hint="Drop the item card here" accepts={['item']} onDrop={submit} className={missing.length ? '' : 'pulse'} />
      </Dock>
    </div>
  );
}
