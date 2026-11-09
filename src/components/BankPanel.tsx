import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GameState } from "@/types/game";
import { formatCurrency, LOAN_TIERS, totalBankOwed, assetValue, loanBlocker, LOAN_LTV, MAX_LOANS } from "@/lib/gameLogic";
import { Landmark } from "lucide-react";

interface Props {
  gameState: GameState;
  onTakeLoan: (tierId: string) => void;
  onRepay: (amount: number, loanId: number) => void;
}

export const BankPanel = ({ gameState, onTakeLoan, onRepay }: Props) => {
  const loans = gameState.loans ?? [];
  const owed = totalBankOwed(gameState);
  const assets = assetValue(gameState);
  const maxOwed = LOAN_LTV * assets;
  const ltvPct = maxOwed > 0 ? Math.min(100, (owed / maxOwed) * 100) : 0;
  return (
    <Card className="bubbly-card p-5 bg-gradient-to-br from-sky-400/15 to-indigo-400/10">
      <h3 className="font-black text-lg flex items-center gap-2">
        <Landmark className="h-5 w-5 text-indigo-600" /> Gum Bank
      </h3>
      <p className="text-[13px] font-bold text-muted-foreground mt-1 leading-relaxed">
        Borrow for machines, locations or stock. You can run several loans at once: the bank lends up to {Math.round(LOAN_LTV * 100)}% of your asset value across all of them (max {MAX_LOANS}). Everything you owe is skimmed from 10% of daily revenue, oldest loan first, and counts against your net worth.
      </p>

      <div className="mt-3 bg-white/10 rounded-2xl border border-white/10 p-4">
        <div className="flex justify-between flex-wrap gap-1 text-sm font-black">
          <span>💼 Assets {formatCurrency(assets)}</span>
          <span>🏦 Owed {formatCurrency(owed)} of {formatCurrency(maxOwed)} borrowing room</span>
        </div>
        <Progress value={ltvPct} className="mt-2 h-3" />
        {loans.length === 0 && <p className="text-xs font-bold text-muted-foreground mt-2">No loans running. Your full borrowing room is available.</p>}
        <div className="space-y-2 mt-2">
          {loans.map((loan) => (
            <div key={loan.id} className="bg-sky-400/10 rounded-2xl border border-sky-300/25 p-3">
              <p className="font-black text-sm">{loan.emoji} {loan.name} (day {loan.dayTaken}): you owe {formatCurrency(loan.owed)}</p>
              <div className="flex gap-2 mt-2">
                <Button onClick={() => onRepay(50, loan.id)} disabled={gameState.cash <= 0} variant="secondary" className="flex-1 rounded-full font-black min-h-9">
                  Repay $50
                </Button>
                <Button onClick={() => onRepay(loan.owed, loan.id)} disabled={gameState.cash <= 0} className="flex-1 rounded-full font-black min-h-9">
                  Pay off {formatCurrency(Math.min(loan.owed, Math.max(0, gameState.cash)))}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-3">
        {LOAN_TIERS.map((tier) => {
          const blocker = loanBlocker(gameState, tier);
          return (
            <div key={tier.id} className="bg-white/10 rounded-2xl border border-white/10 p-3 flex items-center gap-3">
              <div className="text-3xl">{tier.emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm">{tier.name}: {formatCurrency(tier.amount)}</p>
                <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed">
                  {tier.blurb} You repay {formatCurrency(tier.amount * (1 + tier.interest))} total.
                </p>
                {blocker !== null && (
                  <p className="text-[11px] font-black text-rose-600 mt-1">🔒 Unavailable: {blocker}</p>
                )}
              </div>
              <Button onClick={() => onTakeLoan(tier.id)} disabled={blocker !== null} className="rounded-full font-black shrink-0">
                {blocker === null ? "Borrow" : "Locked"}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground mt-3">
        Broke with a Lightning Terminal? The one-time Lightning rescue loan in the wallet above is separate, and faster.
      </p>
    </Card>
  );
};
