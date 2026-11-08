import {
  GameState,
  Product,
  CostBreakdown,
  GameEvent,
  Location,
  Upgrade,
  Utxo,
} from "@/types/game";

// ---- Constants the whole game is tuned around ------------------------------
export const SATS_PER_USD = 1000; // game rate, kept round so the maths is teachable
export const MACHINE_COST = 400;
export const MAX_MACHINES_PER_LOCATION = 3;
export const MACHINE_BASE_VALUE = 500;
export const MOGUL_NET_WORTH = 250000; // the headline goal: Gum Tycoon

// ---- The milestone ladder ----------------------------------------------------
// Net-worth rungs at x10 steps: $2.5k, $25k, $250k, $2.5M, and on forever.
// Each rung pays a reward the moment your net worth crosses it: cash worth
// 10% of the rung plus the rung number again in sats.
export interface Milestone {
  threshold: number;
  title: string;
  emoji: string;
  cashReward: number;
  satsReward: number;
}

const MILESTONE_TITLES: { title: string; emoji: string }[] = [
  { title: "Gum Getter", emoji: "🌱" },
  { title: "GUM MOGUL", emoji: "👑" },
  { title: "Gum Tycoon", emoji: "🏙️" },
  { title: "Gum Empire", emoji: "🏦" },
  { title: "Gum Legend", emoji: "🌟" },
  { title: "Gum Myth", emoji: "🔮" },
];

export const milestoneAt = (index: number): Milestone => {
  const threshold = 2500 * Math.pow(10, index);
  const t = MILESTONE_TITLES[index] ?? { title: `Gum Myth ${index - 4}`, emoji: "🔮" };
  return { threshold, title: t.title, emoji: t.emoji, cashReward: threshold / 10, satsReward: threshold };
};

export const nextMilestone = (s: GameState): Milestone => milestoneAt(s.milestonesClaimed ?? 0);

export const currentRank = (s: GameState): string =>
  (s.milestonesClaimed ?? 0) > 0 ? milestoneAt((s.milestonesClaimed ?? 1) - 1).title : "Rookie";
export const CARD_FEE_RATE = 0.029; // what card sales cost you
export const LN_CUSTOMER_SHARE = 0.25; // share of sales paid over Lightning once you own a terminal (capped at 25%)
export const LN_SUPPLIER_DISCOUNT = 0.08; // paying suppliers over Lightning is 8% cheaper
export interface RestockLevel {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  factor: number; // fill target = demand forecast x factor
}

export const RESTOCK_LEVELS: RestockLevel[] = [
  { id: "lean", name: "Lean", emoji: "🥗", blurb: "Fill jars to 60% of capacity, best sellers first. Keeps cash free.", factor: 0.6 },
  { id: "standard", name: "Standard", emoji: "⚖️", blurb: "Fill every jar to capacity, split across gums by demand. The balanced default.", factor: 1 },
  { id: "loaded", name: "Loaded", emoji: "🎒", blurb: "Fill to capacity, best sellers first when cash is tight.", factor: 1 },
  { id: "maxout", name: "Max Out", emoji: "🚀", blurb: "Fill to capacity and round orders up to bulk discount tiers.", factor: 1 },
];

// Daily hosting and power bill for the mining fleet (0 when not mining).
export const miningDailyFee = (s: GameState): number =>
  s.miningOwned && s.miningActive ? (MINING_MONTHLY_FEE * (s.miningMachines ?? 1)) / 30 : 0;

export interface MarketingChannel {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  cost: number;
  days: number;
  factor: number; // demand multiplier while active
}

// One-off marketing campaigns, on top of the daily marketing slider and the
// Lightning zap promo. Each runs for a few days, then ends. They stack.
export const MARKETING_CHANNELS: MarketingChannel[] = [
  { id: "flyers", name: "Flyer Round", emoji: "📄", blurb: "Paper every noticeboard and bus stop in town.", cost: 25, days: 3, factor: 1.15 },
  { id: "social", name: "Social Blast", emoji: "📱", blurb: "A week of bubbly posts and one very chewable video.", cost: 60, days: 3, factor: 1.25 },
  { id: "radio", name: "Local Radio Spot", emoji: "📻", blurb: "Drive-time jingle. Nobody can unhear the pop.", cost: 150, days: 2, factor: 1.4 },
];

export const promoFactor = (s: GameState): number =>
  MARKETING_CHANNELS.reduce((f, c) => ((s.promoDays?.[c.id] ?? 0) > 0 ? f * c.factor : f), 1);

export interface OngoingMarketing {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  dailyCost: number;
  factor: number; // demand multiplier while running
  requiresRevenue: number; // lifetime revenue needed to start it
}

// Always-on marketing: toggle an activity on and it runs every day, billed
// daily, boosting demand until you switch it off. The bigger ones unlock as
// lifetime revenue grows, so marketing scales with the empire.
export const ONGOING_MARKETING: OngoingMarketing[] = [
  { id: "loyalty", name: "Loyalty Card Club", emoji: "💳", blurb: "Punch cards in every machine. Regulars build a daily habit.", dailyCost: 8, factor: 1.06, requiresRevenue: 0 },
  { id: "schools", name: "School Team Sponsor", emoji: "🏆", blurb: "Your logo on the local team kit. Kids and parents chew your colours.", dailyCost: 18, factor: 1.1, requiresRevenue: 250 },
  { id: "influencer", name: "Influencer Retainer", emoji: "🤳", blurb: "A local creator pops your gum in every video, every single day.", dailyCost: 40, factor: 1.16, requiresRevenue: 1500 },
  { id: "billboard", name: "Billboard Lease", emoji: "🪧", blurb: "A giant bubblegum billboard over the busiest road in town.", dailyCost: 85, factor: 1.22, requiresRevenue: 6000 },
  { id: "podcast", name: "Podcast Sponsorship", emoji: "🎙️", blurb: "A daily read on the city's biggest podcast. Mid-roll, every episode.", dailyCost: 160, factor: 1.28, requiresRevenue: 20000 },
  { id: "transit", name: "City Transit Ads", emoji: "🚌", blurb: "Every bus and tram wrapped in your colours, citywide, always on.", dailyCost: 300, factor: 1.35, requiresRevenue: 60000 },
];

export const ongoingFactor = (s: GameState): number =>
  ONGOING_MARKETING.reduce((f, a) => ((s.ongoingMarketing ?? []).includes(a.id) ? f * a.factor : f), 1);

export const ongoingDailyCost = (s: GameState): number =>
  ONGOING_MARKETING.reduce((n, a) => ((s.ongoingMarketing ?? []).includes(a.id) ? n + a.dailyCost : n), 0);

// Total daily marketing bill: slider spend plus every always-on activity.
export const dailyMarketingCost = (s: GameState): number => s.marketingSpend + ongoingDailyCost(s);

export interface LoanTier {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  interest: number; // flat, added to what you owe
  requiresRevenue: number; // lifetime revenue needed to qualify
  blurb: string;
}

// Gum Bank loans: cash now, repaid automatically from 10% of daily revenue
// (manual repayments any time). Several loans can run at once: the bank
// lends against your asset value, up to 50% loan-to-value across all loans,
// max 5 at a time. Owed counts against net worth.
export const MAX_LOANS = 5;
export const LOAN_LTV = 0.5;

export const assetValue = (s: GameState): number =>
  s.cash +
  s.sats / SATS_PER_USD +
  (s.btcOnchainSats ?? 0) / SATS_PER_USD +
  s.locations.reduce((n, l) => n + l.machines, 0) * s.machineValueEach +
  s.products.reduce((n, p) => n + p.stock * p.costPrice, 0);

export const totalBankOwed = (s: GameState): number =>
  (s.loans ?? []).length > 0
    ? (s.loans ?? []).reduce((n, l) => n + l.owed, 0)
    : (s.bankLoan ?? 0);

// Can this tier still be added? Returns an error string, or null if fine.
export const loanBlocker = (s: GameState, tier: LoanTier): string | null => {
  if (s.totalRevenue < tier.requiresRevenue) return `Needs $${tier.requiresRevenue.toLocaleString()} lifetime revenue`;
  if ((s.loans ?? []).length >= MAX_LOANS) return `Max ${MAX_LOANS} loans at once`;
  const newOwed = Math.round(tier.amount * (1 + tier.interest));
  const maxOwed = LOAN_LTV * (assetValue(s) + tier.amount);
  if (totalBankOwed(s) + newOwed > maxOwed) return "Not enough asset value (50% loan-to-value cap)";
  return null;
};

