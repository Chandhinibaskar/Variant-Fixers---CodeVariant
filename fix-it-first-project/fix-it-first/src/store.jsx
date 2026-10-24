import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { defaultImportance, assess } from './engine.js';
import { CATEGORIES } from './config.js';

const KEY = 'fixitfirst.v1';

const blank = () => ({
  item: { name: '', category: '', age: '', value: '' },
  problem: { symptoms: [], text: '' },
  ctx: { budget: '', skill: 2, time: 'evening', sentiment: 3, need: 'yes' },
  prefs: { mode: 'balanced', importance: defaultImportance('balanced', 3), budgetCap: false },
  currentId: null,
});

const initial = () => {
  const base = { ...blank(), shelf: [], checks: {} };
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved && saved.item) return { ...base, ...saved };
  } catch (e) { /* storage unavailable: start fresh */ }
  return base;
};

function reducer(s, a) {
  switch (a.type) {
    case 'item': {
      const item = { ...s.item, ...a.patch };
      // changing category invalidates old symptom picks
      const problem = a.patch.category && a.patch.category !== s.item.category ? { ...s.problem, symptoms: [] } : s.problem;
      return { ...s, item, problem };
    }
    case 'problem': return { ...s, problem: { ...s.problem, ...a.patch } };
    case 'ctx': {
      const ctx = { ...s.ctx, ...a.patch };
      let prefs = s.prefs;
      // keep sentiment-driven slider in sync until the user moves it manually
      if ('sentiment' in a.patch && !s.prefs.keepTouched) prefs = { ...prefs, importance: { ...prefs.importance, keep: ctx.sentiment * 2 } };
      return { ...s, ctx, prefs };
    }
    case 'importance': return { ...s, prefs: { ...s.prefs, importance: { ...s.prefs.importance, ...a.patch }, mode: 'custom', keepTouched: s.prefs.keepTouched || 'keep' in a.patch } };
    case 'mode': return { ...s, prefs: { ...s.prefs, mode: a.mode, keepTouched: false, importance: defaultImportance(a.mode, s.ctx.sentiment) } };
    case 'budgetCap': return { ...s, prefs: { ...s.prefs, budgetCap: a.on } };
    case 'beginAssessment': return s.currentId ? s : { ...s, currentId: 'it_' + Date.now().toString(36) };
    case 'load': return { ...s, ...a.data };
    case 'reset': return { ...s, ...blank() };
    case 'toggleCheck': {
      const k = `${a.id}:${a.option}`;
      const cur = new Set(s.checks[k] || []);
      cur.has(a.index) ? cur.delete(a.index) : cur.add(a.index);
      return { ...s, checks: { ...s.checks, [k]: [...cur] } };
    }
    case 'save': {
      const entry = { ...a.entry };
      const others = s.shelf.filter((e) => e.id !== entry.id);
      return { ...s, shelf: [entry, ...others] };
    }
    case 'remove': return { ...s, shelf: s.shelf.filter((e) => e.id !== a.id) };
    case 'clearShelf': return { ...s, shelf: [], checks: {} };
    default: return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export const itemReady = (item) =>
  !!item.category && item.name.trim().length > 0 && Number(item.value) > 0 && item.age !== '' && Number(item.age) >= 0;
export const problemReady = (p) => p.symptoms.length > 0 || p.text.trim().length >= 5;

// Re-runnable snapshot used by the shelf
export function snapshotOf(state) {
  return { item: state.item, problem: state.problem, ctx: state.ctx, prefs: state.prefs };
}
export function assessSnapshot(snap) { return assess(snap.item, snap.problem, snap.ctx, snap.prefs); }
export const catOf = (id) => CATEGORIES[id];

export function buildEntry(state, chosen = null) {
  const snap = JSON.parse(JSON.stringify(snapshotOf(state)));
  const r = assessSnapshot(snap);
  const prev = state.shelf.find((e) => e.id === state.currentId);
  return {
    id: state.currentId, savedAt: Date.now(), snapshot: snap,
    topId: r.ranked[0].id, topScore: r.ranked[0].score, chosen: chosen || prev?.chosen || null,
  };
}
