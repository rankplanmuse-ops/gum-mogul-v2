import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { GameState } from "@/types/game";
import { formatCurrency, dailyRent, totalMachines, RESTOCK_LEVELS, hasUpgrade, MARKETING_CHANNELS, ONGOING_MARKETING, ongoingDailyCost } from "@/lib/gameLogic";
import { Sparkles, Megaphone } from "lucide-react";

const UPGRADE_GROUPS: { name: string; ids: string[] }[] = [
  { name: "📣 Sell more", ids: ["neon", "displays"] },
  { name: "🫙 Bigger jars & storage", ids: ["big-jar", "xl-jars", "jumbo-jars", "gum-silos"] },
  { name: "🤖 Automation & buying", ids: ["auto-restock", "buyer-bot"] },
  { name: "⚡ Bitcoin", ids: ["ln-terminal"] },
];

interface Props {
  gameState: GameState;
  onBuyUpgrade: (upgradeId: string) => void;
  onMarketingChange: (spend: number) => void;
  onRestockLevelChange: (levelId: string) => void;
  onBuyMarketing: (channelId: string) => void;
  onToggleOngoing: (activityId: string) => void;
}

export const EmpirePanel = ({ gameState, onBuyUpgrade, onMarketingChange, onRestockLevelChange, onBuyMarketing, onToggleOngoing }: Props) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black mb-1">🏰 Your Empire</h2>
        <p className="text-sm font-semibold text-muted-foreground">{totalMachines(gameState)} machines · rent {formatCurrency(dailyRent(gameState))}/day · more traffic means more chewers per machine</p>
        <p className="text-sm font-bold text-fuchsia-700 mt-2">🗺️ Locations live on the Map tab. This screen is marketing and upgrades.</p>

          <Card id="marketing" className="bubbly-card p-5 bg-gradient-to-br from-violet-100 to-fuchsia-100 mt-5 scroll-mt-3">
            <h3 className="font-black text-lg flex items-center gap-2"><Megaphone className="h-5 w-5 text-fuchsia-600" /> Marketing</h3>
            <p className="text-[13px] font-bold text-muted-foreground mt-1 leading-relaxed">Daily spend. Every $1/day adds about +1.8% demand. Diminishing vibes after $25, so the slider stops there.</p>
            <p className="text-3xl font-black mt-3">{formatCurrency(gameState.marketingSpend)}<span className="text-base text-muted-foreground">/day</span></p>
            <Slider value={[gameState.marketingSpend]} min={0} max={25} step={1} onValueChange={([v]) => onMarketingChange(v)} className="mt-3" />
            <p className="text-xs font-black text-fuchsia-700 mt-2">Demand boost right now: +{Math.round(gameState.marketingSpend * 1.8)}%</p>
            <div className="border-t-2 border-dashed border-fuchsia-200 mt-4 pt-3">
              <p className="text-sm font-black">📣 Campaigns <span className="text-xs font-bold text-muted-foreground">(one-off, stack with everything)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {MARKETING_CHANNELS.map((c) => {
                  const daysLeft = gameState.promoDays?.[c.id] ?? 0;
                  return (
                    <div key={c.id} className="bg-white/70 rounded-2xl border-2 p-3">
                      <p className="font-black text-sm">{c.emoji} {c.name}</p>
                      <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-0.5">{c.blurb}</p>
                      <p className="text-[11px] font-black text-fuchsia-700 mt-1">+{Math.round((c.factor - 1) * 100)}% demand · {c.days} days</p>
                      {daysLeft > 0 ? (
                        <p className="font-black text-accent text-sm mt-2">✅ Live, {daysLeft} day{daysLeft === 1 ? "" : "s"} left</p>
                      ) : (
                        <Button onClick={() => onBuyMarketing(c.id)} disabled={gameState.cash < c.cost} className="w-full rounded-full font-black mt-2">
                          Launch {formatCurrency(c.cost)}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border-t-2 border-dashed border-fuchsia-200 mt-4 pt-3">
              <p className="text-sm font-black">🔁 Always-on marketing <span className="text-xs font-bold text-muted-foreground">(runs every day until you stop it, billed daily{ongoingDailyCost(gameState) > 0 ? ` · currently $${ongoingDailyCost(gameState)}/day` : ""})</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
                {ONGOING_MARKETING.map((a) => {
                  const running = (gameState.ongoingMarketing ?? []).includes(a.id);
                  const locked = !running && gameState.totalRevenue < a.requiresRevenue;
                  return (
                    <div key={a.id} className={`rounded-2xl border-2 p-3 ${running ? "bg-emerald-50 border-emerald-300" : "bg-white/70"}`}>
                      <p className="font-black text-sm">{a.emoji} {a.name}</p>
                      <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-0.5">{a.blurb}</p>
                      <p className="text-[11px] font-black text-fuchsia-700 mt-1">+{Math.round((a.factor - 1) * 100)}% demand · ${a.dailyCost}/day</p>
                      {locked ? (
                        <p className="text-[11px] font-black text-amber-600 mt-2">🔒 Unlocks at ${a.requiresRevenue.toLocaleString()} lifetime revenue</p>
                      ) : (
                        <Button onClick={() => onToggleOngoing(a.id)} variant={running ? "destructive" : "default"} className="w-full rounded-full font-black mt-2">
                          {running ? "Stop activity" : `Start · $${a.dailyCost}/day`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
      </div>

      <div id="upgrades" className="scroll-mt-3">
        <h2 className="text-3xl font-black mb-1 flex items-center gap-2"><Sparkles className="h-7 w-7 text-amber-500" /> Upgrades</h2>
        <p className="text-[13px] font-bold text-muted-foreground mb-4">{gameState.upgrades.filter((u) => u.owned).length} of {gameState.upgrades.length} installed, grouped by the job they do. Affordable first, owned at the bottom of each group.</p>
        {UPGRADE_GROUPS.map((group) => {
          const ups = gameState.upgrades
            .filter((u) => group.ids.includes(u.id))
            .sort((a, b) => {
              const rank = (u: typeof a) => (u.owned ? 2 : gameState.cash >= u.cost ? 0 : 1);
              return rank(a) - rank(b);
            });
          if (ups.length === 0) return null;
          const ownedCount = ups.filter((u) => u.owned).length;
          return (
            <div key={group.name} className="mb-5">
              <h3 className="font-black text-base mb-2">{group.name} <span className="text-xs font-bold text-muted-foreground">· {ownedCount}/{ups.length} installed</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {ups.map((up) => up.owned ? (
                  <div key={up.id} className="rounded-3xl border-2 border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-center gap-3">
                    <div className="text-2xl">{up.emoji}</div>
                    <div className="min-w-0">
                      <p className="font-black text-sm leading-tight">{up.name}</p>
                      <p className="text-xs font-black text-emerald-700">✅ Installed{up.id === "auto-restock" ? ` · running ${RESTOCK_LEVELS.find((l) => l.id === gameState.restockLevel)?.name ?? "Standard"}` : ""}</p>
                    </div>
                  </div>
                ) : (
                  <Card key={up.id} className="bubbly-card p-4">
                    <div className="text-3xl">{up.emoji}</div>
                    <h3 className="font-black mt-1.5">{up.name}</h3>
                    <p className="text-[13px] font-semibold text-muted-foreground mt-1 leading-relaxed">{up.blurb}</p>
                    <Button onClick={() => onBuyUpgrade(up.id)} disabled={gameState.cash < up.cost} className="w-full rounded-full font-black mt-3">
                      Buy {formatCurrency(up.cost)}
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {hasUpgrade(gameState, "auto-restock") && (
          <Card id="robot" className="bubbly-card p-5 mt-4 bg-gradient-to-br from-teal-50 to-emerald-50 scroll-mt-3">
            <h3 className="font-black text-lg">🤖 Restock Bot fill level</h3>
            <p className="text-[13px] font-bold text-muted-foreground mt-1 leading-relaxed">How full the bot keeps your jars every morning. It buys in bulk where it can, so the 25/50/100 bulk discounts apply to bot orders too.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
              {RESTOCK_LEVELS.map((level) => {
                const active = gameState.restockLevel === level.id;
                return (
                  <button key={level.id} onClick={() => onRestockLevelChange(level.id)}
                    className={`rounded-2xl border-[3px] p-3 text-left transition-transform hover:-translate-y-0.5 ${active ? "border-accent bg-white shadow-lg" : "border-dashed bg-white/60"}`}>
                    <p className="font-black">{level.emoji} {level.name} {active && "✅"}</p>
                    <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed mt-1">{level.blurb}</p>
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