const syncLoanMirror = (s: GameState) => {
  s.bankLoan = (s.loans ?? []).reduce((n, l) => n + l.owed, 0);
  s.bankLoanTier = (s.loans ?? [])[0]?.tierId ?? null;
};

export const LOAN_TIERS: LoanTier[] = [
  { id: "starter", name: "Starter Loan", emoji: "🐷", amount: 250, interest: 0.2, requiresRevenue: 0, blurb: "Anyone qualifies. Pricey money for tight spots." },
  { id: "growth", name: "Growth Loan", emoji: "📈", amount: 1000, interest: 0.15, requiresRevenue: 500, blurb: "Needs $500 lifetime revenue. The expansion classic." },
  { id: "mogul", name: "Mogul Loan", emoji: "🏦", amount: 5000, interest: 0.1, requiresRevenue: 5000, blurb: "Needs $5,000 lifetime revenue. Best rate, kiosk money." },
];

export const takeLoan = (state: GameState, tierId: string): ActionResult => {
  const tier = LOAN_TIERS.find((t) => t.id === tierId);
  if (!tier) return { state, ok: false, message: "Unknown loan" };
  const blocker = loanBlocker(state, tier);
  if (blocker) return { state, ok: false, message: `${tier.name}: ${blocker}` };
  const s = { ...state, loans: (state.loans ?? []).map((l) => ({ ...l })), log: [...state.log] };
  const owed = Math.round(tier.amount * (1 + tier.interest));
  s.cash += tier.amount;
  s.loans = [...s.loans, { id: nextId(), tierId: tier.id, name: tier.name, emoji: tier.emoji, principal: tier.amount, owed, dayTaken: s.day }];
  syncLoanMirror(s);
  pushLog(s, tier.emoji, `${tier.name} approved: $${tier.amount.toLocaleString()} in the till. You owe $${owed.toLocaleString()} on this one (interest included); total bank debt is now $${s.bankLoan.toLocaleString()}, repaid from 10% of daily revenue, oldest first.`, "info");
  return { state: s, ok: true, message: `${tier.name}: $${tier.amount.toLocaleString()} borrowed (${s.loans.length} loan${s.loans.length === 1 ? "" : "s"} running)` };
};

export const repayLoan = (state: GameState, amount: number, loanId?: number): ActionResult => {
  const loans = state.loans ?? [];
  const loan = loanId !== undefined ? loans.find((l) => l.id === loanId) : loans[0];
  if (!loan) return { state, ok: false, message: "No loan to repay" };
  const pay = Math.min(amount, loan.owed, state.cash);
  if (pay <= 0) return { state, ok: false, message: "No spare cash to repay with" };
  const s = { ...state, loans: loans.map((l) => ({ ...l })), log: [...state.log] };
  const target = s.loans.find((l) => l.id === loan.id)!;
  s.cash -= pay;
  target.owed -= pay;
  if (target.owed <= 0.005) {
    s.loans = s.loans.filter((l) => l.id !== loan.id);
    syncLoanMirror(s);
    pushLog(s, "🎉", `${loan.name} fully repaid. The Gum Bank stamps your file: RELIABLE.`, "unlock");
    return { state: s, ok: true, message: `${loan.name} fully repaid 🎉` };
  }
  syncLoanMirror(s);
  return { state: s, ok: true, message: `Repaid $${pay.toFixed(2)} on ${loan.name} ($${target.owed.toFixed(2)} left)` };
};

// Bulk buying: the supplier rewards bigger orders. Applies to cash and sats
// payments; the Lightning 8% comes on top when paying in sats.
export const BULK_TIERS: { minQty: number; discount: number }[] = [
  { minQty: 100, discount: 0.15 },
  { minQty: 50, discount: 0.1 },
  { minQty: 25, discount: 0.05 },
];

export const bulkDiscountFor = (quantity: number): number => {
  for (const tier of BULK_TIERS) if (quantity >= tier.minQty) return tier.discount;
  return 0;
};

export const ZAP_PROMO_COST_SATS = 5000;
export const RESCUE_LOAN_USD = 200;
export const RESCUE_LOAN_SATS = 220000; // $200 at game rate, plus 10%
export const SAVE_KEY = "gum-mogul-save-v2";

export const INITIAL_PRODUCTS: Product[] = [
  { id: "basic", name: "Classic Gum", emoji: "🩷", color: "from-pink-400 to-rose-500", costPrice: 0.1, sellPrice: 0.25, refPrice: 0.25, baseDemand: 20, stock: 0, unlocked: true },
  { id: "premium", name: "Mint Fresh Pro", emoji: "🌿", color: "from-emerald-400 to-teal-500", costPrice: 0.3, sellPrice: 0.75, refPrice: 0.75, baseDemand: 12, stock: 0, unlocked: true },
  { id: "deluxe", name: "Berry Blast", emoji: "🫐", color: "from-violet-400 to-purple-600", costPrice: 0.5, sellPrice: 1.5, refPrice: 1.5, baseDemand: 8, stock: 0, unlocked: true },
  { id: "superior", name: "Citrus Supreme", emoji: "🍋", color: "from-amber-300 to-orange-500", costPrice: 0.8, sellPrice: 2.25, refPrice: 2.25, baseDemand: 5, stock: 0, unlocked: true },
  { id: "luxury", name: "Diamond Bubble", emoji: "💎", color: "from-sky-300 to-blue-500", costPrice: 1.5, sellPrice: 4.5, refPrice: 4.5, baseDemand: 3, stock: 0, unlocked: false, unlockRevenue: 300 },
  { id: "exclusive", name: "Platinum Chew", emoji: "👑", color: "from-slate-300 to-slate-500", costPrice: 3.0, sellPrice: 9.0, refPrice: 9.0, baseDemand: 2, stock: 0, unlocked: false, unlockRevenue: 800 },
  { id: "cosmic", name: "Cosmic Cola Fizz", emoji: "🚀", color: "from-fuchsia-400 to-pink-600", costPrice: 5.0, sellPrice: 15.0, refPrice: 15.0, baseDemand: 1, stock: 0, unlocked: false, unlockRevenue: 3000 },
];

export const CITIES = ["Bubbleville", "Neon Bay"] as const;

export const INITIAL_LOCATIONS: Location[] = [
  // City 1: Bubbleville, where every mogul starts.
  { id: "corner", name: "Corner Shop", emoji: "🏪", city: "Bubbleville", blurb: "Your first spot. Steady locals, kind rent.", traffic: 1.0, rentPerMachine: 5, unlockCost: 0, unlocked: true, machines: 0 },
  { id: "school", name: "School Gates", emoji: "🎒", city: "Bubbleville", blurb: "Recess rushes. Berry Blast flies off the shelf.", traffic: 1.4, rentPerMachine: 8, unlockCost: 200, unlocked: false, machines: 0 },
  { id: "bus", name: "Bus Station", emoji: "🚏", city: "Bubbleville", blurb: "Commuters with exact change and zero patience.", traffic: 1.7, rentPerMachine: 11, unlockCost: 400, unlocked: false, machines: 0 },
  { id: "arcade", name: "Arcade Alley", emoji: "🕹️", city: "Bubbleville", blurb: "Token rich, gum hungry, open late.", traffic: 2.0, rentPerMachine: 14, unlockCost: 600, unlocked: false, machines: 0 },
  { id: "university", name: "University Campus", emoji: "🎓", city: "Bubbleville", blurb: "All-nighters run on caffeine and Cosmic Cola Fizz.", traffic: 2.3, rentPerMachine: 18, unlockCost: 1000, unlocked: false, machines: 0 },
  { id: "mall", name: "Mega Mall", emoji: "🛍️", city: "Bubbleville", blurb: "Weekend crowds and premium tastes.", traffic: 2.6, rentPerMachine: 22, unlockCost: 1500, unlocked: false, machines: 0 },
  { id: "beach", name: "Beach Boardwalk", emoji: "🏖️", city: "Bubbleville", blurb: "Sun, salt air, and a queue at every machine.", traffic: 3.0, rentPerMachine: 28, unlockCost: 2500, unlocked: false, machines: 0 },
  { id: "airport", name: "Airport Terminal", emoji: "✈️", city: "Bubbleville", blurb: "Captive audience, mogul money. Opening this unlocks the move to Neon Bay.", traffic: 3.4, rentPerMachine: 35, unlockCost: 4000, unlocked: false, machines: 0 },
  // City 2: Neon Bay. Bigger crowds, bigger rents, opens once the Airport runs.
  { id: "ferry", name: "Ferry Pier", emoji: "⛴️", city: "Neon Bay", blurb: "Every crossing lands a boatload of fresh chewers.", traffic: 3.9, rentPerMachine: 42, unlockCost: 6000, unlocked: false, machines: 0, requiresLocation: "airport" },
  { id: "nightmarket", name: "Neon Night Market", emoji: "🌃", city: "Neon Bay", blurb: "Open till 3am. The lights alone sell half the gum.", traffic: 4.4, rentPerMachine: 50, unlockCost: 8000, unlocked: false, machines: 0, requiresLocation: "airport" },
  { id: "tech", name: "Tech District", emoji: "🏙️", city: "Neon Bay", blurb: "Startups pay in sats and chew Diamond Bubble at their desks.", traffic: 5.2, rentPerMachine: 60, unlockCost: 11000, unlocked: false, machines: 0, requiresLocation: "airport" },
  { id: "kiosk", name: "Gum Mogul Kiosk", emoji: "🛖", city: "Neon Bay", blurb: "Your OWN shop, not a rented slot: fits 5 machines under one bubbly roof. The endgame address.", traffic: 6.0, rentPerMachine: 70, unlockCost: 15000, unlocked: false, machines: 0, machineCap: 5, requiresLocation: "airport" },
];

