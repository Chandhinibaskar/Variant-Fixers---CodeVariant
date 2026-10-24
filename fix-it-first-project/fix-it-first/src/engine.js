// Transparent scoring engine: every option is scored 0-1 on every factor,
// then combined with weights. Nothing is hidden: the result carries the
// per-factor score, weight, points contributed and a plain-language reason.
import {
  CATEGORIES, SYMPTOMS, SAFETY_WORDS, OPTIONS, OPTION_ORDER, FACTORS,
  FIXED_WEIGHTS, MODES, TIMES,
} from './config.js';

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const roundTo = (n, step = 10) => Math.round(n / step) * step;

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const hoursLabel = (h) => (h < 1.5 ? '~1 hr' : h >= 8 ? `~${Math.round(h / 8 * 10) / 10} days` : `~${Math.round(h * 2) / 2} hrs`);

export function defaultImportance(modeId, sentiment) {
  const m = MODES[modeId] || MODES.balanced;
  return { ...m.importance, keep: clamp((Number(sentiment) || 3) * 2, 0, 10) };
}

// ── Step 1: turn raw answers into facts every option can use ──────────
export function deriveFacts(item, problem, ctx) {
  const cat = CATEGORIES[item.category];
  const chosen = (SYMPTOMS[item.category] || []).filter((s) => problem.symptoms.includes(s.id));
  const text = (problem.text || '').toLowerCase();
  const textRisk = cat.electrical && SAFETY_WORDS.some((w) => text.includes(w));

  let severity = chosen.length ? Math.max(...chosen.map((s) => s.severity)) : 2;
  const difficulty = chosen.length ? Math.max(...chosen.map((s) => s.difficulty)) : 2;
  const partsFrac = chosen.length ? Math.min(0.9, chosen.reduce((a, s) => a + s.parts, 0)) : 0.25;
  const kinds = chosen.map((s) => s.safety).filter(Boolean);
  if (textRisk) { kinds.push('electrical'); severity = 3; }
  const safetyKind = kinds.includes('electrical') ? 'electrical' : kinds.includes('structural') ? 'structural' : null;
  const cosmetic = chosen.length > 0 && chosen.every((s) => s.cosmetic);

  const value = Math.max(1, Number(item.value) || 1);
  const age = Math.max(0, Number(item.age) || 0);
  const ageRatio = clamp(age / cat.expectedLife, 0, 1.5);
  const budget = Math.max(0, Number(ctx.budget) || 0);
  const hoursAvail = (TIMES.find((t) => t.v === ctx.time) || TIMES[1]).hours;

  return {
    cat, severity, difficulty, partsFrac, safetyKind, cosmetic, value, age, ageRatio,
    budget, hoursAvail, skill: Number(ctx.skill) || 2, needsIt: ctx.need !== 'no',
    sentiment: Number(ctx.sentiment) || 3, symptomLabels: chosen.map((s) => s.label),
  };
}

// ── Step 2: raw numbers per option (cost, hours, CO₂, route) ──────────
function optionNumbers(id, F) {
  const parts = F.value * F.partsFrac;
  switch (id) {
    case 'repair': {
      const diy = F.skill >= F.difficulty && F.safetyKind !== 'electrical';
      const cost = diy ? roundTo(parts * 0.7) : roundTo(Math.max(F.cat.minService, parts * 1.15 + F.cat.minService * 0.5));
      return { route: diy ? 'diy' : 'pro', cost, earn: 0, hours: diy ? F.difficulty * 1.5 : 1 };
    }
    case 'reuse': {
      const mult = [0.35, 0.2, 0.08][F.severity - 1];
      return { route: 'give', cost: 0, earn: roundTo(F.value * mult * (1 - clamp(F.ageRatio, 0, 1) * 0.5), 10), hours: 1 };
    }
    case 'repurpose':
      return { route: 'diy', cost: roundTo(Math.max(50, F.value * 0.04), 10), earn: 0, hours: F.cat.id === 'furniture' ? 4 : 3 };
    case 'recycle':
      return { route: 'dropoff', cost: 0, earn: 0, hours: 1 };
    case 'replace':
    default:
      return { route: 'shop', cost: F.value, earn: 0, hours: 2 };
  }
}

