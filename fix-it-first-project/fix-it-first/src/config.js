// ─────────────────────────────────────────────────────────────
//  ALL tunable knowledge lives here: categories, symptoms, option
//  profiles, factor definitions and scoring modes.
//  A new twist (budget cap, new user type, eco-first…) = edit this
//  file + a little UI, never the engine logic.
// ─────────────────────────────────────────────────────────────

export const CATEGORIES = {
  electronics: {
    id: 'electronics', label: 'Electronics & appliances', icon: '🔌',
    examples: 'Phone, kettle, headphones, fan, mixer',
    expectedLife: 6,      // years
    minService: 300,      // ₹ typical minimum shop charge
    embodiedCO2: 45,      // kg CO₂e to make a typical new one (indicative)
    repurposability: 0.5, electrical: true,
  },
  clothing: {
    id: 'clothing', label: 'Clothing & footwear', icon: '👕',
    examples: 'Jeans, jacket, sneakers, bag',
    expectedLife: 4, minService: 80, embodiedCO2: 15,
    repurposability: 0.9, electrical: false,
  },
  furniture: {
    id: 'furniture', label: 'Furniture & home', icon: '🪑',
    examples: 'Chair, shelf, table, lamp stand',
    expectedLife: 12, minService: 250, embodiedCO2: 55,
    repurposability: 0.85, electrical: false,
  },
};

// severity 1-3 (3 = worst) · difficulty 1-3 (DIY skill needed) · parts = fraction of replacement value
// safety: 'electrical' | 'structural' marks risks that change what is sensible.
export const SYMPTOMS = {
  electronics: [
    { id: 'noPower', label: "Won't turn on", severity: 3, difficulty: 2, parts: 0.35 },
    { id: 'battery', label: 'Battery drains fast', severity: 2, difficulty: 2, parts: 0.25 },
    { id: 'swollen', label: 'Swollen battery / bulging', severity: 3, difficulty: 3, parts: 0.3, safety: 'electrical' },
    { id: 'screen', label: 'Cracked screen / display', severity: 2, difficulty: 3, parts: 0.4 },
    { id: 'port', label: 'Loose port or cable fault', severity: 1, difficulty: 2, parts: 0.12 },
    { id: 'sparks', label: 'Sparks / burning smell', severity: 3, difficulty: 3, parts: 0.5, safety: 'electrical' },
    { id: 'overheat', label: 'Overheating', severity: 2, difficulty: 2, parts: 0.3, safety: 'electrical' },
    { id: 'water', label: 'Water damage', severity: 3, difficulty: 3, parts: 0.5 },
    { id: 'noisy', label: 'Rattling / noisy', severity: 1, difficulty: 1, parts: 0.08 },
    { id: 'buttons', label: 'Buttons not responding', severity: 1, difficulty: 2, parts: 0.15 },
  ],
  clothing: [
    { id: 'seam', label: 'Torn seam / split', severity: 1, difficulty: 1, parts: 0.08 },
    { id: 'hole', label: 'Hole or tear in fabric', severity: 1, difficulty: 1, parts: 0.07 },
    { id: 'zip', label: 'Zip stuck or broken', severity: 1, difficulty: 2, parts: 0.12 },
    { id: 'button', label: 'Button missing', severity: 1, difficulty: 1, parts: 0.03 },
    { id: 'sole', label: 'Sole coming off', severity: 2, difficulty: 2, parts: 0.25 },
    { id: 'stain', label: 'Stain / faded colour', severity: 1, difficulty: 1, parts: 0.05, cosmetic: true },
    { id: 'fit', label: "Shrunk / doesn't fit", severity: 2, difficulty: 2, parts: 0.15 },
    { id: 'thin', label: 'Fabric worn thin', severity: 3, difficulty: 3, parts: 0.4 },
  ],
  furniture: [
    { id: 'wobble', label: 'Wobbly / loose joint', severity: 1, difficulty: 1, parts: 0.05 },
    { id: 'drawer', label: 'Drawer or door jammed', severity: 1, difficulty: 1, parts: 0.06 },
    { id: 'hinge', label: 'Broken hinge / handle', severity: 1, difficulty: 1, parts: 0.05 },
    { id: 'scratch', label: 'Scratched / stained surface', severity: 1, difficulty: 1, parts: 0.1, cosmetic: true },
    { id: 'leg', label: 'Broken leg / panel', severity: 2, difficulty: 2, parts: 0.2, safety: 'structural' },
    { id: 'uphol', label: 'Torn upholstery', severity: 2, difficulty: 3, parts: 0.3 },
    { id: 'frame', label: 'Cracked frame', severity: 3, difficulty: 3, parts: 0.45, safety: 'structural' },
    { id: 'mould', label: 'Water / mould damage', severity: 3, difficulty: 3, parts: 0.5 },
  ],
};

export const SAFETY_WORDS = ['spark', 'smoke', 'burning', 'burnt', 'shock', 'swollen', 'bulging', 'melted', 'fire', 'hot to touch', 'leak'];