export const machineCapOf = (loc: Location): number => loc.machineCap ?? MAX_MACHINES_PER_LOCATION;

export const INITIAL_UPGRADES: Upgrade[] = [
  { id: "ln-terminal", name: "Lightning Terminal", emoji: "⚡", blurb: "Accept Lightning in every machine. 25% of customers pay in sats: instant, no 2.9% card fee. Unlocks Lightning supplier payments, zap promos and rescue loans.", cost: 150, owned: false },
  { id: "big-jar", name: "Big Jar", emoji: "🫙", blurb: "+60% stock capacity in every machine.", cost: 120, owned: false },
  { id: "xl-jars", name: "Extra Large Jars", emoji: "🏺", blurb: "Cavernous jars: x2.5 stock capacity in every machine. Stacks with Big Jar (x4 total). Built for Max Out bots and kiosk life.", cost: 600, owned: false },
  { id: "jumbo-jars", name: "Jumbo Jars", emoji: "🪣", blurb: "Bucket-sized jars: x2 stock capacity in every machine. Stacks with Big Jar and Extra Large (x8 total). For empires that sell out by lunch.", cost: 2500, owned: false },
  { id: "gum-silos", name: "Gum Silos", emoji: "🏭", blurb: "Industrial silo storage plumbed into every machine: x2.5 stock capacity. Stacks with every jar upgrade (x20 total). The endgame warehouse.", cost: 12000, owned: false },
  { id: "neon", name: "Neon Sign", emoji: "💡", blurb: "+15% demand everywhere, forever. Very bubbly.", cost: 200, owned: false },
  { id: "displays", name: "Digital Displays", emoji: "📺", blurb: "Animated screens on every machine loop your flavours in glorious 8-bit, with a live price ticker. +12% demand everywhere.", cost: 500, owned: false },
  { id: "auto-restock", name: "Restock Bot", emoji: "🤖", blurb: "Every morning the bot restocks for you. Four fill levels: Lean, Standard, Loaded, Max Out. Set it and let Auto Play run.", cost: 350, owned: false },
  { id: "buyer-bot", name: "Procurement Negotiator", emoji: "🦾", blurb: "A ruthless little robot on the phone to your suppliers all day, haggling so you do not have to: 10% off EVERY stock purchase, forever. Stacks with bulk discounts and the 8% Lightning supplier discount.", cost: 500, owned: false },
];

export const EVENTS: GameEvent[] = [
  { id: "viral", icon: "📱", title: "Viral video!", text: "A kid blew a record bubble with your gum. Everyone wants some tomorrow.", demandFactor: 1.5 },
  { id: "heatwave", icon: "🌞", title: "Heatwave", text: "Mint flavours feel like air conditioning tomorrow.", demandFactor: 1.25 },
  { id: "school-trip", icon: "🚌", title: "School trip day", text: "Half your regulars are at the zoo tomorrow. Quieter day.", demandFactor: 0.7 },
  { id: "rain", icon: "🌧️", title: "Rainy day", text: "Foot traffic stays home tomorrow.", demandFactor: 0.8 },
  { id: "payday", icon: "💸", title: "Payday Friday", text: "Pockets are full tomorrow. Premium gum moves.", demandFactor: 1.3 },
  { id: "rival", icon: "🥊", title: "Rival machine", text: "A rival parks a machine across the street tomorrow.", demandFactor: 0.75 },
  { id: "festival", icon: "🎪", title: "Street festival", text: "The whole neighbourhood walks past your machines tomorrow.", demandFactor: 1.6 },
  { id: "exam", icon: "📚", title: "Exam week", text: "Stressed students chew through stock tomorrow.", demandFactor: 1.2 },
  { id: "jam", icon: "🔧", title: "Sticky mechanism", text: "One machine jams at random tomorrow. Demand dips a little.", demandFactor: 0.9 },
  { id: "dentist", icon: "🦷", title: "Dentist week", text: "The local dentist is running an anti-gum campaign tomorrow.", demandFactor: 0.85 },
];

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-sale", emoji: "🎉", name: "First Sale", desc: "Sell your first gum" },
  { id: "rev-500", emoji: "💵", name: "Side Hustle", desc: "$500 total revenue" },
  { id: "rev-5000", emoji: "💰", name: "Real Business", desc: "$5,000 total revenue" },
  { id: "rev-25000", emoji: "🏦", name: "Gum Empire", desc: "$25,000 total revenue" },
  { id: "machines-3", emoji: "🎰", name: "Triplets", desc: "Own 3 machines" },
  { id: "machines-6", emoji: "🏭", name: "Fleet Owner", desc: "Own 6 machines" },
  { id: "locations-3", emoji: "🗺️", name: "On The Map", desc: "Open 3 locations" },
  { id: "locations-8", emoji: "🌍", name: "Globetrotter", desc: "Open 8 locations" },
  { id: "two-cities", emoji: "🌃", name: "Two Cities", desc: "Open a location in Neon Bay" },
  { id: "kiosk", emoji: "🛖", name: "Shopkeeper", desc: "Open your own Gum Mogul Kiosk" },
  { id: "ln-terminal", emoji: "⚡", name: "Lightning Ready", desc: "Buy the Lightning Terminal" },
  { id: "sats-10000", emoji: "🟠", name: "Sats Stacker", desc: "Earn 10,000 sats all time" },
  { id: "sats-100000", emoji: "🚀", name: "Sats Whale", desc: "Earn 100,000 sats all time" },
  { id: "rep-90", emoji: "😍", name: "Loved", desc: "Reach 90 reputation" },
  { id: "day-30", emoji: "📅", name: "Survivor", desc: "Reach day 30" },
  { id: "day-100", emoji: "🏆", name: "Century", desc: "Reach day 100" },
  { id: "mogul", emoji: "👑", name: "GUM MOGUL", desc: `Reach $${MOGUL_NET_WORTH.toLocaleString()} net worth` },
];

let idCounter = 1;
const nextId = () => idCounter++ + Date.now() % 100000;

export const freshState = (): GameState => ({
  cash: 100,
  sats: 1000,
  totalRevenue: 0,
  totalSatsEarned: 0,
  day: 1,
  machineValueEach: MACHINE_BASE_VALUE,
  products: INITIAL_PRODUCTS.map((p) => ({ ...p })),
  locations: INITIAL_LOCATIONS.map((l) => ({ ...l })),
  upgrades: INITIAL_UPGRADES.map((u) => ({ ...u })),
  marketingSpend: 3,
  promoDays: {},
  ongoingMarketing: [],
  milestonesClaimed: 0,
  btcOnchainSats: 0,
  utxos: [],
  btcFeeRate: 12,
  miningOwned: false,
  miningMachines: 0,
  miningActive: false,
  miningTotalFees: 0,
  miningTotalMined: 0,
  loans: [],
  bankLoan: 0,
  bankLoanTier: null,
  restockLevel: "standard",
  taxRate: 0.15,
  depreciationRate: 0.01,
  reputation: 50,
  history: [],
  log: [
    { id: nextId(), day: 1, icon: "⚡", text: "A fan zapped 1,000 sats to your tip jar. Lightning is fast, huh?", kind: "ln" },
    { id: nextId(), day: 1, icon: "🍬", text: "Welcome, future Gum Mogul. First job: open the crate at the Corner Shop.", kind: "info" },
  ],
  lnTx: [{ id: nextId(), day: 1, label: "Tip jar zap from a fan", sats: 1000 }],
  achievements: [],
  zapBoostDays: 0,
  lnLoanSats: 0,
  rescueUsed: false,
  negativeDays: 0,
  gameOver: false,
  mogulReached: false,
  firstMachineUnpacked: false,
  crateStep: 0,
  pendingEvent: null,
  lastDay: null,
});

