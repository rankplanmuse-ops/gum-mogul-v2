import { Card } from "@/components/ui/card";
import { GameState } from "@/types/game";
import { ACHIEVEMENTS } from "@/lib/gameLogic";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, ScrollText, BarChart3 } from "lucide-react";

export const InsightsPanel = ({ gameState }: { gameState: GameState }) => {
  const chartData = gameState.history.map((h) => ({ day: h.day, revenue: Number(h.revenue.toFixed(2)), profit: Number(h.netProfit.toFixed(2)) }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="bubbly-card p-5 lg:col-span-1">
        <h2 className="text-xl font-black flex items-center gap-2 mb-3"><BarChart3 className="h-5 w-5 text-primary" /> Revenue story</h2>
        {chartData.length < 2 ? (
          <p className="text-sm font-semibold text-muted-foreground">Play a couple of days and your revenue and profit lines will bubble up here.</p>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip formatter={(v: number, name: string) => [`$${v}`, name]} />
                <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs font-bold text-muted-foreground mt-2"><span className="text-pink-500">— revenue</span> · <span className="text-emerald-500">— profit</span> · sats earned all time: {gameState.totalSatsEarned.toLocaleString()}</p>
      </Card>

      <Card className="bubbly-card p-5 lg:col-span-1">
        <h2 className="text-xl font-black flex items-center gap-2 mb-3"><Trophy className="h-5 w-5 text-amber-500" /> Achievements <span className="text-sm text-muted-foreground">{gameState.achievements.length}/{ACHIEVEMENTS.length}</span></h2>
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {ACHIEVEMENTS.map((a) => {
            const got = gameState.achievements.includes(a.id);
            return (
              <div key={a.id} className={`rounded-2xl p-3 border-2 ${got ? "bg-amber-400/15 border-amber-300/40 animate-pop" : "bg-muted/50 border-dashed opacity-60"}`}>
                <p className="text-2xl">{got ? a.emoji : "🔒"}</p>
                <p className="font-black text-sm leading-tight">{a.name}</p>
                <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="bubbly-card p-5 lg:col-span-1">
        <h2 className="text-xl font-black flex items-center gap-2 mb-3"><ScrollText className="h-5 w-5 text-secondary" /> Empire diary</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {gameState.log.map((entry) => (
            <div key={entry.id} className={`rounded-2xl px-3 py-2 text-sm font-semibold flex gap-2 ${entry.kind === "warn" ? "bg-rose-400/15 text-rose-200" : entry.kind === "ln" ? "bg-amber-400/15 text-amber-200" : entry.kind === "unlock" ? "bg-emerald-400/15 text-emerald-200" : entry.kind === "event" ? "bg-violet-400/15 text-violet-200" : "bg-muted/60"}`}>
              <span>{entry.icon}</span>
              <span><span className="font-black text-xs uppercase opacity-60">Day {entry.day} · </span>{entry.text}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
