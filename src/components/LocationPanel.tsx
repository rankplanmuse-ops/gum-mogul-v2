import { Button } from "@/components/ui/button";
import { GameState } from "@/types/game";
import { MACHINE_COST, formatCurrency, machineCapOf, stockCapacity, totalStock } from "@/lib/gameLogic";
import { LOCATION_ART } from "@/lib/locationArt";
import { ArrowLeft, Lock, Play, Plus } from "lucide-react";

interface Props {
  gameState: GameState;
  locationId: string;
  onBack: () => void;
  onBuyMachine: (locationId: string) => void;
  onUnlockLocation: (locationId: string) => void;
  onNavigate: (tab: string) => void;
  onNextDay: () => void;
  nextDayEst: number;
}

// The Location screen: where a building on the Map leads. Built around the
// location's own rendered machine, with its numbers and actions. Like the
// Map it is a full game menu screen: the global header and footer hide and
// this screen carries its own top row and bottom bar.
export const LocationPanel = ({ gameState, locationId, onBack, onBuyMachine, onUnlockLocation, onNavigate, onNextDay, nextDayEst }: Props) => {
  const loc = gameState.locations.find((l) => l.id === locationId) ?? gameState.locations[0];
  const art = LOCATION_ART[loc.id];
  const gate = loc.requiresLocation ? gameState.locations.find((l) => l.id === loc.requiresLocation) : undefined;
  const gateMet = !gate || gate.unlocked;
  const state = loc.unlocked ? "open" : gateMet ? "available" : "gated";
  const cap = machineCapOf(loc);
  const stock = totalStock(gameState);
  const capacity = stockCapacity(gameState);

  return (
    <div className="fixed inset-0 z-30 bg-slate-950 overflow-y-auto" role="region" aria-label={`${loc.name} location screen`}>
      {art && <img src={art} alt="" aria-hidden className="fixed inset-0 h-full w-full object-cover blur-md scale-110 brightness-[0.55]" draggable={false} />}
      <div className="relative mx-auto w-full max-w-2xl px-3 pt-[calc(0.6rem+env(safe-area-inset-top))] pb-[calc(5.6rem+env(safe-area-inset-bottom))]">
        {/* Own top row: back to the Map, name, day. */}
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label="Back to the map" className="h-9 px-3 shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-950/70 backdrop-blur-md text-white font-black text-[13px] shadow-lg active:scale-[0.97] transition-transform">
            <ArrowLeft className="h-4 w-4" /> Map
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="font-black text-white text-lg leading-tight truncate drop-shadow">{loc.name}</p>
            <p className="text-[11px] font-bold text-white/70 leading-tight">{loc.city}</p>
          </div>
          <span className="rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1.5 text-white font-black text-[13px] whitespace-nowrap shadow-lg">📅 Day {gameState.day}</span>
        </div>

        <p className="text-center text-white/85 font-bold text-sm mt-3 drop-shadow">{loc.blurb}</p>

        {/* The rendered machine, in its scene. */}
        {art && (
          <img
            src={art}
            alt={`The gum machine at ${loc.name}`}
            className={`w-full aspect-[4/5] object-cover rounded-[1.75rem] border-[3px] border-white/25 shadow-2xl mt-3 ${state === "gated" ? "grayscale-[0.65] brightness-[0.8]" : ""}`}
            draggable={false}
          />
        )}

        {/* Numbers strip. */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-2xl bg-slate-950/72 backdrop-blur-md text-white px-2 py-2.5 shadow-xl">
            <p className="font-black leading-tight">{loc.machines}/{cap}</p>
            <p className="text-[11px] font-bold text-white/65">machines here</p>
          </div>
          <div className="rounded-2xl bg-slate-950/72 backdrop-blur-md text-white px-2 py-2.5 shadow-xl">
            <p className="font-black leading-tight">x{loc.traffic.toFixed(1)}</p>
            <p className="text-[11px] font-bold text-white/65">traffic</p>
          </div>
          <div className="rounded-2xl bg-slate-950/72 backdrop-blur-md text-white px-2 py-2.5 shadow-xl">
            <p className="font-black leading-tight">${loc.rentPerMachine}/day</p>
            <p className="text-[11px] font-bold text-white/65">rent per machine</p>
          </div>
        </div>

        <p className="text-center text-white/75 font-bold text-[13px] mt-3">
          Your jars hold {stock.toLocaleString()} of {capacity.toLocaleString()} gums across all machines.
        </p>

        {/* Actions. */}
        <div className="mt-3 space-y-2">
          {state === "open" && (
            <Button onClick={() => onBuyMachine(loc.id)} disabled={gameState.cash < MACHINE_COST || loc.machines >= cap} className="w-full rounded-full font-black h-12 gap-1">
              <Plus className="h-4 w-4" /> {loc.machines >= cap ? "Location full" : `Add machine (${formatCurrency(MACHINE_COST)})`}
            </Button>
          )}
          {state === "available" && (
            <Button onClick={() => onUnlockLocation(loc.id)} variant="secondary" className="w-full rounded-full font-black h-12 gap-1">
              <Lock className="h-4 w-4" /> Open for {formatCurrency(loc.unlockCost + MACHINE_COST)} total (incl. first machine)
            </Button>
          )}
          {state === "gated" && (
            <p className="text-center text-[13px] font-black text-amber-300 bg-slate-950/60 rounded-2xl py-3 px-4">🔒 Needs {gate?.name} open first. Open that building on the Map and this one unlocks.</p>
          )}
          <Button onClick={() => onNavigate("gums")} variant="outline" className="w-full rounded-full font-black h-12">
            🍬 Stock up on Gums
          </Button>
        </div>
      </div>

      {/* Own bottom bar: back to the Map plus Next Day. */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto w-full max-w-2xl px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] flex gap-2">
          <button onClick={onBack} className="rounded-full bg-slate-950/72 backdrop-blur-md text-white font-black px-5 shadow-2xl active:scale-[0.98] transition-transform">
            Map
          </button>
          <button
            onClick={onNextDay}
            disabled={gameState.gameOver}
            className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-black text-sm shadow-2xl flex items-center justify-center gap-1.5 px-2 whitespace-nowrap active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <Play className="h-5 w-5 shrink-0" /> Next Day <span className="text-[11px] font-bold opacity-85">est {nextDayEst >= 0 ? "+" : "-"}${Math.abs(nextDayEst).toFixed(0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