export const INITIAL_GAME_STATE: GameState = freshState();

// ---- Derived helpers ---------------------------------------------------------
export const hasUpgrade = (s: GameState, id: string) =>
  s.upgrades.find((u) => u.id === id)?.owned ?? false;

// The Procurement Negotiator upgrade shaves 10% off every stock purchase.
export const purchaseFactor = (s: GameState): number => (hasUpgrade(s, "buyer-bot") ? 0.9 : 1);

export const totalMachines = (s: GameState) =>
  s.locations.reduce((n, l) => n + l.machines, 0);

export const trafficUnits = (s: GameState) =>
  s.locations.reduce((n, l) => n + l.machines * l.traffic, 0);

export const dailyRent = (s: GameState) =>
  s.locations.reduce((n, l) => n + l.machines * l.rentPerMachine, 0);

export const stockCapacity = (s: GameState) =>
  Math.round(totalMachines(s) * 150 * (hasUpgrade(s, "big-jar") ? 1.6 : 1) * (hasUpgrade(s, "xl-jars") ? 2.5 : 1) * (hasUpgrade(s, "jumbo-jars") ? 2 : 1) * (hasUpgrade(s, "gum-silos") ? 2.5 : 1));

export const totalStock = (s: GameState) =>
  s.products.reduce((n, p) => n + p.stock, 0);

export const netWorth = (s: GameState) =>
  s.cash +
  s.sats / SATS_PER_USD +
  (s.btcOnchainSats ?? 0) / SATS_PER_USD +
  totalMachines(s) * s.machineValueEach +
  s.products.reduce((n, p) => n + p.stock * p.costPrice, 0) -
  s.lnLoanSats / SATS_PER_USD -
  totalBankOwed(s);

export const priceFactor = (p: Product) => {
  const f = Math.pow(p.refPrice / Math.max(0.01, p.sellPrice), 1.6);
  return Math.min(2.8, Math.max(0.15, f));
};

export const forecastDemand = (s: GameState, p: Product): number => {
  if (!p.unlocked) return 0;
  const marketing = 1 + s.marketingSpend * 0.018;
  const reputation = 0.7 + (s.reputation / 100) * 0.6;
  const neon = hasUpgrade(s, "neon") ? 1.15 : 1;
  const displays = hasUpgrade(s, "displays") ? 1.12 : 1;
  const event = s.pendingEvent?.demandFactor ?? 1;
  const zap = s.zapBoostDays > 0 ? 1.3 : 1;
  return p.baseDemand * trafficUnits(s) * priceFactor(p) * marketing * reputation * neon * displays * event * zap * promoFactor(s) * ongoingFactor(s);
};

const pushLog = (s: GameState, icon: string, text: string, kind: GameState["log"][number]["kind"]) => {
  s.log = [{ id: nextId(), day: s.day, icon, text, kind }, ...s.log].slice(0, 60);
};

// ---- Achievements --------------------------------------------------------------
export const unlockAchievements = (input: GameState): GameState => {
  const s = { ...input };
  const checks: [string, boolean][] = [
    ["first-sale", s.totalRevenue > 0],
    ["rev-500", s.totalRevenue >= 500],
    ["rev-5000", s.totalRevenue >= 5000],
    ["rev-25000", s.totalRevenue >= 25000],
    ["machines-3", totalMachines(s) >= 3],
    ["machines-6", totalMachines(s) >= 6],
    ["locations-3", s.locations.filter((l) => l.unlocked).length >= 3],
    ["locations-8", s.locations.filter((l) => l.unlocked).length >= 8],
    ["two-cities", s.locations.some((l) => l.city === "Neon Bay" && l.unlocked)],
    ["kiosk", s.locations.find((l) => l.id === "kiosk")?.unlocked ?? false],
    ["ln-terminal", hasUpgrade(s, "ln-terminal")],
    ["sats-10000", s.totalSatsEarned >= 10000],
    ["sats-100000", s.totalSatsEarned >= 100000],
    ["rep-90", s.reputation >= 90],
    ["day-30", s.day >= 30],
    ["day-100", s.day >= 100],
    ["mogul", netWorth(s) >= MOGUL_NET_WORTH],
  ];
  const fresh = checks.filter(([id, ok]) => ok && !s.achievements.includes(id)).map(([id]) => id);
  if (fresh.length) {
    s.achievements = [...s.achievements, ...fresh];
    s.log = [...s.log];
    fresh.forEach((id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) pushLog(s, a.emoji, `Achievement unlocked: ${a.name} (${a.desc})`, "unlock");
    });
    if (fresh.includes("mogul")) s.mogulReached = true;
  }
  return s;
};

// ---- Buying --------------------------------------------------------------------
export interface ActionResult {
  state: GameState;
  ok: boolean;
  message: string;
}

export const purchaseStock = (
  state: GameState,
  productId: string,
  quantity: number,
  payMethod: "cash" | "sats"
): ActionResult => {
  const product = state.products.find((p) => p.id === productId);
  if (!product || quantity <= 0) return { state, ok: false, message: "Pick a quantity first" };
  if (totalStock(state) + quantity > stockCapacity(state))
    return { state, ok: false, message: `Jar is full. Capacity is ${stockCapacity(state)} units (jar upgrades help)` };

  const bulk = bulkDiscountFor(quantity);
  const costUsd = product.costPrice * quantity * (1 - bulk) * purchaseFactor(state);
  const s = { ...state, products: state.products.map((p) => ({ ...p })), lnTx: [...state.lnTx], log: [...state.log] };

  if (payMethod === "sats") {
    if (!hasUpgrade(state, "ln-terminal"))
      return { state, ok: false, message: "Buy the Lightning Terminal upgrade to pay suppliers in sats" };
    const costSats = Math.ceil(costUsd * SATS_PER_USD * (1 - LN_SUPPLIER_DISCOUNT));
    if (costSats > state.sats) return { state, ok: false, message: `Not enough sats (needs ${costSats.toLocaleString()})` };
    s.sats -= costSats;
    s.lnTx = [{ id: nextId(), day: s.day, label: `Supplier: ${quantity}x ${product.name} (8% Lightning${bulk > 0 ? ` + ${Math.round(bulk * 100)}% bulk` : ""} discount)`, sats: -costSats }, ...s.lnTx].slice(0, 40);
  } else {
    if (costUsd > state.cash) return { state, ok: false, message: "Not enough cash" };
    s.cash -= costUsd;
  }
  const target = s.products.find((p) => p.id === productId)!;
  target.stock += quantity;
  return { state: s, ok: true, message: `Stocked ${quantity}x ${product.name}${bulk > 0 ? ` (bulk discount ${Math.round(bulk * 100)}% applied)` : ""}` };
};

export const buyMachine = (state: GameState, locationId: string): ActionResult => {
  const loc = state.locations.find((l) => l.id === locationId);
  if (!loc?.unlocked) return { state, ok: false, message: "Open that location first" };
  if (loc.machines >= machineCapOf(loc)) return { state, ok: false, message: `${loc.name} is full: ${machineCapOf(loc)} machines max here` };
  if (state.cash < MACHINE_COST) return { state, ok: false, message: `A machine costs $${MACHINE_COST}` };
  const s = { ...state, locations: state.locations.map((l) => ({ ...l })), log: [...state.log] };
  s.cash -= MACHINE_COST;
  s.locations.find((l) => l.id === locationId)!.machines += 1;
  pushLog(s, "🎰", `New machine installed at ${loc.name}. Capacity and demand up.`, "info");
  return { state: unlockAchievements(s), ok: true, message: `Machine installed at ${loc.name}` };
};

export const unlockLocation = (state: GameState, locationId: string): ActionResult => {
  const loc = state.locations.find((l) => l.id === locationId);
  if (!loc || loc.unlocked) return { state, ok: false, message: "Already open" };
  if (loc.requiresLocation) {
    const gate = state.locations.find((l) => l.id === loc.requiresLocation);
    if (gate && !gate.unlocked)
      return { state, ok: false, message: `${loc.city} opens after ${gate.name}: prove the model in Bubbleville first` };
  }
  if (state.cash < loc.unlockCost + MACHINE_COST)
    return { state, ok: false, message: `Needs $${loc.unlockCost} to open plus $${MACHINE_COST} for its first machine` };
  const s = { ...state, locations: state.locations.map((l) => ({ ...l })), log: [...state.log] };
  s.cash -= loc.unlockCost + MACHINE_COST;
  const target = s.locations.find((l) => l.id === locationId)!;
  target.unlocked = true;
  target.machines = 1;
  pushLog(s, loc.emoji, `${loc.name} is OPEN, first machine installed. ${loc.blurb}`, "unlock");
  return { state: unlockAchievements(s), ok: true, message: `${loc.name} opened` };
};