// ── Step 3: factor scores 0-1 (+ plain-language reason) ───────────────
function factorScores(id, F, N) {
  const o = OPTIONS[id];
  const net = N.cost - N.earn;
  const overBudget = F.budget > 0 ? N.cost > F.budget : N.cost > 0;

  // cost
  const budgetFit = N.cost <= 0 ? 1 : F.budget <= 0 ? 0 : N.cost > F.budget ? 0 : 1 - 0.6 * (N.cost / F.budget);
  const valueFit = net <= 0 ? 1 : clamp(1 - net / F.value);
  const cost = 0.6 * budgetFit + 0.4 * valueFit;

  // effort
  let effort = clamp(1 - N.hours / (F.hoursAvail * 1.5));
  if (id === 'repair' && N.route === 'diy' && F.difficulty >= F.skill) effort *= 0.9;
  if (id === 'repurpose' && F.skill === 1) effort *= 0.8;

  // eco / keep (static profile per option)
  const eco = o.eco;
  const keep = o.keep;

  // safety
  let safety = 1;
  if (F.safetyKind === 'electrical') safety = { repair: 0.75, reuse: 0.05, repurpose: 0.1, recycle: 0.9, replace: 0.95 }[id];
  else if (F.safetyKind === 'structural') safety = { repair: 0.7, reuse: 0.15, repurpose: 0.35, recycle: 0.9, replace: 0.95 }[id];

  // feasibility
  let feasible;
  switch (id) {
    case 'repair':
      feasible = [1, 0.8, 0.6][F.severity - 1] - (N.cost / F.value > 0.8 ? 0.2 : 0);
      break;
    case 'reuse': feasible = [0.8, 0.55, 0.35][F.severity - 1]; break;
    case 'repurpose':
      feasible = F.cat.repurposability * (F.cosmetic ? 1 : 0.85) * (F.skill === 1 ? 0.8 : 1) * (F.safetyKind === 'electrical' ? 0.3 : 1);
      break;
    case 'recycle': feasible = 0.95; break;
    default: feasible = 1;
  }
  feasible = clamp(feasible);

  // need
  const need = {
    repair: 1, replace: 1,
    reuse: F.needsIt ? 0.2 : 0.9,
    repurpose: F.needsIt ? 0.45 : 0.9,
    recycle: F.needsIt ? 0.15 : 0.9,
  }[id];

  // longevity
  const ar = clamp(F.ageRatio, 0, 1);
  const longevity = {
    repair: clamp(1 - F.ageRatio * 0.7, 0.15, 1),
    replace: 0.45 + 0.55 * ar,
    reuse: 0.65,
    repurpose: 0.7,
    recycle: 0.3 + 0.6 * ar,
  }[id];

  return { cost, effort, eco, keep, safety, feasible, need, longevity, overBudget, net };
}

const costLine = (id, F, N, s) => {
  const pct = Math.round((N.cost / F.value) * 100);
  const over = s.overBudget && N.cost > 0 && F.budget > 0 ? ` That is over your ${inr(F.budget)} budget.` : '';
  switch (id) {
    case 'repair':
      return (N.route === 'diy'
        ? `Doing it yourself, parts should be about ${inr(N.cost)} — ${pct}% of the ${inr(F.value)} a new one costs.`
        : `A professional would likely charge around ${inr(N.cost)}, about ${pct}% of the ${inr(F.value)} replacement price.`) + over;
    case 'reuse': return `Selling or passing it on costs nothing and could bring in roughly ${inr(N.earn)}.`;
    case 'repurpose': return `Only small materials needed — around ${inr(N.cost)}.${over}`;
    case 'recycle': return 'Responsible drop-off or collection is usually free.';
    default: return `Buying new means paying about ${inr(N.cost)}${F.budget ? ` against a ${inr(F.budget)} budget` : ''}.${over}`;
  }
};

