import React, { useState, useRef, useLayoutEffect } from 'react';
import { inr, hoursLabel } from './engine.js';

export function ScoreRing({ score, color, size = 64 }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${Math.round(score)} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, score) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .5s ease' }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ring-text">{Math.round(score)}</text>
    </svg>
  );
}

export function Stat({ label, value, sub }) {
  return <div className="stat"><span className="stat-l">{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
}

export const costText = (o) => (o.cost === 0 ? (o.earn ? `Earn ~${inr(o.earn)}` : 'Free') : inr(o.cost));
export const impactText = (o) => (o.co2 > 0 ? `−${o.co2} kg CO₂e` : 'No saving');
export const effortText = (o) => hoursLabel(o.hours);

// Expandable "Why this option" factor breakdown
export function Breakdown({ option, open: initial = false }) {
  const [open, setOpen] = useState(initial);
  const id = `why-${option.id}`;
  const rows = [...option.factors].filter((f) => f.weight > 0).sort((a, b) => b.maxPoints - a.maxPoints);
  return (
    <div className="why">
      <button className="why-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        Why this option <span aria-hidden className={`chev ${open ? 'up' : ''}`}>▾</span>
      </button>
      {open && (
        <div id={id} className="why-body">
          <p className="tiny muted">Each bar shows points earned out of the points that factor is worth. Weights come from your answers and sliders.</p>
          <ul className="factors">
            {rows.map((f) => (
              <li key={f.id}>
                <div className="f-head">
                  <span>{f.label}</span>
                  <span className="f-pts"><b>{f.points.toFixed(1)}</b> / {f.maxPoints.toFixed(1)}</span>
                </div>
                <div className="bar" aria-hidden><div className="bar-max" style={{ width: `${Math.min(100, f.maxPoints * 3)}%` }}><div className="bar-fill" style={{ width: `${f.score * 100}%`, background: option.color }} /></div></div>
                <p className="f-reason">{f.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// FLIP animation so cards glide when rankings re-order live
export function useFlip() {
  const els = useRef({}), prev = useRef({});
  useLayoutEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = {};
    Object.entries(els.current).forEach(([k, el]) => {
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      next[k] = top;
      const p = prev.current[k];
      if (!reduce && p != null && Math.abs(p - top) > 2) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${p - top}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .4s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; }));
      }
    });
    prev.current = next;
  });
  return (k) => (el) => { els.current[k] = el; };
}

