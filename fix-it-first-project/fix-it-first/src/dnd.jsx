// ─────────────────────────────────────────────────────────────
//  THE CANVAS PROTOCOL — a tiny drag-and-drop engine.
//  • Pointer Events → one code path for mouse, pen and touch
//  • Keyboard mode  → Enter picks a card up, arrows choose a zone,
//                     Enter drops, Esc cancels (accessible fallback)
//  • <DragCard>  = a data card you can pick up
//  • <ActionZone> = a target that runs a primary action on drop
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ApiCtx = createContext(null);
const StateCtx = createContext({ active: null, overId: null, flashId: null, shakeId: null });

export const useDnd = () => useContext(ApiCtx);

export const acceptsPayload = (accepts, payload) => {
  if (!payload) return false;
  if (!accepts) return true;
  return typeof accepts === 'function' ? !!accepts(payload) : accepts.includes(payload.kind);
};

export function DndProvider({ children }) {
  const zones = useRef(new Map());
  const session = useRef(null);
  const ghost = useRef(null);
  const justDragged = useRef(false);
  const keyState = useRef({ list: [], idx: 0 });
  const raf = useRef(0);
  const pointerY = useRef(0);
  const [st, setSt] = useState({ active: null, overId: null, flashId: null, shakeId: null });
  const [live, setLive] = useState('');
  const [toast, setToast] = useState('');
  const toastT = useRef(0);

  const notify = useCallback((msg) => {
    setToast(msg); setLive(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const eligible = useCallback((payload) => {
    const out = [];
    zones.current.forEach((z, id) => {
      const p = z.get();
      if (!p.disabled && acceptsPayload(p.accepts, payload) && z.el.current) out.push(id);
    });
    return out;
  }, []);

  const zoneAt = useCallback((x, y, payload) => {
    let best = null, bestArea = Infinity;
    eligible(payload).forEach((id) => {
      const r = zones.current.get(id).el.current.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const area = r.width * r.height;
        if (area < bestArea) { best = id; bestArea = area; }
      }
    });
    return best;
  }, [eligible]);

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current);
    document.body.classList.remove('is-dragging');
    session.current = null;
    keyState.current = { list: [], idx: 0 };
    setSt((s) => ({ ...s, active: null, overId: null }));
  }, []);

  const drop = useCallback((id, payload, meta) => {
    const z = zones.current.get(id);
    if (!z) return;
    const res = z.get().onDrop(payload, meta);
    const key = res === false ? 'shakeId' : 'flashId';
    setSt((s) => ({ ...s, [key]: id }));
    setTimeout(() => setSt((s) => (s[key] === id ? { ...s, [key]: null } : s)), 700);
  }, []);

  /* ───── pointer drag ───── */
  const scrollLoop = useCallback(() => {
    const s = session.current;
    if (!s || !s.started) return;
    const y = pointerY.current;
    if (y < 80) window.scrollBy(0, -14);
    else if (y > window.innerHeight - 24) window.scrollBy(0, 14);
    raf.current = requestAnimationFrame(scrollLoop);
  }, []);

  const onMove = useCallback((e) => {
    const s = session.current;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.started) {
      if (Math.hypot(dx, dy) < (s.type === 'touch' ? 4 : 6)) return;
      s.started = true;
      document.body.classList.add('is-dragging');
      setSt((x) => ({ ...x, active: { payload: s.payload, meta: s.meta, mode: 'pointer' } }));
      raf.current = requestAnimationFrame(scrollLoop);
    }
    pointerY.current = e.clientY;
    if (ghost.current) ghost.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    const over = zoneAt(e.clientX, e.clientY, s.payload);
    setSt((x) => (x.overId === over ? x : { ...x, overId: over }));
    s.over = over;
  }, [zoneAt, scrollLoop]);

  const onUp = useCallback((e) => {
    const s = session.current;
    if (!s || e.pointerId !== s.id) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (s.started) {
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 80);
      const target = e.type === 'pointerup' ? zoneAt(e.clientX, e.clientY, s.payload) : null;
      const { payload, meta } = s;
      finish();
      if (target) drop(target, payload, meta);
      else notify('Dropped outside — drag onto a glowing zone');
    } else { session.current = null; }
  }, [onMove, zoneAt, finish, drop, notify]);

  const pointerDown = useCallback((e, payload, meta) => {
    if (e.button !== undefined && e.button !== 0) return;
    const inter = e.target.closest('input,select,textarea,a,button,label');
    if (inter && inter !== e.currentTarget && e.currentTarget.contains(inter)) return;
    if (e.pointerType === 'touch' && !meta.touchWhole && !e.target.closest('.grip')) return; // keep page scrolling
    if (session.current) return;
    session.current = { payload, meta, id: e.pointerId, x0: e.clientX, y0: e.clientY, type: e.pointerType, started: false };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [onMove, onUp]);

  /* ───── keyboard drag ───── */
  const setOver = useCallback((id) => {
    setSt((x) => ({ ...x, overId: id }));
    const z = zones.current.get(id);
    if (z) {
      z.el.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setLive(`Zone: ${z.get().title}. Press Enter to drop.`);
    }
  }, []);

  const keyDown = useCallback((e, payload, meta) => {
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (session.current) return;
    const list = eligible(payload).sort((a, b) => {
      const ra = zones.current.get(a).el.current.getBoundingClientRect();
      const rb = zones.current.get(b).el.current.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
    if (!list.length) { notify('No action zone accepts this card right now'); return; }
    session.current = { payload, meta, key: true, started: true };
    keyState.current = { list, idx: 0 };
    setSt((x) => ({ ...x, active: { payload, meta, mode: 'key' } }));
    setOver(list[0]);
    setLive(`Picked up ${meta.label}. Arrow keys choose a zone, Enter drops, Escape cancels.`);

    const handler = (ev) => {
      const k = keyState.current;
      if (['ArrowRight', 'ArrowDown'].includes(ev.key)) { ev.preventDefault(); k.idx = (k.idx + 1) % k.list.length; setOver(k.list[k.idx]); }
      else if (['ArrowLeft', 'ArrowUp'].includes(ev.key)) { ev.preventDefault(); k.idx = (k.idx - 1 + k.list.length) % k.list.length; setOver(k.list[k.idx]); }
      else if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault(); ev.stopPropagation();
        const id = k.list[k.idx]; window.removeEventListener('keydown', handler, true); finish(); drop(id, payload, meta);
      } else if (ev.key === 'Escape' || ev.key === 'Tab') {
        window.removeEventListener('keydown', handler, true); finish(); setLive('Cancelled');
      }
    };
    window.addEventListener('keydown', handler, true);
  }, [eligible, notify, setOver, finish, drop]);

  const api = useMemo(() => ({
    register: (id, z) => zones.current.set(id, z),
    unregister: (id) => zones.current.delete(id),
    pointerDown, keyDown, notify,
    justDragged: () => justDragged.current,
  }), [pointerDown, keyDown, notify]);

  useEffect(() => () => { cancelAnimationFrame(raf.current); document.body.classList.remove('is-dragging'); }, []);

  const a = st.active;
  return (
    <ApiCtx.Provider value={api}>
      <StateCtx.Provider value={st}>
        {children}
        <div ref={ghost} className="ghost" style={{ display: a && a.mode === 'pointer' ? 'flex' : 'none' }} aria-hidden>
          {a && <><span>{a.meta.icon}</span><b>{a.meta.label}</b></>}
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
        <div className="sr-only" aria-live="assertive">{live}</div>
      </StateCtx.Provider>
    </ApiCtx.Provider>
  );
}

/* ───── a card you can pick up ───── */
export function useDraggable(payload, meta) {
  const api = useDnd();
  const st = useContext(StateCtx);
  const dragging = !!st.active && st.active.payload === payload;
  return {
    props: {
      onPointerDown: (e) => api.pointerDown(e, payload, meta),
      onKeyDown: (e) => api.keyDown(e, payload, meta),
      onClickCapture: (e) => { if (api.justDragged()) { e.stopPropagation(); e.preventDefault(); } },
      onDragStart: (e) => e.preventDefault(),
      tabIndex: 0,
      role: 'group',
      'aria-roledescription': 'draggable card',
      'aria-label': `${meta.label}. Press Enter to pick up, then arrow keys to choose an action zone.`,
    },
    dragging,
    anyActive: !!st.active,
  };
}

export function DragCard({ payload, meta, className = '', children, grip = true, hint, as: Tag = 'div', style, onClick }) {
  const { props, dragging, anyActive } = useDraggable(payload, meta);
  return (
    <Tag {...props} onClick={onClick} style={style}
      className={`dcard ${meta.touchWhole ? 'touch-drag' : ''} ${dragging ? 'lifted' : ''} ${className}`}>
      {grip && <span className="grip" aria-hidden title="Drag me">⠿</span>}
      {children}
      {hint && !anyActive && <span className="drag-hint" aria-hidden>{hint}</span>}
    </Tag>
  );
}

/* ───── a target that performs an action on drop ───── */
export function ActionZone({ id, accepts, onDrop, disabled, icon, title, hint, tone = 'brand', variant = 'dock', className = '', children }) {
  const api = useDnd();
  const st = useContext(StateCtx);
  const el = useRef(null);
  const latest = useRef({});
  latest.current = { accepts, onDrop, disabled, title };
  useEffect(() => {
    api.register(id, { el, get: () => latest.current });
    return () => api.unregister(id);
  }, [id, api]);

  const active = st.active;
  const armed = !!active && !disabled && acceptsPayload(accepts, active.payload);
  const over = st.overId === id && armed;
  const cls = ['zone', `zone-${variant}`, `tone-${tone}`, armed && 'armed', over && 'over', active && !armed && 'dim', disabled && 'disabled',
    st.flashId === id && 'flash', st.shakeId === id && 'shake', className].filter(Boolean).join(' ');
  return (
    <div ref={el} className={cls} data-zone={id} role="group" aria-label={`Action zone: ${title}`}>
      <div className="zone-head">
        {icon && <span className="zone-ico" aria-hidden>{icon}</span>}
        <div className="zone-text"><b>{title}</b>{hint && <small>{hint}</small>}</div>
      </div>
      {children}
    </div>
  );
}

export const Dock = ({ children }) => <div className="dock" role="region" aria-label="Action zones — drop cards here">{children}</div>;
