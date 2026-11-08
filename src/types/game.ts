export interface Product {
  id: string;
  name: string;
  emoji: string;
  color: string;
  costPrice: number;
  sellPrice: number;
  refPrice: number;
  baseDemand: number;
  stock: number;
  unlocked: boolean;
  unlockRevenue?: number;
}

export interface Location {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  city: string;
  traffic: number;
  rentPerMachine: number;
  unlockCost: number;
  unlocked: boolean;
  machines: number;
  machineCap?: number; // defaults to the global cap; the kiosk shop fits more
  requiresLocation?: string; // another location that must be open first (city gate)
}

export interface Upgrade {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  cost: number;
  owned: boolean;
}

export interface DayRecord {
  day: number;
  revenue: number;
  netProfit: number;
  satsEarned: number;
  unitsSold: number;
}

export interface LogEntry {
  id: number;
  day: number;
  icon: string;
  text: string;
  kind: "info" | "event" | "ln" | "unlock" | "warn";
}

export interface LnTx {
  id: number;
  day: number;
  label: string;
  sats: number;
}

// One unspent transaction output in the on-chain self-custody wallet.
// Every acquisition creates one; spending later pays per input, which is
// the whole UTXO management lesson.
export interface Utxo {
  id: number;
  day: number;
  sats: number;
  source: string; // route label, e.g. "KYC Exchange", "P2P Trade", "Mining payout"
  kyc: boolean; // identity-linked at purchase: carries data-hack risk
}

export interface GameEvent {
  id: string;
  icon: string;
  title: string;
  text: string;
  demandFactor: number;
}

export interface LastDaySummary {
  revenue: number;
  productCost: number;
  rent: number;
  marketing: number;
  depreciation: number;
  cardFees: number;
  miningFees: number;
  tax: number;
  netProfit: number;
  satsEarned: number;
  unitsSold: number;
  unitsStockedOut: number;
  lnShare: number;
}

// One loan from the Gum Bank. Several can run at once, as long as total
// debt stays within the bank's loan-to-value limit on your assets.
export interface BankLoan {
  id: number;
  tierId: string;
  name: string;
  emoji: string;
  principal: number;
  owed: number;
  dayTaken: number;
}

export interface GameState {
  cash: number;
  sats: number;
  totalRevenue: number;
  totalSatsEarned: number;
  day: number;
  machineValueEach: number;
  products: Product[];
  locations: Location[];
  upgrades: Upgrade[];
  marketingSpend: number;
  promoDays: Record<string, number>; // marketing channel id -> days of boost left
  ongoingMarketing: string[]; // always-on marketing activity ids currently running
  milestonesClaimed: number; // rungs of the net-worth ladder already rewarded
  btcOnchainSats: number; // self-custody on-chain balance (sum of utxos)
  utxos: Utxo[];
  btcFeeRate: number; // current mempool fee, sats per vByte, drifts daily
  miningOwned: boolean;
  miningMachines: number; // rigs in the fleet (no cap)
  miningActive: boolean;
  miningTotalFees: number; // USD paid in service fees, all time
  miningTotalMined: number; // sats mined, all time
  loans: BankLoan[]; // every active Gum Bank loan
  bankLoan: number; // mirror of total owed across loans (older saves/readers)
  bankLoanTier: string | null;
  restockLevel: string; // id into RESTOCK_LEVELS, used by the Restock Bot
  taxRate: number;
  depreciationRate: number;
  reputation: number;
  history: DayRecord[];
  log: LogEntry[];
  lnTx: LnTx[];
  achievements: string[];
  zapBoostDays: number;
  lnLoanSats: number;
  rescueUsed: boolean;
  negativeDays: number;
  gameOver: boolean;
  mogulReached: boolean;
  firstMachineUnpacked: boolean; // false while the first machine is still in its crate
  crateStep: number; // 0 sealed, 1 open, 2 uncovered, 3 ready to start
  pendingEvent: GameEvent | null;
  lastDay: LastDaySummary | null;
}

export interface CostBreakdown {
  revenue: number;
  productCost: number;
  rent: number;
  marketing: number;
  depreciation: number;
  cardFees: number;
  miningFees: number;
  tax: number;
  netProfit: number;
}