// The crate opening: four taps take the first machine from sealed crate to
// ready. Each step only advances the crate; the last one installs the machine.
export const advanceCrate = (state: GameState): ActionResult => {
  if (state.firstMachineUnpacked) return { state, ok: false, message: "Already unpacked" };
  const step = state.crateStep ?? 0;
  if (step < 3) {
    const messages = [
      "Lid is off. Something red is hiding under a cover.",
      "Cover is off and the panels are everywhere. It is the real thing.",
      "Wreckage cleared. Look at her.",
    ];
    return { state: { ...state, crateStep: step + 1 }, ok: true, message: messages[step] };
  }
  const s = { ...state, locations: state.locations.map((l) => ({ ...l })), log: [...state.log] };
  const corner = s.locations.find((l) => l.id === "corner");
  if (corner && corner.machines < 1) corner.machines = 1;
  s.firstMachineUnpacked = true;
  pushLog(s, "🍬", "First machine unpacked and standing at the Corner Shop. Stock it with gum, then hit Next Day.", "unlock");
  return { state: unlockAchievements(s), ok: true, message: "Your first machine is live. Stock it and hit Next Day." };
};

export const buyUpgrade = (state: GameState, upgradeId: string): ActionResult => {
  const up = state.upgrades.find((u) => u.id === upgradeId);
  if (!up || up.owned) return { state, ok: false, message: "Already owned" };
  if (state.cash < up.cost) return { state, ok: false, message: `Costs $${up.cost}` };
  const s = { ...state, upgrades: state.upgrades.map((u) => ({ ...u })), log: [...state.log] };
  s.cash -= up.cost;
  s.upgrades.find((u) => u.id === upgradeId)!.owned = true;
  pushLog(s, up.emoji, `Upgrade bought: ${up.name}. ${up.blurb}`, "unlock");
  return { state: unlockAchievements(s), ok: true, message: `${up.name} installed` };
};

// ---- Lightning actions -----------------------------------------------------------
export const makeSimInvoice = (amountSats: number, memo: string) => {
  const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  let tail = "";
  for (let i = 0; i < 120; i++) tail += charset[Math.floor(Math.random() * charset.length)];
  return { bolt11: `lnbc${Math.round(amountSats / 10)}n1${tail}`, memo, amountSats };
};

export const receiveSats = (state: GameState, amount: number, label: string): GameState => {
  const s = { ...state, lnTx: [...state.lnTx], log: [...state.log] };
  s.sats += amount;
  s.totalSatsEarned += amount;
  s.lnTx = [{ id: nextId(), day: s.day, label, sats: amount }, ...s.lnTx].slice(0, 40);
  pushLog(s, "⚡", `${label}: +${amount.toLocaleString()} sats, settled in seconds.`, "ln");
  return unlockAchievements(s);
};

export const zapPromo = (state: GameState): ActionResult => {
  if (!hasUpgrade(state, "ln-terminal")) return { state, ok: false, message: "Needs the Lightning Terminal" };
  if (state.sats < ZAP_PROMO_COST_SATS) return { state, ok: false, message: `Zap promo costs ${ZAP_PROMO_COST_SATS.toLocaleString()} sats` };
  const s = { ...state, lnTx: [...state.lnTx], log: [...state.log] };
  s.sats -= ZAP_PROMO_COST_SATS;
  // Days stack: every zap buys 2 MORE days of boost, even mid-promo.
  s.zapBoostDays = (s.zapBoostDays ?? 0) + 2;
  s.lnTx = [{ id: nextId(), day: s.day, label: "Zap promo: sponsored posts on Nostr", sats: -ZAP_PROMO_COST_SATS }, ...s.lnTx].slice(0, 40);
  pushLog(s, "📣", `Zap promo extended: +30% demand, now running for ${s.zapBoostDays} day${s.zapBoostDays === 1 ? "" : "s"} total. The internet loves a zap.`, "ln");
  return { state: s, ok: true, message: `Zap promo: +2 days (${s.zapBoostDays} days of boost banked)` };
};

export const takeRescueLoan = (state: GameState): ActionResult => {
  if (state.rescueUsed) return { state, ok: false, message: "The community already rescued you once" };
  if (!hasUpgrade(state, "ln-terminal")) return { state, ok: false, message: "Rescue loans ride Lightning: buy the Terminal first" };
  const s = { ...state, lnTx: [...state.lnTx], log: [...state.log] };
  s.cash += RESCUE_LOAN_USD;
  s.lnLoanSats += RESCUE_LOAN_SATS;
  s.rescueUsed = true;
  s.gameOver = false;
  s.negativeDays = 0;
  s.lnTx = [{ id: nextId(), day: s.day, label: `Lightning rescue loan received ($${RESCUE_LOAN_USD})`, sats: 0 }, ...s.lnTx].slice(0, 40);
  pushLog(s, "🛟", `Rescue loan: $${RESCUE_LOAN_USD} landed instantly over Lightning. You owe ${RESCUE_LOAN_SATS.toLocaleString()} sats, repaid automatically from 25% of your Lightning sales.`, "ln");
  return { state: s, ok: true, message: "Rescue loan received" };
};

export const sellSats = (state: GameState, amount: number): ActionResult => {
  if (amount <= 0 || amount > state.sats) return { state, ok: false, message: "Not enough sats" };
  const s = { ...state, lnTx: [...state.lnTx] };
  s.sats -= amount;
  s.cash += amount / SATS_PER_USD;
  s.lnTx = [{ id: nextId(), day: s.day, label: "Sold sats for cash", sats: -amount }, ...s.lnTx].slice(0, 40);
  return { state: s, ok: true, message: `Sold ${amount.toLocaleString()} sats` };
};

// ---- On-chain Bitcoin: self-custody wallet, UTXOs, acquisition routes --------
// Fiat profits can be turned into real (simulated) on-chain bitcoin. Every
// route lands as its own UTXO in YOUR wallet: self-custody, no exchange
// account. Routes differ in fees and in risk, and that is the lesson.
export interface BtcRoute {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  feePct: number; // share of the purchase lost to fees/premium
  kyc: boolean;
  riskNote: string;
}

export const BTC_ROUTES: BtcRoute[] = [
  { id: "exchange", name: "KYC Exchange", emoji: "🏛️", blurb: "Cheapest way in. Sign up with your ID, buy, withdraw to your wallet.", feePct: 0.008, kyc: true, riskNote: "Your name, ID and address sit in their database. Exchanges get hacked: leaked KYC data has led to wrench attacks and significant bitcoin losses. These UTXOs stay identity-linked." },
  { id: "p2p", name: "P2P Trade", emoji: "🤝", blurb: "Buy face to face or peer to peer, cash for sats. No ID database.", feePct: 0.05, kyc: false, riskNote: "You pay about 5% over the exchange price for privacy. No central database of you exists to hack." },
  { id: "atm", name: "Bitcoin ATM", emoji: "🏧", blurb: "Feed cash into a machine, scan your wallet QR, done. Instant and simple.", feePct: 0.15, kyc: false, riskNote: "Convenience costs: about 15% in fees and spread. Fine for small amounts, brutal for big ones." },
];

export const MINING_EQUIPMENT_COST = 7500;
export const MINING_MONTHLY_FEE = 1500;
export const MINING_REQUIRES_REVENUE = 50000;
export const MINING_EXPECTED_WEEKLY_SATS = 385000; // about $385/week at game rate, before variance

const addUtxo = (s: GameState, sats: number, source: string, kyc: boolean) => {
  const utxo: Utxo = { id: nextId(), day: s.day, sats, source, kyc };
  s.utxos = [...(s.utxos ?? []), utxo];
  s.btcOnchainSats = (s.btcOnchainSats ?? 0) + sats;
};

