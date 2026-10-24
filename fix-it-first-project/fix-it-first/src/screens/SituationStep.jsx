import React from 'react';
import { useStore } from '../store.jsx';
import { SKILLS, TIMES, SENTIMENT_LABELS, CATEGORIES } from '../config.js';
import { DragCard, ActionZone, Dock } from '../dnd.jsx';
import { CanvasBanner } from '../components_canvas.jsx';
import { inr } from '../engine.js';

export default function SituationStep({ go }) {
  const { state, dispatch } = useStore();
  const { ctx, item } = state;
  const set = (patch) => dispatch({ type: 'ctx', patch });
  const reveal = () => { dispatch({ type: 'beginAssessment' }); go('results'); };
  const cat = CATEGORIES[item.category];
  const skill = SKILLS.find((s) => s.v === ctx.skill);
  const time = TIMES.find((t) => t.v === ctx.time);

  return (
    <div className="step">
      <CanvasBanner />
      <div className="card">
        <p className="eyebrow">Step 3 of 4</p>
        <h1 className="h2">Your situation</h1>
        <p className="muted">Same item, different people, different best answer. Everything can be changed later.</p>

        <div className="field">
          <label htmlFor="budget">Budget for fixing or replacing (₹)</label>
          <input id="budget" type="number" inputMode="numeric" min="0" step="100" value={ctx.budget}
            placeholder={`e.g. ${Math.round((Number(item.value) || 1000) / 2 / 100) * 100 || 500}`} onChange={(e) => set({ budget: e.target.value })} />
          <p className="hint">Leave empty or 0 if you want to spend nothing.</p>
        </div>

        <fieldset className="field">
          <legend>Your DIY skill</legend>
          <div className="seg" role="radiogroup" aria-label="DIY skill">
            {SKILLS.map((s) => (
              <button type="button" key={s.v} role="radio" aria-checked={ctx.skill === s.v} className={`seg-btn ${ctx.skill === s.v ? 'on' : ''}`} onClick={() => set({ skill: s.v })}>
                <b>{s.label}</b><small>{s.blurb}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Time you can spare</legend>
          <div className="seg" role="radiogroup" aria-label="Time available">
            {TIMES.map((t) => (
              <button type="button" key={t.v} role="radio" aria-checked={ctx.time === t.v} className={`seg-btn ${ctx.time === t.v ? 'on' : ''}`} onClick={() => set({ time: t.v })}><b>{t.label}</b></button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Do you still need it to do its job?</legend>
          <div className="seg two-col" role="radiogroup" aria-label="Still needed">
            <button type="button" role="radio" aria-checked={ctx.need === 'yes'} className={`seg-btn ${ctx.need === 'yes' ? 'on' : ''}`} onClick={() => set({ need: 'yes' })}><b>Yes, I need one</b></button>
            <button type="button" role="radio" aria-checked={ctx.need === 'no'} className={`seg-btn ${ctx.need === 'no' ? 'on' : ''}`} onClick={() => set({ need: 'no' })}><b>Not really</b></button>
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="sent">How attached are you? <b className="val">{SENTIMENT_LABELS[ctx.sentiment - 1]}</b></label>
          <input id="sent" type="range" min="1" max="5" step="1" value={ctx.sentiment} onChange={(e) => set({ sentiment: Number(e.target.value) })} aria-valuetext={SENTIMENT_LABELS[ctx.sentiment - 1]} />
          <div className="range-ends"><span>Just stuff</span><span>Irreplaceable</span></div>
        </div>
      </div>

      <DragCard payload={{ kind: 'situation' }} meta={{ icon: '🧭', label: `Situation: ${item.name}` }} className="data-card ready" hint="drag me ↓">
        <span className="eyebrow">Situation card</span>
        <b className="dc-title">{cat.icon} {item.name}</b>
        <span className="dc-meta">Budget {ctx.budget ? inr(ctx.budget) : '₹0'} · {skill.label} · {time.label} · {ctx.need === 'yes' ? 'still needed' : 'not needed'} · {SENTIMENT_LABELS[ctx.sentiment - 1].toLowerCase()}</span>
        <span className="dc-status">✓ Ready — drag me to reveal your options</span>
      </DragCard>

      <Dock>
        <ActionZone id="back" icon="←" title="Back" hint="Drop to go back" accepts={['situation']} tone="muted" onDrop={() => go('problem')} />
        <ActionZone id="next" icon="✨" title="Reveal my options" hint="Drop the situation card here" accepts={['situation']} onDrop={reveal} className="pulse" />
      </Dock>
    </div>
  );
}