export const OPTIONS = {
  repair:    { id: 'repair',    label: 'Repair',    icon: '🛠️', color: '#2f7a52', tagline: 'Fix it and keep using it',            ecoAvoided: 0.9,  keep: 1.0,  eco: 0.95 },
  reuse:     { id: 'reuse',     label: 'Reuse',     icon: '🤝', color: '#1f8a8a', tagline: 'Sell, donate or pass it on',          ecoAvoided: 0.75, keep: 0.45, eco: 0.85 },
  repurpose: { id: 'repurpose', label: 'Repurpose', icon: '🎨', color: '#c9822b', tagline: 'Give it a brand-new job',             ecoAvoided: 0.7,  keep: 0.8,  eco: 0.8 },
  replace:   { id: 'replace',   label: 'Replace',   icon: '🛒', color: '#b5483a', tagline: 'Buy a new one (scored fairly)',       ecoAvoided: 0,    keep: 0.15, eco: 0.1 },
  recycle:   { id: 'recycle',   label: 'Recycle',   icon: '♻️', color: '#3b6fb0', tagline: 'Send materials back into use',        ecoAvoided: 0.3,  keep: 0.1,  eco: 0.45 },
};
export const OPTION_ORDER = ['repair', 'reuse', 'repurpose', 'replace', 'recycle'];

// The factors every option is scored on. `adjustable` ones get a what-if slider.
export const FACTORS = {
  cost:      { id: 'cost',      label: 'Affordability',       adjustable: true,  hint: 'How cheap is it, vs. your budget and the price of new?' },
  effort:    { id: 'effort',    label: 'Time & effort',       adjustable: true,  hint: 'Does it fit the time and skill you have?' },
  eco:       { id: 'eco',       label: 'Environmental impact',adjustable: true,  hint: 'How much waste and carbon does it avoid?' },
  keep:      { id: 'keep',      label: 'Sentimental value',   adjustable: true,  hint: 'How well does it respect your attachment to the item?' },
  safety:    { id: 'safety',    label: 'Safety',              adjustable: false, hint: 'Is it safe for you and whoever gets it next?' },
  feasible:  { id: 'feasible',  label: 'Likely to work',      adjustable: false, hint: 'Realistic chance this route succeeds' },
  need:      { id: 'need',      label: 'Meets your need',     adjustable: false, hint: 'Do you still need this item to do its job?' },
  longevity: { id: 'longevity', label: 'Life left in item',   adjustable: false, hint: 'Is the item old enough that investing more is unwise?' },
};

// Fixed (non-slider) weights. Safety is boosted automatically when a risk is detected.
export const FIXED_WEIGHTS = { safety: 0.6, safetyRisk: 3, feasible: 1.4, need: 1.0, longevity: 0.7 };

// Scoring modes = presets of the slider importances (0-10). `keep` always follows the sentiment answer.
export const MODES = {
  balanced: { id: 'balanced', label: 'Balanced',    icon: '⚖️', blurb: 'Everything weighed evenly',       importance: { cost: 5,  effort: 5,  eco: 5 } },
  eco:      { id: 'eco',      label: 'Eco-first',   icon: '🌱', blurb: 'Lowest waste wins',               importance: { cost: 3,  effort: 3,  eco: 10 } },
  budget:   { id: 'budget',   label: 'Budget-first',icon: '💸', blurb: 'Spend as little as possible',     importance: { cost: 10, effort: 4,  eco: 3 } },
  quick:    { id: 'quick',    label: 'Quick & easy',icon: '⚡', blurb: 'Least time and hassle',           importance: { cost: 4,  effort: 10, eco: 3 } },
};

export const SKILLS = [
  { v: 1, label: 'Beginner', blurb: 'Tape, glue & a screwdriver at most' },
  { v: 2, label: 'Comfortable', blurb: 'Can follow a tutorial' },
  { v: 3, label: 'Handy', blurb: 'Own tools, done repairs before' },
];
export const TIMES = [
  { v: 'quick', label: 'About an hour', hours: 1 },
  { v: 'evening', label: 'An evening', hours: 3 },
  { v: 'weekend', label: 'A weekend', hours: 8 },
];
export const SENTIMENT_LABELS = ['Just stuff', 'Mildly fond', 'Fairly attached', 'Very attached', 'Irreplaceable'];

export const EXAMPLES = [
  {
    label: 'Kettle that won\'t switch on', icon: '🔌',
    item: { name: 'Electric kettle', category: 'electronics', age: 3, value: 1800 },
    problem: { symptoms: ['noPower'], text: 'Light does not come on at all, base feels fine.' },
    ctx: { budget: 1000, skill: 2, time: 'evening', sentiment: 1, need: 'yes' },
  },
  {
    label: 'Favourite torn jeans', icon: '👕',
    item: { name: 'Favourite denim jeans', category: 'clothing', age: 2, value: 2500 },
    problem: { symptoms: ['hole', 'seam'], text: 'Ripped at the knee and the back seam is opening.' },
    ctx: { budget: 500, skill: 1, time: 'evening', sentiment: 4, need: 'yes' },
  },
  {
    label: 'Cracked-frame chair', icon: '🪑',
    item: { name: 'Study chair', category: 'furniture', age: 9, value: 4500 },
    problem: { symptoms: ['frame', 'wobble'], text: 'Frame cracked near the seat joint and it wobbles.' },
    ctx: { budget: 2000, skill: 1, time: 'weekend', sentiment: 2, need: 'no' },
  },
];
