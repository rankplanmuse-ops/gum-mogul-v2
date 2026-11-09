import { Card } from "@/components/ui/card";
import { GameState } from "@/types/game";
import {
  ACHIEVEMENTS, milestoneAt, nextMilestone, currentRank, netWorth, formatCurrency,
} from "@/lib/gameLogic";

const Bar = ({ pct, className = "bg-gradient-to-r from-pink-500 to-amber-400" }: { pct: number; className?: string }) => (
  <div className="h-2.5 rounded-full bg-black/10 overflow-hidden">
    <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
  </div>
);

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export const RewardsPanel = ({ gameState }: { gameState: GameState }) => {
  const worth = netWorth(gameState);
  const claimed = gameState.milestonesClaimed ?? 0;
  const next = nextMilestone(gameState);
  const rungs = Array.from({ length: Math.max(6, claimed + 2) }, (_, i) => milestoneAt(i));
  const nextGum = gameState.products.find((p) => !p.unlocked);
  const nextLoc = gameState.locations.find((l) => !l.unlocked);
  const earned = new Set(gameState.achievements);
  const openCount = gameState.locations.filter((l) => l.unlocked).length;
  const gumCount = gameState.products.filter((p) => p.unlocked).length;

  return (
    <div>
      <h2 className="text-3xl font-black mb-1">🏆 Rewards &amp; Unlocks</h2>
      <p className="text-sm font-semibold text-muted-foreground">
        Rank: <strong>{currentRank(gameState)}</strong> · every ladder pays out as you climb · nothing here is cosmetic, each rung changes the game
      </p>

      {/* Up next: the three closest rewards across all ladders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Card className="bubbly-card p-4">
          <p className="text-xs font-black uppercase text-muted-foreground">Next milestone</p>
          <p className="font-black mt-1">{next.emoji} {next.title} at {money(next.threshold)}</p>
          <div className="mt-2"><Bar pct={(worth / next.threshold) * 100} /></div>
          <p className="text-xs font-bold text-muted-foreground mt-2">Pays {money(next.cashReward)} cash + {next.satsReward.toLocaleString()} sats · you are at {money(worth)}</p>
        </Card>
        <Card className="bubbly-card p-4">
          <p className="text-xs font-black uppercase text-muted-foreground">Next flavour unlock</p>
          {nextGum ? (
            <>
              <p className="font-black mt-1">{nextGum.emoji} {nextGum.name} at {money(nextGum.unlockRevenue ?? 0)} revenue</p>
              <div className="mt-2"><Bar pct={(gameState.totalRevenue / (nextGum.unlockRevenue ?? 1)) * 100} className="bg-gradient-to-r from-violet-500 to-fuchsia-400" /></div>
              <p className="text-xs font-bold text-muted-foreground mt-2">Lifetime revenue {money(gameState.totalRevenue)} · new flavours sell at higher prices</p>
            </>
          ) : (
            <p className="font-black mt-1">🎉 All {gameState.products.length} flavours unlocked</p>
          )}
        </Card>
        <Card className="bubbly-card p-4">
          <p className="text-xs font-black uppercase text-muted-foreground">Next location</p>
          {nextLoc ? (
            <>
              <p className="font-black mt-1">{nextLoc.emoji} {nextLoc.name} · {nextLoc.city}</p>
              <p className="text-xs font-bold text-muted-foreground mt-2">
                Opens for {formatCurrency(nextLoc.unlockCost + 400)} incl. first machine
                {nextLoc.requiresLocation && !gameState.locations.find((l) => l.id === nextLoc.requiresLocation)?.unlocked
                  ? ` · needs ${gameState.locations.find((l) => l.id === nextLoc.requiresLocation)?.name} first`
                  : ""} · find it on the City Map
              </p>
            </>
          ) : (
            <p className="font-black mt-1">🌍 Every location is open</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-start">
        {/* Ladder 1: net-worth milestones */}
        <Card className="bubbly-card p-5">
          <h3 className="font-black text-lg">👑 Milestone ladder</h3>
          <p className="text-xs font-bold text-muted-foreground">Net-worth rungs. Each one crossed pays cash and sats, automatically.</p>
          <div className="mt-4 space-y-2">
            {rungs.map((m, i) => {
              const done = i < claimed;
              const isNext = i === claimed;
              return (
                <div key={m.threshold} className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 ${done ? "bg-amber-400/15 border-amber-300/40" : isNext ? "bg-white/10 border-primary shadow" : "bg-muted/50 border-dashed opacity-70"}`}>
                  <span className="text-2xl">{done ? "✅" : m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm leading-tight">{m.title} <span className="text-muted-foreground font-bold">· {money(m.threshold)}</span></p>
                    {isNext ? (
                      <div className="mt-1.5"><Bar pct={(worth / m.threshold) * 100} /></div>
                    ) : (
                      <p className="text-[11px] font-bold text-muted-foreground">{done ? `Paid: ${money(m.cashReward)} + ${m.satsReward.toLocaleString()} sats` : `Pays ${money(m.cashReward)} + ${m.satsReward.toLocaleString()} sats`}</p>
                    )}
                  </div>
                  {isNext && <span className="text-[11px] font-black text-primary whitespace-nowrap">{Math.floor((worth / m.threshold) * 100)}%</span>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Ladder 2: flavour collection */}
        <Card className="bubbly-card p-5">
          <h3 className="font-black text-lg">🍬 Flavour collection <span className="text-sm text-muted-foreground">{gumCount}/{gameState.products.length}</span></h3>
          <p className="text-xs font-bold text-muted-foreground">New flavours unlock at lifetime-revenue marks, and each one sells dearer than the last.</p>
          <div className="mt-4 space-y-2">
            {gameState.products.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 ${p.unlocked ? "bg-white/10 border-emerald-300/30" : "bg-muted/50 border-dashed opacity-80"}`}>
                <span className={`h-10 w-10 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-xl shadow ${p.unlocked ? "" : "grayscale"}`}>{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm leading-tight">{p.name}</p>
                  {p.unlocked ? (
                    <p className="text-[11px] font-bold text-muted-foreground">In the jars · sells at {formatCurrency(p.sellPrice)}</p>
                  ) : (
                    <>
                      <div className="mt-1.5"><Bar pct={(gameState.totalRevenue / (p.unlockRevenue ?? 1)) * 100} className="bg-gradient-to-r from-violet-500 to-fuchsia-400" /></div>
                      <p className="text-[11px] font-bold text-muted-foreground">Unlocks at {money(p.unlockRevenue ?? 0)} lifetime revenue</p>
                    </>
                  )}
                </div>
                <span className="text-sm">{p.unlocked ? "✅" : "🔒"}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Ladder 3: city expansion */}
        <Card className="bubbly-card p-5">
          <h3 className="font-black text-lg">🗺️ Expansion ladder <span className="text-sm text-muted-foreground">{openCount}/{gameState.locations.length}</span></h3>
          <p className="text-xs font-bold text-muted-foreground">Locations open in order. The Airport Terminal is the gate to a whole second city.</p>
          <div className="mt-4 space-y-2">
            {gameState.locations.map((l) => {
              const gateBlocked = !!l.requiresLocation && !gameState.locations.find((x) => x.id === l.requiresLocation)?.unlocked;
              return (
                <div key={l.id} className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 ${l.unlocked ? "bg-white/10 border-emerald-300/30" : "bg-muted/50 border-dashed opacity-80"}`}>
                  <span className="text-2xl">{l.unlocked ? l.emoji : "🔒"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm leading-tight">{l.name} <span className="text-muted-foreground font-bold">· {l.city}</span></p>
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {l.unlocked
                        ? `${l.machines} machine${l.machines === 1 ? "" : "s"} running · traffic x${l.traffic.toFixed(1)}`
                        : gateBlocked
                          ? `Needs ${gameState.locations.find((x) => x.id === l.requiresLocation)?.name} open first`
                          : `Open for ${formatCurrency(l.unlockCost + 400)} incl. first machine · traffic x${l.traffic.toFixed(1)}`}
                    </p>
                  </div>
                  <span className="text-sm">{l.unlocked ? "✅" : ""}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Ladder 4: trophies */}
        <Card className="bubbly-card p-5">
          <h3 className="font-black text-lg">🏆 Trophy ladder <span className="text-sm text-muted-foreground">{earned.size}/{ACHIEVEMENTS.length}</span></h3>
          <p className="text-xs font-bold text-muted-foreground">One-off feats across every system in the game: sales, sats, cities, survival.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {ACHIEVEMENTS.map((a) => {
              const has = earned.has(a.id);
              return (
                <div key={a.id} className={`rounded-2xl border-2 px-3 py-2 ${has ? "bg-amber-400/15 border-amber-300/40" : "bg-muted/50 border-dashed opacity-70"}`}>
                  <p className="font-black text-sm leading-tight">{has ? a.emoji : "🔒"} {a.name}</p>
                  <p className="text-[11px] font-bold text-muted-foreground leading-snug">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};