function reasons(id, F, N, s, co2) {
  const R = {};
  R.cost = costLine(id, F, N, s);

  const avail = hoursLabel(F.hoursAvail);
  R.effort = {
    repair: N.route === 'diy'
      ? `About ${hoursLabel(N.hours)} of hands-on work at your skill level; you have ${avail}.`
      : `Mostly a drop-off and pick-up — roughly an hour of your time, plus waiting for the repair.`,
    reuse: `Photographing, listing or dropping it off takes about an hour.`,
    repurpose: `A creative project of ${hoursLabel(N.hours)}${F.skill === 1 ? ', which is a stretch for a beginner' : ''}; you have ${avail}.`,
    recycle: 'Finding a drop-off point and going there takes about an hour.',
    replace: 'Researching, ordering or shopping takes around two hours.',
  }[id];

  R.eco = id === 'replace'
    ? 'A new one carries its full manufacturing footprint, and the old one still needs disposing of.'
    : `Avoids roughly ${co2} kg CO₂e compared with buying new (indicative estimate).`;

  R.keep = {
    repair: 'You keep the exact item you already know and care about.',
    reuse: F.sentiment >= 4 ? 'Letting it go may be hard given how attached you are.' : 'It leaves you, but it goes to someone who will use it.',
    repurpose: 'It stays with you in a new form, so part of the item lives on.',
    recycle: F.sentiment >= 4 ? 'Its materials live on, but the item itself is gone — tough if it matters to you.' : 'The item is gone, but its materials get a second life.',
    replace: F.sentiment >= 4 ? 'A new one will not carry the memories this one does.' : 'A new one has no history, which matters little to you.',
  }[id];

  const risk = F.safetyKind;
  R.safety = !risk
    ? 'No safety concerns were flagged for this item.'
    : risk === 'electrical'
      ? ({
        repair: 'Electrical faults can shock or start fires — a qualified technician (not DIY) is the safe route.',
        reuse: 'Handing on an item with an electrical fault is unsafe for the next owner.',
        repurpose: 'Reusing a faulty electrical item, even for another purpose, keeps the hazard around.',
        recycle: 'Authorised e-waste recyclers handle damaged batteries and wiring safely.',
        replace: 'Replacing it removes the hazard entirely (dispose of the old one as e-waste).',
      })[id]
      : ({
        repair: 'A structural fault needs a proper fix (carpenter or strong joinery) before anyone sits on it again.',
        reuse: 'Passing on something that could collapse is a risk to the next person.',
        repurpose: 'Only safe if the new job takes no body weight.',
        recycle: 'Dismantling it removes the risk.',
        replace: 'A sound new piece removes the risk.',
      })[id];

  const sevWord = ['a minor fault', 'a moderate fault', 'a serious fault'][F.severity - 1];
  R.feasible = {
    repair: `With ${sevWord}${F.cosmetic ? ' (mostly cosmetic)' : ''}, repair has ${s.feasible >= 0.8 ? 'a high' : s.feasible >= 0.55 ? 'a fair' : 'a modest'} chance of working${N.cost / F.value > 0.8 ? '; but the repair bill nears the price of new' : ''}.`,
    reuse: `Someone can use it ${F.severity === 1 ? 'almost as-is' : F.severity === 2 ? 'with some work, or for parts' : 'mainly for parts'}.`,
    repurpose: `${F.cat.label} ${F.cat.repurposability >= 0.8 ? 'lend themselves well to' : 'are harder to'} repurposing${F.safetyKind === 'electrical' ? ', and this fault makes it riskier' : ''}.`,
    recycle: 'Almost everything can be recycled or responsibly disposed of.',
    replace: 'You can always buy a new one — it is the guaranteed-to-work route.',
  }[id];

  R.need = id === 'repair' || id === 'replace'
    ? 'You still need this item, and this route gives you a working one.'
    : F.needsIt ? 'You still need this item to do its original job, and this route does not give you that.'
      : "You said you don't really need it any more, so letting go costs you little.";

  R.longevity = {
    repair: F.ageRatio >= 0.9 ? `At ${F.age} yrs it is near the end of a typical ${F.cat.expectedLife}-year life, so extra investment pays back less.` : `At ${F.age} yrs it has plenty of life left (typical: ${F.cat.expectedLife} yrs), so a fix is worth it.`,
    replace: F.ageRatio >= 0.9 ? 'It has had a full life; replacing is reasonable.' : 'It is still young, so replacing throws away usable life.',
    reuse: 'Age matters less when it moves on to a new owner.',
    repurpose: 'Age matters little for a new purpose.',
    recycle: F.ageRatio >= 0.9 ? 'At end of life, recycling is the natural next step.' : 'It still has life in it, so recycling now wastes some of it.',
  }[id];

  return R;
}

