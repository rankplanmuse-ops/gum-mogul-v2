import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameState, Location } from "@/types/game";
import { CITIES, MACHINE_COST, formatCurrency, machineCapOf } from "@/lib/gameLogic";
import { Lock, Plus } from "lucide-react";
import routeBubbleville from "@/assets/route-bubbleville-3d.jpg";
import routeNeonbay from "@/assets/route-neonbay-3d.jpg";

// The Route: a winding numbered path over a real photographic street scene.
// Stop positions sit on the road in each photo, in percent of the scene,
// ordered bottom (start) to top (endgame), Candy Crush style.
const SCENES: Record<string, { img: string; stops: Record<string, { x: number; y: number }> }> = {
  Bubbleville: {
    img: routeBubbleville,
    stops: {
      corner: { x: 32, y: 93 },
      school: { x: 52, y: 79 },
      bus: { x: 58, y: 66 },
      arcade: { x: 49, y: 54 },
      university: { x: 43, y: 42 },
      mall: { x: 47, y: 30 },
      beach: { x: 55, y: 17 },
      airport: { x: 58, y: 6 },
    },
  },
  "Neon Bay": {
    img: routeNeonbay,
    stops: {
      ferry: { x: 45, y: 93 },
      nightmarket: { x: 47, y: 68 },
      tech: { x: 63, y: 45 },
      kiosk: { x: 60, y: 27 },
    },
  },
};

interface Props {
  gameState: GameState;
  onUnlockLocation: (locationId: string) => void;
  onBuyMachine: (locationId: string) => void;
}

type NodeState = "open" | "available" | "gated";

