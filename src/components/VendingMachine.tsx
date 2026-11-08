import vendingMachineImg from "@/assets/vending-machine-remake.jpg";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  gumCount: number;
  capacity: number;
  machines: number;
  tickerText?: string; // set when the Digital Displays upgrade is owned
}

export const VendingMachine = ({ gumCount, capacity, machines, tickerText }: Props) => {
  const pct = capacity > 0 ? Math.min(100, (gumCount / capacity) * 100) : 0;
  return (
    <Card className="bubbly-card overflow-hidden">
      <div className="relative">
        <img src={vendingMachineImg} alt="Bubbly red chewing gum vending machine" className="w-full h-auto object-cover" />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full border-[3px] border-primary shadow-lg animate-pop">
          <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">In the jars</p>
          <p className="text-2xl font-black text-primary leading-none">{gumCount} <span className="text-sm text-muted-foreground">/ {capacity}</span></p>
        </div>
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full border-[3px] border-secondary shadow-lg">
          <p className="text-sm font-black text-secondary">🎰 {machines} machine{machines === 1 ? "" : "s"} humming</p>
        </div>
        {tickerText && (
          <div className="absolute bottom-16 left-0 right-0 mx-4 bg-black/85 rounded-xl border-2 border-lime-300 overflow-hidden py-1.5 shadow-lg">
            <p className="ticker-track font-mono text-lime-300 text-sm font-bold">{`${tickerText} ★ `}{`${tickerText} ★ `}</p>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
          <span>Jar fill</span><span>{Math.round(pct)}%</span>
        </div>
        <Progress value={pct} className="h-3" />
        <div className="mt-2 min-h-[2.5rem] sm:min-h-[1.25rem]">
          {pct < 25 && <p className="text-sm font-bold text-loss">⚠️ Jars are running low. Empty slots lose sales and reputation!</p>}
        </div>
      </div>
    </Card>
  );
};