// ── Step 4: assemble the full assessment ──────────────────────────────
export function assess(item, problem, ctx, prefs) {
  const F = deriveFacts(item, problem, ctx);
  const imp = prefs.importance;
  const weights = {
    cost: imp.cost / 5, effort: imp.effort / 5, eco: imp.eco / 5, keep: imp.keep / 5,
    safety: F.safetyKind ? FIXED_WEIGHTS.safetyRisk : FIXED_WEIGHTS.safety,
    feasible: FIXED_WEIGHTS.feasible, need: FIXED_WEIGHTS.need, longevity: FIXED_WEIGHTS.longevity,
  };
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  const options = OPTION_ORDER.map((id) => {
    const N = optionNumbers(id, F);
    const S = factorScores(id, F, N);
    const co2 = Math.round(F.cat.embodiedCO2 * OPTIONS[id].ecoAvoided);
    const why = reasons(id, F, N, S, co2);
    const factors = Object.keys(FACTORS).map((fid) => ({
      id: fid, label: FACTORS[fid].label, score: S[fid], weight: weights[fid],
      points: (weights[fid] * S[fid] / totalW) * 100,
      maxPoints: (weights[fid] / totalW) * 100,
      reason: why[fid],
    }));
    let score = factors.reduce((a, f) => a + f.points, 0);
    const flags = [];
    if (S.overBudget && N.cost > 0 && F.budget > 0) {
      flags.push('Over budget');
      if (prefs.budgetCap) { score *= 0.5; flags.push('Budget cap applied'); }
    }
    if (F.safetyKind && S.safety < 0.3) flags.push('Unsafe for this fault');
    return {
      ...OPTIONS[id], score: Math.round(score * 10) / 10, cost: N.cost, earn: N.earn, hours: N.hours,
      route: N.route, co2, factors, flags, net: S.net,
    };
  });

  // Options the user ruled out (dragged to the "Rule out" zone) leave the ranking but stay recoverable.
  const out = (prefs.excluded || []).filter((id) => OPTION_ORDER.includes(id));
  const sorted = [...options].sort((a, b) => b.score - a.score);
  const kept = sorted.filter((o) => !out.includes(o.id));
  const ranked = kept.length ? kept : sorted;
  const excluded = kept.length ? sorted.filter((o) => out.includes(o.id)) : [];
  ranked.forEach((o, i) => { o.rank = i + 1; });
  excluded.forEach((o) => { o.rank = null; });
  const closeCall = !!ranked[1] && ranked[0].score - ranked[1].score < 5;
  const topDrivers = [...ranked[0].factors].sort((a, b) => b.points - a.points).slice(0, 2);
  return { facts: F, weights, options, ranked, excluded, closeCall, topDrivers };
}

// ── Pros / cons derived from the factor breakdown ─────────────────────
export function tradeoffs(option) {
  const byStrength = [...option.factors].filter((f) => f.weight > 0.3);
  const pros = byStrength.filter((f) => f.score >= 0.7).sort((a, b) => b.points - a.points).slice(0, 3);
  const cons = byStrength.filter((f) => f.score < 0.5).sort((a, b) => b.maxPoints - b.points - (a.maxPoints - a.points)).slice(0, 3);
  return { pros, cons };
}