export const CityMapPanel = ({ gameState, onUnlockLocation, onBuyMachine }: Props) => {
  const [activeCity, setActiveCity] = useState<string>("Bubbleville");
  const [selectedId, setSelectedId] = useState<string>("corner");
  const locations = gameState.locations;
  const selected = locations.find((l) => l.id === selectedId) ?? locations[0];

  const gateMet = (loc: Location) =>
    !loc.requiresLocation || !!locations.find((l) => l.id === loc.requiresLocation)?.unlocked;
  const nodeState = (loc: Location): NodeState => (loc.unlocked ? "open" : gateMet(loc) ? "available" : "gated");
  const gateName = (loc: Location) => locations.find((l) => l.id === loc.requiresLocation)?.name ?? "";

  const selectCity = (city: string) => {
    setActiveCity(city);
    const first = locations.find((l) => l.city === city);
    if (first && selected.city !== city) setSelectedId(first.id);
  };

  const cityLocs = locations.filter((l) => l.city === activeCity);
  const scene = SCENES[activeCity];
  const dark = activeCity === "Neon Bay";
  const cityLocked = dark && !locations.find((l) => l.id === "airport")?.unlocked;

  const renderScene = () => (
    <div className="relative mt-3 rounded-[1.75rem] border-[3px] border-stone-700/60 overflow-hidden shadow-2xl max-w-md mx-auto">
      <img src={scene.img} alt={`${activeCity} street scene`} className="block w-full h-auto" draggable={false} />
      {cityLocs.map((loc, idx) => {
        const pos = scene.stops[loc.id] ?? { x: 50, y: 50 };
        const st = nodeState(loc);
        const isSel = loc.id === selectedId;
        return (
          <button
            key={loc.id}
            onClick={() => setSelectedId(loc.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group z-10"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            aria-label={`Stop ${idx + 1}: ${loc.name}: ${st === "open" ? "open" : st === "available" ? "available to open" : `locked, needs ${gateName(loc)}`}`}
          >
            <span
              className={`relative h-11 w-11 sm:h-12 sm:w-12 rounded-full border-[3px] flex items-center justify-center font-black text-lg shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-110 ${
                st === "open"
                  ? "bg-amber-50 border-amber-900 text-stone-900"
                  : st === "available"
                    ? "bg-amber-300 border-amber-900 text-stone-900 animate-pulse"
                    : "bg-stone-400 border-stone-700 text-stone-600 grayscale"
              } ${isSel ? "ring-4 ring-white scale-110" : ""}`}
            >
              {idx + 1}
              {loc.unlocked && (
                <span className="absolute -bottom-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 shadow">
                  {loc.machines}/{machineCapOf(loc)}
                </span>
              )}
            </span>
            <span className="mt-1 text-[10px] sm:text-[11px] font-black leading-none px-2 py-1 rounded-md bg-[#2b2118]/85 text-amber-50 shadow whitespace-nowrap">
              {loc.name}
              {st !== "open" && <span className="text-amber-300"> · {formatCurrency(loc.unlockCost)}</span>}
            </span>
          </button>
        );
      })}
      {cityLocked && (
        <>
          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 text-white text-center text-xs sm:text-sm font-black py-2 z-20">
            🔒 Neon Bay is across the bay. Open the Airport Terminal to unlock this whole city.
          </div>
        </>
      )}
    </div>
  );

  const selState = nodeState(selected);
  const selIndex = locations.filter((l) => l.city === selected.city).findIndex((l) => l.id === selected.id);

  return (
    <div>
      <h2 className="text-3xl font-black mb-1">🛣️ The Route</h2>
      <p className="text-sm font-semibold text-muted-foreground">
        {locations.filter((l) => l.unlocked).length} of {locations.length} locations open · follow the road up: every numbered stop is a new spot for your machines
      </p>

      <div className="flex gap-2 mt-4" role="tablist" aria-label="Choose a city">
        {CITIES.map((city) => {
          const locs = locations.filter((l) => l.city === city);
          const open = locs.filter((l) => l.unlocked).length;
          const isActive = city === activeCity;
          return (
            <button
              key={city}
              role="tab"
              aria-selected={isActive}
              onClick={() => selectCity(city)}
              className={`flex-1 rounded-2xl border-[3px] px-3 py-2 text-left transition-transform hover:scale-[1.02] ${
                isActive ? "border-primary bg-primary/10" : "border-border bg-card/60"
              }`}
            >
              <span className="block font-black text-sm sm:text-base">{city === "Neon Bay" ? "🌃" : "🏠"} {city}</span>
              <span className="block text-[11px] font-bold text-muted-foreground">{open} of {locs.length} stops open</span>
              <span className="block h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(open / locs.length) * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      {renderScene()}

      <Card className="bubbly-card p-5 mt-5">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 shrink-0 rounded-full border-[3px] border-amber-900 bg-amber-50 text-stone-900 flex items-center justify-center font-black text-lg shadow">
            {selIndex + 1}
          </span>
          <div>
            <h3 className="font-black text-lg leading-tight">
              {selected.name} <span className="text-xs font-bold text-muted-foreground">· {selected.city}</span>
            </h3>
            <p className="text-xs font-bold text-muted-foreground">{selected.blurb}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-4 text-sm">
          <div className="bg-muted rounded-2xl py-2"><p className="font-black">{selected.machines}/{machineCapOf(selected)}</p><p className="text-[11px] font-bold text-muted-foreground uppercase">machines</p></div>
          <div className="bg-muted rounded-2xl py-2"><p className="font-black">x{selected.traffic.toFixed(1)}</p><p className="text-[11px] font-bold text-muted-foreground uppercase">traffic</p></div>
          <div className="bg-muted rounded-2xl py-2"><p className="font-black">${selected.rentPerMachine}</p><p className="text-[11px] font-bold text-muted-foreground uppercase">rent/day</p></div>
        </div>
        {selState === "open" && (
          <Button onClick={() => onBuyMachine(selected.id)} disabled={gameState.cash < MACHINE_COST || selected.machines >= machineCapOf(selected)} className="w-full rounded-full font-black mt-4 gap-1">
            <Plus className="h-4 w-4" /> {selected.machines >= machineCapOf(selected) ? "Location full" : `Add machine (${formatCurrency(MACHINE_COST)})`}
          </Button>
        )}
        {selState === "available" && (
          <Button onClick={() => onUnlockLocation(selected.id)} variant="secondary" className="w-full rounded-full font-black mt-4 gap-1">
            <Lock className="h-4 w-4" /> Open for {formatCurrency(selected.unlockCost + MACHINE_COST)} total (incl. first machine)
          </Button>
        )}
        {selState === "gated" && (
          <p className="text-sm font-black text-amber-600 mt-4 text-center">🔒 Needs {gateName(selected)} open first. Clear that stop and this whole branch unlocks.</p>
        )}
      </Card>
    </div>
  );
};