export const buyBtc = (state: GameState, routeId: string, usdAmount: number): ActionResult => {
  const route = BTC_ROUTES.find((r) => r.id === routeId);
  if (!route) return { state, ok: false, message: "Unknown route" };
  if (usdAmount < 10) return { state, ok: false, message: "Minimum buy is $10" };
  if (state.cash < usdAmount) return { state, ok: false, message: `You need $${usdAmount.toLocaleString()} cash for that buy` };
  const s = { ...state, utxos: [...(state.utxos ?? [])], log: [...state.log] };
  const received = Math.floor(usdAmount * SATS_PER_USD * (1 - route.feePct));
  s.cash -= usdAmount;
  addUtxo(s, received, route.name, route.kyc);
  pushLog(s, route.emoji, `Bought ${received.toLocaleString()} sats on-chain via ${route.name} for $${usdAmount.toLocaleString()} (${(route.feePct * 100).toFixed(1)}% in fees). New UTXO in your self-custody wallet.${route.kyc ? " It is identity-linked to your exchange account." : ""}`, "ln");
  return { state: s, ok: true, message: `+${received.toLocaleString()} sats on-chain via ${route.name}` };
};

export const sweepLightningToChain = (state: GameState, amountSats: number): ActionResult => {
  if (amountSats < 10000) return { state, ok: false, message: "Sweep at least 10,000 sats (small UTXOs cost more in future fees than they are worth)" };
  if (state.sats < amountSats) return { state, ok: false, message: "Not enough Lightning sats" };
  const swapFee = Math.ceil(amountSats * 0.01);
  const chainFee = Math.ceil(140 * (state.btcFeeRate ?? 12));
  const received = amountSats - swapFee - chainFee;
  if (received <= 0) return { state, ok: false, message: "Fees would eat the whole sweep at this size" };
  const s = { ...state, utxos: [...(state.utxos ?? [])], log: [...state.log] };
  s.sats -= amountSats;
  addUtxo(s, received, "Lightning sweep", false);
  pushLog(s, "🔄", `Swept ${amountSats.toLocaleString()} sats from Lightning to your on-chain wallet: ${received.toLocaleString()} sats landed as one UTXO (1% swap fee + ${chainFee.toLocaleString()} sats chain fee).`, "ln");
  return { state: s, ok: true, message: `Swept to chain: ${received.toLocaleString()} sats as one UTXO` };
};

// Estimated fee to merge every UTXO into one, at the current mempool rate.
// SegWit maths, simplified: 10 vB overhead + 68 vB per input + 31 vB output.
export const consolidationFeeSats = (s: GameState): number => {
  const n = (s.utxos ?? []).length;
  if (n < 2) return 0;
  return Math.ceil((10 + 68 * n + 31) * (s.btcFeeRate ?? 12));
};

export const consolidateUtxos = (state: GameState): ActionResult => {
  const utxos = state.utxos ?? [];
  if (utxos.length < 2) return { state, ok: false, message: "Nothing to consolidate yet (you need 2+ UTXOs)" };
  const fee = consolidationFeeSats(state);
  const total = utxos.reduce((n, u) => n + u.sats, 0);
  if (total <= fee) return { state, ok: false, message: "The consolidation fee would eat the whole balance. Wait for lower fees or a bigger balance." };
  const mixedKyc = utxos.some((u) => u.kyc);
  const s = { ...state, log: [...state.log] };
  s.utxos = [{ id: nextId(), day: s.day, sats: total - fee, source: "Consolidated", kyc: mixedKyc }];
  s.btcOnchainSats = total - fee;
  pushLog(s, "🧹", `Consolidated ${utxos.length} UTXOs into 1 for a ${fee.toLocaleString()} sat fee at ${s.btcFeeRate} sats/vB. Future spends now need a single input.${mixedKyc ? " Note: mixing KYC and non-KYC coins makes the whole output identity-linked." : ""}`, "ln");
  return { state: s, ok: true, message: `Consolidated ${utxos.length} UTXOs into 1 (fee ${fee.toLocaleString()} sats)` };
};

// Each additional rig costs 15% more than the last (rack space gets scarce).
// There is no fleet cap: add as many as your cash allows.
export const miningMachineCost = (state: GameState): number =>
  Math.round(MINING_EQUIPMENT_COST * Math.pow(1.15, state.miningMachines ?? (state.miningOwned ? 1 : 0)));

// Sats price of the next machine at the game rate, with the 8% Lightning
// supplier discount (paying in bitcoin is cheaper, like stock orders).
export const miningMachineSatsCost = (state: GameState): number =>
  Math.ceil(miningMachineCost(state) * SATS_PER_USD * (1 - LN_SUPPLIER_DISCOUNT));

export const buyMiningRig = (state: GameState, payWithSats = false): ActionResult => {
  const machines = state.miningMachines ?? (state.miningOwned ? 1 : 0);
  if (machines === 0 && state.totalRevenue < MINING_REQUIRES_REVENUE) return { state, ok: false, message: `Mining unlocks at $${MINING_REQUIRES_REVENUE.toLocaleString()} lifetime revenue` };
  const cost = miningMachineCost(state);
  const satsCost = miningMachineSatsCost(state);
  if (payWithSats) {
    if (!hasUpgrade(state, "ln-terminal")) return { state, ok: false, message: "Paying in sats needs the Lightning Terminal upgrade" };
    if (state.sats < satsCost) return { state, ok: false, message: `Machine #${machines + 1} costs ${satsCost.toLocaleString()} sats` };
  } else if (state.cash < cost) {
    return { state, ok: false, message: `Machine #${machines + 1} costs $${cost.toLocaleString()}` };
  }
  const s = { ...state, log: [...state.log] };
  if (payWithSats) {
    s.sats -= satsCost;
    s.lnTx = [{ id: nextId(), day: s.day, label: `Mining machine #${machines + 1} (8% sats discount)`, sats: -satsCost }, ...s.lnTx].slice(0, 40);
  } else {
    s.cash -= cost;
  }
  s.miningMachines = machines + 1;
  s.miningOwned = true;
  s.miningActive = true;
  pushLog(s, "⛏️", machines === 0
    ? `Mining as a service is live: $${cost.toLocaleString()} of equipment installed at a hosting facility, $${MINING_MONTHLY_FEE.toLocaleString()}/month in hosting and power per machine. Payouts land weekly, straight to your wallet. Difficulty and uptime mean some weeks pay well and some do not cover the fees. Add more machines any time; each new one costs 15% more rack space.`
    : `Machine #${machines + 1} installed for $${cost.toLocaleString()}. Your fleet now runs ${machines + 1} machines: $${(MINING_MONTHLY_FEE * (machines + 1)).toLocaleString()}/month in fees, roughly ${(MINING_EXPECTED_WEEKLY_SATS * (machines + 1)).toLocaleString()} sats expected per week before variance.`, "ln");
  return { state: s, ok: true, message: machines === 0 ? "Mining live: weekly payouts to your wallet" : `Machine #${machines + 1} mining` };
};

export const toggleMining = (state: GameState): ActionResult => {
  if (!state.miningOwned) return { state, ok: false, message: "No mining setup yet" };
  const s = { ...state, log: [...state.log] };
  s.miningActive = !state.miningActive;
  pushLog(s, "⛏️", s.miningActive ? "Mining resumed: hosting fees and weekly payouts are on again." : "Mining paused: no hosting fees, no payouts. The equipment sits idle.", "info");
  return { state: s, ok: true, message: s.miningActive ? "Mining on" : "Mining paused" };
};

export const buyMarketing = (state: GameState, channelId: string): ActionResult => {
  const channel = MARKETING_CHANNELS.find((c) => c.id === channelId);
  if (!channel) return { state, ok: false, message: "Unknown campaign" };
  if (state.cash < channel.cost) return { state, ok: false, message: `${channel.name} costs $${channel.cost}` };
  const s = { ...state, promoDays: { ...(state.promoDays ?? {}) }, log: [...state.log] };
  s.cash -= channel.cost;
  s.promoDays[channel.id] = Math.max(s.promoDays[channel.id] ?? 0, channel.days);
  pushLog(s, channel.emoji, `${channel.name} launched: +${Math.round((channel.factor - 1) * 100)}% demand for ${channel.days} days. ${channel.blurb}`, "info");
  return { state: s, ok: true, message: `${channel.name} live for ${channel.days} days` };
};

export const toggleOngoingMarketing = (state: GameState, activityId: string): ActionResult => {
  const activity = ONGOING_MARKETING.find((a) => a.id === activityId);
  if (!activity) return { state, ok: false, message: "Unknown activity" };
  const active = (state.ongoingMarketing ?? []).includes(activity.id);
  if (!active && state.totalRevenue < activity.requiresRevenue) {
    return { state, ok: false, message: `${activity.name} unlocks at $${activity.requiresRevenue.toLocaleString()} lifetime revenue (you have $${Math.floor(state.totalRevenue).toLocaleString()})` };
  }
  const s = { ...state, ongoingMarketing: [...(state.ongoingMarketing ?? [])], log: [...state.log] };
  if (active) {
    s.ongoingMarketing = s.ongoingMarketing.filter((id) => id !== activity.id);
    pushLog(s, activity.emoji, `${activity.name} switched off. The $${activity.dailyCost}/day bill stops tonight.`, "info");
    return { state: s, ok: true, message: `${activity.name} off` };
  }
  s.ongoingMarketing = [...s.ongoingMarketing, activity.id];
  pushLog(s, activity.emoji, `${activity.name} is live: +${Math.round((activity.factor - 1) * 100)}% demand every day for $${activity.dailyCost}/day, until you stop it.`, "info");
  return { state: s, ok: true, message: `${activity.name} live (+${Math.round((activity.factor - 1) * 100)}% demand, $${activity.dailyCost}/day)` };
};