// ── Next-step checklists ──────────────────────────────────────────────
export function checklist(optionId, F, item) {
  const n = item.name || 'the item';
  const elec = F.cat.electrical;
  const common = {
    repair: F.safetyKind === 'electrical'
      ? [`Unplug ${n} and stop using it right now`, 'Do not open it yourself — find an authorised service centre or a trained technician', 'Ask for a written quote before approving any work', 'If the quote is above 70% of the price of new, come back and reconsider', 'Ask to keep any replaced parts and request a warranty on the repair']
      : F.safetyKind === 'structural'
        ? [`Stop using ${n} until it is fixed`, 'Take clear photos of the crack or break', 'Ask a local carpenter for a quote including reinforcement', 'Test it gently with low weight before real use', 'If repair fails the test, move to Recycle or Replace']
        : N_REPAIR_DIY(F, n),
    reuse: [`Clean ${n} and take 4–5 clear photos (include the fault honestly)`, F.safetyKind ? 'Do NOT give this away as working — it has a safety fault. Offer for parts only with a clear warning' : 'Write an honest description: what works and what does not', 'List it on a local marketplace, a community group, or offer it to friends and hostels', F.severity >= 3 ? 'Mark it "for parts/repair" so buyers know' : `Suggest a fair price around ${inr(Math.max(50, roundTo(F.value * 0.15)))} or donate it`, 'Hand it over in person and keep a note of what you agreed'],
    repurpose: repurposeSteps(F, n),
    recycle: elec
      ? [`Remove any batteries and accessories from ${n}`, 'Wipe personal data if it stores any (factory reset or remove memory)', 'Find an authorised e-waste collector or a manufacturer take-back point', 'Never put it in household waste — batteries can ignite', 'Keep the receipt or acknowledgement if one is offered']
      : [`Strip ${n} of metal parts, buttons or zips you can reuse`, 'Separate fabric/wood/metal if possible', F.cat.id === 'clothing' ? 'Drop textiles at a textile-recycling or donation bin' : 'Take wood or metal to a local scrap or recycling collector', 'Check whether the municipality has a bulky-waste collection day', 'Keep any salvaged parts for future repairs'],
    replace: ['Write down exactly what was wrong so you can avoid the same fault', `Set a firm ceiling: stay at or below ${inr(F.budget || F.value)}`, 'Compare at least three options — look at repairability and warranty, not only price', 'Consider a refurbished or second-hand one before buying new', elec ? `Recycle the old ${n} as e-waste once the new one works` : `Pass on or recycle the old ${n} — do not just bin it`],
  };
  return common[optionId];
}

function N_REPAIR_DIY(F, n) {
  const cat = F.cat.id;
  const first = F.symptomLabels.length ? `Pin down the fault: ${F.symptomLabels.join(', ').toLowerCase()}` : `Pin down exactly what is wrong with ${n}`;
  const steps = [first];
  if (cat === 'electronics') steps.push('Unplug it and make sure it is fully cool and dry before touching anything');
  steps.push('Search for a 5-minute video of this exact fault + model, and note the parts needed');
  steps.push(cat === 'clothing' ? 'Gather needle, matching thread, patches or a replacement zip/button' : cat === 'furniture' ? 'Gather wood glue, clamps, screws or brackets, sandpaper' : 'Order or borrow the right small parts and a precision screwdriver set');
  steps.push('Do the repair in a well-lit space, photographing each step so you can reverse it');
  steps.push('Test it gently; if it fails, switch to the professional route');
  return steps;
}

function repurposeSteps(F, n) {
  const c = F.cat.id;
  const idea = c === 'clothing' ? 'tote bag, cushion cover, cleaning rags, patchwork or a pet bed' : c === 'furniture' ? 'a planter stand, wall shelf, small side table or tool organiser' : 'a desk organiser, a plant pot, a decorative lamp base (with all power parts removed)';
  return [
    `Pick the idea you like best: ${idea}`,
    c === 'electronics' ? 'Remove batteries, power parts and anything that could be hazardous first' : 'Clean it and mark the parts you will keep',
    'Sketch the plan and list any materials (paint, thread, screws)',
    'Do a test piece or dry fit before making permanent changes',
    'Finish it, use it, and photograph the result for your shelf',
  ];
}
