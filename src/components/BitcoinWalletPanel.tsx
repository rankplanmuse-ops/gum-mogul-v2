import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameState } from "@/types/game";
import {
  formatCurrency, formatSats, formatBtc, BTC_ROUTES, SATS_PER_USD, consolidationFeeSats,
  MINING_EQUIPMENT_COST, MINING_MONTHLY_FEE, MINING_REQUIRES_REVENUE, miningMachineCost,
  MINING_EXPECTED_WEEKLY_SATS, miningMachineSatsCost, hasUpgrade,
} from "@/lib/gameLogic";
import { Bitcoin, ShieldCheck, Layers, Pickaxe } from "lucide-react";

interface Props {
  gameState: GameState;
  onBuyBtc: (routeId: string, usd: number) => void;
  onSweep: (amountSats: number) => void;
  onConsolidate: () => void;
  onBuyMining: (payWithSats: boolean) => void;
  onToggleMining: () => void;
}

export const BitcoinWalletPanel = ({ gameState, onBuyBtc, onSweep, onConsolidate, onBuyMining, onToggleMining }: Props) => {
  const [amount, setAmount] = useState("500");
  const usd = Math.max(0, Math.floor(Number(amount) || 0));
  const utxos = gameState.utxos ?? [];
  const onchain = gameState.btcOnchainSats ?? 0;
  const consolidateFee = consolidationFeeSats(gameState);
  const sorted = [...utxos].sort((a, b) => b.sats - a.sats);

  return (
    <Card className="bubbly-card p-5 mt-6 bg-gradient-to-br from-amber-400/15 to-orange-400/10">
      <h3 className="font-black text-lg flex items-center gap-2">
        <Bitcoin className="h-5 w-5 text-amber-600" /> Bitcoin Vault: self-custody, on-chain
      </h3>
      <p className="text-[13px] font-bold text-muted-foreground mt-1 leading-relaxed">
        Turn fiat profits into bitcoin you actually hold. No exchange account, no custodian: every buy lands in your own wallet as a UTXO, and you manage those UTXOs like a grown-up bitcoiner.
      </p>

      <div className="mt-3 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white p-4 sm:p-5 shadow-[0_10px_0_rgba(120,53,15,0.35)]">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white text-base font-black">₿</span>
            Gum Mogul Vault
          </p>
          <span className="text-[10px] font-black bg-white/15 rounded-full px-2 py-0.5">SELF-CUSTODY · SIMULATED</span>
        </div>
        <p className="font-black text-3xl sm:text-4xl mt-3 tabular-nums whitespace-nowrap overflow-hidden">{formatBtc(onchain)}</p>
        <p className="text-sm font-bold text-amber-200/90 mt-0.5 whitespace-nowrap overflow-hidden">= {formatSats(onchain)} · worth {formatCurrency(onchain / SATS_PER_USD)}</p>
        <p className="text-[11px] font-black text-white/70 mt-1">1 BTC = 100,000,000 sats. Sats are just slices of a bitcoin: stack enough of them and the decimals above start to move.</p>
        <p className="font-mono text-[11px] text-white/50 mt-2 truncate">bc1qgummogu1vau1t · in-game address, not a real wallet</p>
        <div className="flex gap-2 mt-3 flex-nowrap overflow-x-auto text-[11px] font-black [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="bg-white/10 rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap">🧾 {utxos.length} UTXO{utxos.length === 1 ? "" : "s"}</span>
          <span className="bg-white/10 rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap">⛽ {gameState.btcFeeRate} sats/vB today</span>
          <span className="bg-white/10 rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap">⚡ Lightning: {formatSats(gameState.sats)}</span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-black flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-amber-600" /> Buy bitcoin with cash profits</p>
        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <Input type="number" min={10} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32 rounded-full font-black" aria-label="USD amount to convert" />
          {[100, 500, 1000, 5000].map((v) => (
            <Button key={v} variant="secondary" onClick={() => setAmount(String(v))} className="rounded-full font-black min-h-9">${v.toLocaleString()}</Button>
          ))}
          <span className="text-xs font-bold text-muted-foreground">Cash available: {formatCurrency(gameState.cash)}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-2">
          {BTC_ROUTES.map((r) => {
            const received = Math.floor(usd * SATS_PER_USD * (1 - r.feePct));
            return (
              <div key={r.id} className="bg-white/10 rounded-2xl border border-white/10 p-3">
                <p className="font-black text-sm">{r.emoji} {r.name} {r.kyc && <span className="text-[10px] bg-rose-400/20 text-rose-300 rounded-full px-2 py-0.5 align-middle">KYC</span>}</p>
                <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-0.5">{r.blurb}</p>
                <p className="text-[11px] font-black text-amber-700 mt-1">Fee {(r.feePct * 100).toFixed(1)}% · you receive about {received.toLocaleString()} sats</p>
                <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-1">{r.riskNote}</p>
                <Button onClick={() => onBuyBtc(r.id, usd)} disabled={usd < 10 || gameState.cash < usd} className="w-full rounded-full font-black mt-2 h-9">
                  Buy {formatCurrency(usd)} of BTC
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 bg-white/10 rounded-2xl border border-white/10 p-3">
        <p className="text-sm font-black">🔄 Sweep Lightning sats on-chain</p>
        <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-0.5">Lightning is for spending; on-chain is for saving. Sweeping costs a 1% swap fee plus the chain fee, and lands as one clean UTXO. Minimum 10,000 sats: tiny UTXOs cost more to spend later than they are worth.</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[10000, 50000, 250000].map((v) => (
            <Button key={v} variant="secondary" onClick={() => onSweep(v)} disabled={gameState.sats < v} className="rounded-full font-black min-h-9">Sweep {v.toLocaleString()}</Button>
          ))}
          <Button variant="secondary" onClick={() => onSweep(Math.floor(gameState.sats))} disabled={gameState.sats < 10000} className="rounded-full font-black min-h-9">Sweep all {formatSats(gameState.sats)}</Button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-black flex items-center gap-1.5"><Layers className="h-4 w-4 text-amber-600" /> Your UTXOs</p>
        <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-0.5">
          Every receive is a separate coin. Spending later pays a fee per input, so 20 small UTXOs can cost a fortune to move when fees spike. Consolidate them into one while fees are low, and never mix KYC coins with clean ones unless you accept the whole output becoming identity-linked.
        </p>
        {utxos.length === 0 ? (
          <p className="text-xs font-bold text-muted-foreground mt-2">No UTXOs yet. Buy bitcoin above, sweep Lightning sats, or mine some.</p>
        ) : (
          <div className="max-h-44 overflow-y-auto space-y-1 mt-2 pr-1">
            {sorted.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 bg-white/10 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold">
                <span>{u.source} <span className="text-muted-foreground">· day {u.day}</span> {u.kyc && <span className="text-[10px] bg-rose-400/20 text-rose-300 rounded-full px-2 py-0.5">KYC-linked</span>}</span>
                <span className="tabular-nums">{u.sats.toLocaleString()} sats</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] font-bold text-muted-foreground mt-2">Consolidation fee: about {consolidateFee.toLocaleString()} sats at today's {gameState.btcFeeRate} sats/vB.</p>
        <Button onClick={onConsolidate} disabled={utxos.length < 2 || onchain <= consolidateFee} className="w-full rounded-full font-black mt-1">
          🧹 Consolidate {utxos.length} UTXOs into 1
        </Button>
      </div>

      <div className="mt-4 bg-white/10 rounded-2xl border border-white/10 p-3">
        <p className="text-sm font-black flex items-center gap-1.5"><Pickaxe className="h-4 w-4 text-amber-600" /> Mining as a service</p>
        <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-0.5">
          No KYC route that PRINTS bitcoin: a hosting company runs your machines. First machine {formatCurrency(MINING_EQUIPMENT_COST)}, then {formatCurrency(MINING_MONTHLY_FEE)}/month per machine in power and hosting, billed daily and shown in your P&L. Add as many machines as you like: every new one costs 15% more rack space, and fees and expected payouts scale with the fleet. Machines are payable in cash or in sats: paying over Lightning takes 8% off the price. Payouts land weekly in your wallet and swing hard with difficulty and uptime. Needs {formatCurrency(MINING_REQUIRES_REVENUE)} lifetime revenue to start.
        </p>
        {gameState.miningOwned ? (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-black">
              {gameState.miningActive ? "⛏️ Mining: ON" : "⏸️ Mining: paused"} · fleet: {gameState.miningMachines ?? 1} machine{(gameState.miningMachines ?? 1) > 1 ? "s" : ""} · expected about {formatSats(MINING_EXPECTED_WEEKLY_SATS * (gameState.miningMachines ?? 1))}/week · fees {formatCurrency(MINING_MONTHLY_FEE * (gameState.miningMachines ?? 1))}/month
            </p>
            <p className="text-xs font-bold text-muted-foreground">Mined all time: {formatSats(gameState.miningTotalMined ?? 0)} · fees paid: {formatCurrency(gameState.miningTotalFees ?? 0)}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => onBuyMining(false)} disabled={gameState.cash < miningMachineCost(gameState)} className="rounded-full font-black min-h-9">
                Add machine #{(gameState.miningMachines ?? 1) + 1} ({formatCurrency(miningMachineCost(gameState))})
              </Button>
              <Button onClick={() => onBuyMining(true)} disabled={!hasUpgrade(gameState, "ln-terminal") || gameState.sats < miningMachineSatsCost(gameState)} variant="secondary" className="rounded-full font-black min-h-9">
                ⚡ Add with {formatSats(miningMachineSatsCost(gameState))}
              </Button>
              <Button onClick={onToggleMining} variant={gameState.miningActive ? "destructive" : "default"} className="rounded-full font-black min-h-9">
                {gameState.miningActive ? "Pause mining" : "Resume mining"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Button onClick={() => onBuyMining(false)} disabled={gameState.cash < MINING_EQUIPMENT_COST || gameState.totalRevenue < MINING_REQUIRES_REVENUE} className="rounded-full font-black">
              Buy machine #1 {formatCurrency(MINING_EQUIPMENT_COST)}
            </Button>
            <Button onClick={() => onBuyMining(true)} disabled={gameState.totalRevenue < MINING_REQUIRES_REVENUE || !hasUpgrade(gameState, "ln-terminal") || gameState.sats < miningMachineSatsCost(gameState)} variant="secondary" className="rounded-full font-black">
              ⚡ Buy with {formatSats(miningMachineSatsCost(gameState))}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