// ---- Manual refill -------------------------------------------------------------------
// One shared planner for the Restock Bot and the manual "Refill jars" button:
// tops every unlocked gum up to forecast x fill level, jar room and cash
// permitting, at bulk-discounted prices.
export interface RefillLine { productId: string; qty: number; cost: number }
export const refillLines = (state: GameState): RefillLine[] => {
  const level = RESTOCK_LEVELS.find((l) => l.id === state.restockLevel) ?? RESTOCK_LEVELS[1];
  const stock = new Map(state.products.map((p) => [p.id, p.stock]));
  const pf = purchaseFactor(state);
  const capacity = stockCapacity(state);
  let room = capacity - totalStock(state);
  let cash = state.cash;
  const lines = new Map<string, RefillLine>();
  // Fill the jars: every unlocked gum gets a share of total jar capacity,
  // weighted by its forecast demand, and the fill level decides what
  // fraction of capacity to aim for (Standard and up: full jars). Best
  // sellers are stocked first, so when cash runs short the gums that
  // actually sell are the ones sitting full.
  const unlocked = state.products.filter((p) => p.unlocked);
  const forecasts = unlocked.map((p) => ({ p, f: forecastDemand(state, p) })).sort((a, b) => b.f - a.f);
  const totalF = forecasts.reduce((n, x) => n + x.f, 0);
  const roundUpGap = level.id === "maxout" ? 0.6 : 0.35;
  for (const { p, f } of forecasts) {
    const share = totalF > 0 ? (capacity * f) / totalF : capacity / Math.max(1, unlocked.length);
    const want = Math.ceil(share * level.factor);
    let qty = Math.min(Math.max(0, want - (stock.get(p.id) ?? 0)), room);
    while (qty > 0 && p.costPrice * qty * (1 - bulkDiscountFor(qty)) * pf > cash) qty -= 1;
    // Bulk-tier optimisation: when an order lands just under a discount
    // tier (25 / 50 / 100), round UP to the tier if jar room and cash
    // allow. The extra gums are the cheapest you will ever buy them,
    // and they shrink the next refill. Highest tier wins.
    if (qty > 0) {
      for (const tierQty of [25, 50, 100]) {
        if (qty < tierQty && tierQty - qty <= Math.max(5, qty * roundUpGap)
          && tierQty <= qty + room
          && p.costPrice * tierQty * (1 - bulkDiscountFor(tierQty)) * pf <= cash) {
          qty = tierQty;
        }
      }
    }
    if (qty > 0) {
      const cost = p.costPrice * qty * (1 - bulkDiscountFor(qty)) * pf;
      lines.set(p.id, { productId: p.id, qty, cost });
      stock.set(p.id, (stock.get(p.id) ?? 0) + qty);
      room -= qty;
      cash -= cost;
    }
  }
  return [...lines.values()];
};

export const refillJars = (state: GameState): ActionResult => {
  const lines = refillLines(state);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  if (units === 0) return { state, ok: false, message: "Jars are already full (or the till is empty)" };
  const total = lines.reduce((n, l) => n + l.cost, 0);
  const s = { ...state, products: state.products.map((p) => ({ ...p })) };
  for (const line of lines) {
    s.products.find((p) => p.id === line.productId)!.stock += line.qty;
  }
  s.cash -= total;
  return { state: s, ok: true, message: `Refilled ${units} gums for $${total.toFixed(2)} (bulk discounts applied where earned)` };
};

