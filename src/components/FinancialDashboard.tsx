import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GameState } from "@/types/game";
import { formatCurrency, formatSats, netWorth, nextMilestone, milestoneAt, currentRank } from "@/lib/gameLogic";
import { Wallet, Zap, Crown, Heart, CalendarDays } from "lucide-react";

interface Props {
  gameState: GameState;
  dailyProfit: number;
  simple?: boolean; // beginners: milestone card only, no stat grid, no fine print
}

const compactMoney = (n: number): string => {
  if (n >= 1_000_000) return `$${parseFloat((n / 1_000_000).toFixed(2))}M`;
  if (n >= 1_000) return `$${parseFloat((n / 1_000).toFixed(1))}k`;
  return formatCurrency(n);
};

export const FinancialDashboard = ({ gameState, dailyProfit, simple }: Props) => {
  const worth = netWorth(gameState);
  const next = nextMilestone(gameState);
  const claimed = gameState.milestonesClaimed ?? 0;
  const pct = Math.min(100, Math.max(0, (worth / next.threshold) * 100));
  const ladder = Array.from({ length: Math.min(claimed + 2, 8) }, (_, i) => milestoneAt(i));
  const stats = [
    { label: "Cash", value: formatCurrency(gameState.cash), icon: Wallet, cls: gameState.cash < 0 ? "text-loss" : "text-foreground", bg: "bg-[hsl(var(--primary)/0.12)]" },
    { label: "Sats Wallet", value: formatSats(gameState.sats), icon: Zap, cls: "text-amber-500", bg: "bg-amber-100" },
    { label: "Reputation", value: `${Math.round(gameState.reputation)} / 100`, icon: Heart, cls: "text-rose-500", bg: "bg-rose-100" },
    { label: "Day", value: `${gameState.day}`, icon: CalendarDays, cls: "text-foreground", bg: "bg-sky-100" },
  ];
  return (
    <div className="space-y-4">
      {!simple && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st) => (
          <Card key={st.label} className="bubbly-card p-4 sm:p-5 h-[5.75rem] sm:h-24 overflow-hidden">
            <div className="flex items-center justify-between gap-2 h-full">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{st.label}</p>
                <p className={`text-base sm:text-2xl font-black tabular-nums tracking-tight leading-tight whitespace-nowrap overflow-hidden ${st.cls}`}>{st.value}</p>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-full shrink-0 ${st.bg}`}>
                <st.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}
      <Card className="bubbly-card p-5 bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--secondary))] to-[hsl(var(--warning))] text-white border-none">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 animate-floaty shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80 whitespace-nowrap overflow-hidden">Next milestone: {next.title}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-white/60 whitespace-nowrap overflow-hidden">Your rank: {currentRank(gameState)}</p>
            <p className="text-lg sm:text-2xl font-black tabular-nums tracking-tight whitespace-nowrap overflow-hidden">Net worth {formatCurrency(worth)} <span className="text-white/70 text-sm sm:text-base font-bold">of {compactMoney(next.threshold)}</span></p>
          </div>
        </div>
        {!simple && (
        <p className="text-[13px] sm:text-sm font-bold bg-white/25 rounded-full px-3 py-1 mt-3 whitespace-nowrap overflow-hidden text-ellipsis">
          Reward at {compactMoney(next.threshold)}: {compactMoney(next.cashReward)} + {next.satsReward.toLocaleString()} sats · Forecast profit today: {formatCurrency(dailyProfit)}
        </p>
        )}
        <Progress value={pct} className="mt-3 h-4 bg-white/30 [&>div]:bg-white" />
        {!simple && (
        <div className="flex flex-nowrap gap-1.5 mt-3 overflow-x-auto h-7 items-center pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_88%,transparent_100%)]">
          {ladder.map((m, i) => (
            <span key={m.threshold} className={`text-[11px] font-black rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap ${i < claimed ? "bg-white text-[hsl(var(--primary-edge))]" : i === claimed ? "bg-black/25 text-white ring-2 ring-white" : "bg-white/20 text-white/70"}`}>
              {i < claimed ? "✅" : m.emoji} {m.title} {compactMoney(m.threshold)}
            </span>
          ))}
          <span className="text-[11px] font-black rounded-full px-2.5 py-1 shrink-0 whitespace-nowrap bg-white/20 text-white/70">… x10 forever</span>
        </div>
        )}
      </Card>
    </div>
  );
};
