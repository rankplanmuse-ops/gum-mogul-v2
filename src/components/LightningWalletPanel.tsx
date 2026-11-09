import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { GameState } from "@/types/game";
import { formatSats, makeSimInvoice, hasUpgrade, ZAP_PROMO_COST_SATS, SATS_PER_USD } from "@/lib/gameLogic";
import { Zap, Copy, QrCode, Megaphone, ArrowLeftRight, ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const LN_FACTS = [
  "Lightning settles in seconds, not days. Card payouts can take 2 to 3 business days.",
  "A Lightning payment can cost less than 1 sat in fees. Cards take about 2.9% plus 30c.",
  "Sats are tiny bitcoin slices: 1 bitcoin = 100,000,000 sats. This game uses a round 1,000 sats = $1 rate.",
  "Invoices are just payment requests. Scan, approve, settled. No card numbers shared.",
  "Lightning Addresses work like email for money: name@wallet.cool sends sats to a person.",
  "Anyone can receive Lightning with a phone wallet. No bank account, no card terminal contract.",
];

// Public tip jar of the BitcoinSaving project, used only for the optional real-world try-it link.
const MAKER_LN_ADDRESS = "bitcoinsaving@coinos.io";

interface Props {
  gameState: GameState;
  onReceive: (amount: number, label: string) => void;
  onZapPromo: () => void;
  onSellSats: (amount: number) => void;
  onRescueLoan: () => void;
}

export const LightningWalletPanel = ({ gameState, onReceive, onZapPromo, onSellSats, onRescueLoan }: Props) => {
  const [amount, setAmount] = useState(2100);
  const [memo, setMemo] = useState("Catering order");
  const [invoice, setInvoice] = useState<{ bolt11: string; amountSats: number; memo: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const terminal = hasUpgrade(gameState, "ln-terminal");
  const fact = LN_FACTS[gameState.day % LN_FACTS.length];
  const webln = typeof window !== "undefined" && "webln" in window;

  const simulatePay = () => {
    if (!invoice) return;
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
      onReceive(invoice.amountSats, `Invoice paid: ${invoice.memo}`);
    }, 1100);
  };

  return (
    <Card className="bubbly-card overflow-hidden">
      <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Zap className="h-7 w-7 animate-zap" /> Lightning Wallet
          </h2>
          <span className="text-xs font-black bg-white/25 rounded-full px-3 py-1 uppercase tracking-wide">Simulated sats · real tech</span>
        </div>
        <p className="text-4xl font-black mt-2 whitespace-nowrap overflow-hidden">{formatSats(gameState.sats)}</p>
        <p className="text-sm font-bold text-white/85 whitespace-nowrap overflow-hidden">≈ ${(gameState.sats / SATS_PER_USD).toFixed(2)} at game rate</p>
        <p className="text-sm font-bold text-white/85 whitespace-nowrap overflow-hidden">Earned all time: {formatSats(gameState.totalSatsEarned)}</p>
        <p className="text-sm font-bold text-white/85 whitespace-nowrap overflow-hidden min-h-[1.25rem]">{gameState.lnLoanSats > 0 ? `Loan owed: ${formatSats(gameState.lnLoanSats)}` : ""}</p>
      </div>

      <div className="p-5 space-y-5">
        {!terminal && (
          <div className="rounded-2xl bg-amber-400/10 border-2 border-amber-300/30 p-4 text-sm font-semibold">
            🔌 Your machines only take cards right now (2.9% fee on every sale). Buy the <strong>Lightning Terminal upgrade ($150)</strong> in the Empire section and 25% of customers start paying in sats: instant settlement, zero card fee.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onZapPromo} disabled={!terminal || gameState.sats < ZAP_PROMO_COST_SATS} className="rounded-full font-black gap-1">
            <Megaphone className="h-4 w-4" /> Zap Promo +2 days ({ZAP_PROMO_COST_SATS.toLocaleString()})
          </Button>
          <Button variant="outline" onClick={() => onSellSats(10000)} disabled={gameState.sats < 10000} className="rounded-full font-black gap-1">
            <ArrowLeftRight className="h-4 w-4" /> Sell 10,000 sats
          </Button>
        </div>
        {gameState.zapBoostDays > 0 && <p className="text-sm font-black text-fuchsia-600 animate-pop">📣 Zap promo active: +30% demand for {gameState.zapBoostDays} more day{gameState.zapBoostDays === 1 ? "" : "s"}!</p>}

        {(gameState.cash < 20 && !gameState.rescueUsed) && (
          <Button onClick={onRescueLoan} disabled={!terminal} className="w-full rounded-full font-black gap-1">
            <ShieldAlert className="h-4 w-4" /> Cash is tight: take a $200 Lightning rescue loan
          </Button>
        )}

        <div className="rounded-2xl border-[3px] border-dashed border-amber-300 p-4">
          <h3 className="font-black flex items-center gap-2"><QrCode className="h-5 w-5 text-amber-500" /> Create a Lightning invoice</h3>
          <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-1">This is how Lightning payments start: you make an invoice, the payer scans it. Try the full flow, simulated safely in game.</p>
          <div className="flex gap-2 mt-3">
            <Input type="number" value={amount} min={1} onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))} className="w-28 rounded-full" />
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} className="flex-1 rounded-full" placeholder="Memo" />
            <Button className="rounded-full font-black" onClick={() => { setInvoice(makeSimInvoice(amount, memo)); setPaid(false); }}>
              Create
            </Button>
          </div>
          {invoice && (
            <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center animate-pop">
              <div className="bg-white p-3 rounded-2xl border-2 shadow">
                <QRCodeSVG value={invoice.bolt11} size={132} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono break-all bg-muted rounded-xl p-2">{invoice.bolt11.slice(0, 72)}…</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="rounded-full font-bold gap-1" onClick={() => { navigator.clipboard?.writeText(invoice.bolt11); toast.success("Invoice copied"); }}>
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                  <Button size="sm" disabled={paying || paid} onClick={simulatePay} className="rounded-full font-black">
                    {paid ? "✅ Settled!" : paying ? "⚡ Settling…" : "Simulate a customer paying it"}
                  </Button>
                </div>
                <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-2">Real invoices start with lnbc too, and any Lightning wallet in the world could pay one.</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-black mb-2">Recent Lightning activity</h3>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {gameState.lnTx.length === 0 && <p className="text-sm text-muted-foreground font-semibold">No Lightning activity yet.</p>}
            {gameState.lnTx.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex justify-between text-sm font-semibold bg-muted/60 rounded-full px-3 py-1.5">
                <span className="truncate mr-2">Day {tx.day} · {tx.label}</span>
                <span className={tx.sats >= 0 ? "text-accent font-black" : "text-loss font-black"}>{tx.sats >= 0 ? "+" : ""}{tx.sats.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-sky-400/10 border-2 border-sky-300/30 p-4">
          <h3 className="font-black text-sky-900">🌍 Try real Lightning (optional, leaves the game)</h3>
          <p className="text-sm font-semibold text-sky-900/70 mt-1">
            WebLN in this browser: <strong>{webln ? "detected ⚡" : "not detected"}</strong>. Or zap the makers a few real sats at their Lightning Address:
          </p>
          <a href={`lightning:${MAKER_LN_ADDRESS}`} className="inline-flex items-center gap-1 mt-2 font-black text-sky-700 underline">
            ⚡ {MAKER_LN_ADDRESS} <ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-xs font-semibold text-sky-900/60 mt-1">Opens your own Lightning wallet. The game never holds real keys or real money.</p>
        </div>

        <p className="text-xs font-bold text-amber-300 bg-amber-400/10 rounded-xl p-3">⚡ Lightning fact of the day: {fact}</p>
      </div>
    </Card>
  );
};