// ---- The day engine ----------------------------------------------------------------
export const processDayEnd = (input: GameState, rand: () => number = Math.random): GameState => {
  const s: GameState = {
    ...input,
    products: input.products.map((p) => ({ ...p })),
    locations: input.locations.map((l) => ({ ...l })),
    upgrades: input.upgrades.map((u) => ({ ...u })),
    history: [...input.history],
    log: [...input.log],
    lnTx: [...input.lnTx],
    achievements: [...input.achievements],
    promoDays: { ...(input.promoDays ?? {}) },
    ongoingMarketing: [...(input.ongoingMarketing ?? [])],
    utxos: (input.utxos ?? []).map((u) => ({ ...u })),
    loans: (input.loans ?? []).map((l) => ({ ...l })),
  };
  const finishedDay = s.day;

  // Restock Bot does its morning round before sales, using the same planner
  // as the manual Refill button, at the player's chosen fill level.
  if (hasUpgrade(s, "auto-restock")) {
    for (const line of refillLines(s)) {
      s.products.find((p) => p.id === line.productId)!.stock += line.qty;
      s.cash -= line.cost;
    }
  }

  let revenue = 0, productCost = 0, unitsSold = 0, stockedOut = 0, lossLeaderUnits = 0;
  for (const p of s.products) {
    if (!p.unlocked) continue;
    const mean = forecastDemand(s, p);
    const demand = Math.round(mean * (0.78 + rand() * 0.44));
    const sold = Math.min(p.stock, demand);
    stockedOut += demand - sold;
    p.stock -= sold;
    unitsSold += sold;
    revenue += sold * p.sellPrice;
    productCost += sold * p.costPrice;
    // Priced at or under cost, a gum is a loss leader: it loses money per
    // unit and buys reputation and foot traffic instead.
    if (p.sellPrice <= p.costPrice) lossLeaderUnits += sold;
  }

  const lnShare = hasUpgrade(s, "ln-terminal") ? LN_CUSTOMER_SHARE : 0;
  const lnRevenue = revenue * lnShare;
  const satsGross = Math.round(lnRevenue * SATS_PER_USD);
  let loanRepay = 0;
  if (s.lnLoanSats > 0 && satsGross > 0) {
    loanRepay = Math.min(s.lnLoanSats, Math.floor(satsGross * 0.25));
    s.lnLoanSats -= loanRepay;
  }
  const satsEarned = satsGross - loanRepay;
  s.sats += satsEarned;
  s.totalSatsEarned += satsGross;
  if (satsGross > 0) {
    s.lnTx = [{ id: nextId(), day: finishedDay, label: loanRepay > 0 ? `Lightning sales (loan repaid ${loanRepay.toLocaleString()} sats)` : "Lightning sales, settled instantly", sats: satsEarned }, ...s.lnTx].slice(0, 40);
  }

  const rent = dailyRent(s);
  const depreciation = totalMachines(s) * s.machineValueEach * s.depreciationRate;
  const cardFees = (revenue - lnRevenue) * CARD_FEE_RATE;
  const marketingCost = dailyMarketingCost(s);
  const miningFees = miningDailyFee(s);
  const taxable = Math.max(0, revenue - productCost - rent - marketingCost - depreciation - cardFees - miningFees);
  const tax = taxable * s.taxRate;
  const netProfit = revenue - productCost - rent - marketingCost - depreciation - cardFees - miningFees - tax;

  // Cash moves on real cash flows only: card+fiat sales land in the till,
  // Lightning sales land in the sats wallet, depreciation is value loss, not cash.
  s.cash += revenue - lnRevenue - rent - marketingCost - cardFees - miningFees - tax;
  s.machineValueEach = Math.max(100, s.machineValueEach - s.machineValueEach * s.depreciationRate);
  s.totalRevenue += revenue;

  // Gum Bank auto-repayment: 10% of today's revenue pays loans down,
  // oldest first, until the pool runs out.
  if ((s.loans ?? []).length > 0 && revenue > 0) {
    let pool = revenue * 0.1;
    for (const loan of s.loans) {
      if (pool <= 0) break;
      const pay = Math.min(loan.owed, pool, s.cash);
      if (pay <= 0) break;
      loan.owed -= pay;
      s.cash -= pay;
      pool -= pay;
    }
    const cleared = s.loans.filter((l) => l.owed <= 0.005);
    if (cleared.length) {
      s.loans = s.loans.filter((l) => l.owed > 0.005);
      cleared.forEach((l) => pushLog(s, "🎉", `The daily skim just paid off your ${l.name} in full.`, "unlock"));
    }
    syncLoanMirror(s);
  }

  // Mining as a service: hosting and power are billed daily, payouts land
  // weekly as a fresh UTXO. Difficulty and downtime make the payout swing:
  // some weeks beat the fees, some do not come close.
  if (s.miningOwned && s.miningActive) {
    const machines = s.miningMachines ?? 1;
    const dailyFee = miningFees; // already charged in the P&L above
    s.miningTotalFees = (s.miningTotalFees ?? 0) + dailyFee;
    if (finishedDay % 7 === 0) {
      const mult = rand() < 0.1 ? 0 : 0.3 + rand() * 1.9;
      const payout = Math.round(MINING_EXPECTED_WEEKLY_SATS * machines * mult);
      const weekFees = dailyFee * 7;
      if (payout > 0) {
        s.utxos = [...s.utxos, { id: nextId(), day: finishedDay, sats: payout, source: "Mining payout", kyc: false }];
        s.btcOnchainSats = (s.btcOnchainSats ?? 0) + payout;
        s.miningTotalMined = (s.miningTotalMined ?? 0) + payout;
      }
      pushLog(s, "⛏️", payout > 0
        ? `Mining week (${machines} machine${machines > 1 ? "s" : ""}): payout ${payout.toLocaleString()} sats (worth $${(payout / SATS_PER_USD).toFixed(0)}) against $${weekFees.toFixed(0)} of hosting fees. ${payout / SATS_PER_USD >= weekFees ? "Profitable week." : "Fees won this week."}`
        : `Mining week: the rigs were down (hosting outage). $0 payout against $${weekFees.toFixed(0)} of hosting fees. That is mining volatility.`, "ln");
    }
  }

  // Reputation: empty slots hurt, fair prices and full jars help.
  let rep = s.reputation;
  if (unitsSold === 0) rep -= 6;
  else if (stockedOut === 0) rep += 2;
  else rep -= Math.min(12, Math.ceil(stockedOut / 2));
  const avgFactor = s.products.filter((p) => p.unlocked).reduce((n, p) => n + priceFactor(p), 0) / Math.max(1, s.products.filter((p) => p.unlocked).length);
  if (avgFactor < 0.75) rep -= 3;
  if (avgFactor >= 0.95) rep += 1;
  // Loss leader buzz: people talk about the gum you are practically giving
  // away. Up to +4 reputation a day from loss-leader volume.
  const lossLeaderRep = Math.min(4, Math.floor(lossLeaderUnits / 20));
  if (lossLeaderRep > 0) {
    rep += lossLeaderRep;
    pushLog(s, "🎁", `Loss leader buzz: ${lossLeaderUnits} gums sold at a loss bought you +${lossLeaderRep} reputation today.`, "info");
  }
  s.reputation = Math.min(100, Math.max(5, rep));

  // Product unlocks
  for (const p of s.products) {
    if (!p.unlocked && p.unlockRevenue && s.totalRevenue >= p.unlockRevenue) {
      p.unlocked = true;
      pushLog(s, "🔓", `New gum unlocked: ${p.emoji} ${p.name}. Stock it tomorrow.`, "unlock");
    }
  }

  s.lastDay = {
    revenue, productCost, rent, marketing: marketingCost, depreciation, cardFees, miningFees, tax,
    netProfit, satsEarned, unitsSold, unitsStockedOut: stockedOut, lnShare,
  };
  s.history = [...s.history, { day: finishedDay, revenue, netProfit, satsEarned, unitsSold }].slice(-60);

  if (s.pendingEvent) pushLog(s, s.pendingEvent.icon, `${s.pendingEvent.title}: ${s.pendingEvent.text}`, "event");
  if (stockedOut > 0) pushLog(s, "😢", `${stockedOut} customers found an empty slot today. Restock!`, "warn");
  pushLog(s, netProfit >= 0 ? "📈" : "📉", `Day ${finishedDay}: sold ${unitsSold} gums for $${revenue.toFixed(2)}, profit $${netProfit.toFixed(2)}${satsEarned > 0 ? `, +${satsEarned.toLocaleString()} sats` : ""}.`, "info");

  // Roll tomorrow's event: about half of days get one.
  s.pendingEvent = rand() < 0.5 ? EVENTS[Math.floor(rand() * EVENTS.length)] : null;
  if (s.pendingEvent) pushLog(s, "🔮", `Tomorrow: ${s.pendingEvent.icon} ${s.pendingEvent.title} (demand x${s.pendingEvent.demandFactor})`, "event");

  if (s.zapBoostDays > 0) s.zapBoostDays -= 1;
  for (const id of Object.keys(s.promoDays)) {
    if (s.promoDays[id] > 0) s.promoDays[id] -= 1;
  }

  s.day += 1;
  if (s.cash < 0) {
    s.negativeDays += 1;
    pushLog(s, "⚠️", `Cash is negative (${s.negativeDays}/3). Three red days in a row ends the run.`, "warn");
    if (s.negativeDays >= 3) s.gameOver = true;
  } else s.negativeDays = 0;

  // KYC data-hack risk: exchanges leak. On a small share of days, holders
  // of identity-linked UTXOs get targeted and lose a slice of those coins.
  // P2P, ATM, swept and mined coins carry no such link.
  const kycSats = (s.utxos ?? []).filter((u) => u.kyc).reduce((n, u) => n + u.sats, 0);
  if (kycSats > 0 && rand() < 0.008) {
    let loss = Math.round(kycSats * 0.15);
    const lostTotal = loss;
    s.utxos = (s.utxos ?? []).map((u) => {
      if (!u.kyc || loss <= 0) return u;
      const take = Math.min(u.sats, loss);
      loss -= take;
      return { ...u, sats: u.sats - take };
    }).filter((u) => u.sats > 0);
    s.btcOnchainSats = Math.max(0, (s.btcOnchainSats ?? 0) - lostTotal);
    pushLog(s, "🕵️", `Exchange data hack fallout: your leaked KYC data was used to target you and ${lostTotal.toLocaleString()} sats of identity-linked bitcoin are gone. Coins bought without KYC were untouched. This is why people pay the P2P premium.`, "warn");
  }

  // Mempool fees drift daily: consolidation is cheap on quiet days.
  s.btcFeeRate = Math.max(3, Math.min(90, Math.round((s.btcFeeRate ?? 12) * (0.7 + rand() * 0.7))));

  // Milestone ladder: crossing a net-worth rung pays its reward at once,
  // and the loop handles several rungs crossed on one very good day.
  for (let guard = 0; guard < 12; guard++) {
    const m = milestoneAt(s.milestonesClaimed ?? 0);
    if (netWorth(s) < m.threshold) break;
    s.milestonesClaimed = (s.milestonesClaimed ?? 0) + 1;
    s.cash += m.cashReward;
    s.sats += m.satsReward;
    const next = milestoneAt(s.milestonesClaimed);
    pushLog(s, m.emoji, `MILESTONE: ${m.title}! Net worth crossed $${m.threshold.toLocaleString()}. Reward paid: $${m.cashReward.toLocaleString()} cash + ${m.satsReward.toLocaleString()} sats. Next rung: ${next.title} at $${next.threshold.toLocaleString()}.`, "unlock");
  }

  return unlockAchievements(s);
};

export const forecastCosts = (s: GameState): CostBreakdown => {
  // Expected-value preview at forecast demand (no randomness), for the P&L panel.
  let revenue = 0, productCost = 0;
  for (const p of s.products) {
    const sold = Math.min(p.stock, Math.round(forecastDemand(s, p)));
    revenue += sold * p.sellPrice;
    productCost += sold * p.costPrice;
  }
  const lnRevenue = revenue * (hasUpgrade(s, "ln-terminal") ? LN_CUSTOMER_SHARE : 0);
  const rent = dailyRent(s);
  const depreciation = totalMachines(s) * s.machineValueEach * s.depreciationRate;
  const cardFees = (revenue - lnRevenue) * CARD_FEE_RATE;
  const marketingCost = dailyMarketingCost(s);
  const miningFees = miningDailyFee(s);
  const taxable = Math.max(0, revenue - productCost - rent - marketingCost - depreciation - cardFees - miningFees);
  const tax = taxable * s.taxRate;
  return { revenue, productCost, rent, marketing: marketingCost, depreciation, cardFees, miningFees, tax, netProfit: revenue - productCost - rent - marketingCost - depreciation - cardFees - miningFees - tax };
};

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export const formatSats = (sats: number): string => `${Math.round(sats).toLocaleString()} sats`;
export const SATS_PER_BTC = 100_000_000;
export const formatBtc = (sats: number): string => `${(sats / SATS_PER_BTC).toFixed(8)} BTC`;
