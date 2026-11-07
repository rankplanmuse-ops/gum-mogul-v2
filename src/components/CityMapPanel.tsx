import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameState, Location } from "@/types/game";
import { CITIES, MACHINE_COST, formatCurrency, machineCapOf } from "@/lib/gameLogic";
import { Lock, Plus } from "lucide-react";

// Node positions on each city's map, in percent of the map area.
const NODE_POS: Record<string, { x: number; y: number }> = {
  corner: { x: 10, y: 64 },
  school: { x: 26, y: 30 },
  bus: { x: 42, y: 66 },
  arcade: { x: 56, y: 28 },
  university: { x: 68, y: 62 },
  mall: { x: 80, y: 30 },
  beach: { x: 90, y: 66 },
  airport: { x: 95, y: 14 },
  ferry: { x: 14, y: 58 },
  nightmarket: { x: 38, y: 30 },
  tech: { x: 62, y: 60 },
  kiosk: { x: 85, y: 32 },
};

interface Props {
  gameState: GameState;
  onUnlockLocation: (locationId: string) => void;
  onBuyMachine: (locationId: string) => void;
}

type NodeState = "open" | "available" | "gated";

export const CityMapPanel = ({ gameState, onUnlockLocation, onBuyMachine }: Props) => {
  const [selectedId, setSelectedId] = useState<string>("corner");
  const locations = gameState.locations;
  const selected = locations.find((l) => l.id === selectedId) ?? locations[0];

  const gateMet = (loc: Location) =>
    !loc.requiresLocation || !!locations.find((l) => l.id === loc.requiresLocation)?.unlocked;
  const nodeState = (loc: Location): NodeState => (loc.unlocked ? "open" : gateMet(loc) ? "available" : "gated");
  const gateName = (loc: Location) => locations.find((l) => l.id === loc.requiresLocation)?.name ?? "";

  const renderCity = (city: string) => {
    const cityLocs = locations.filter((l) => l.city === city);
    const dark = city === "Neon Bay";
    const cityLocked = dark && !locations.find((l) => l.id === "airport")?.unlocked;
    const route = cityLocs.map((l) => `${NODE_POS[l.id]?.x ?? 50},${NODE_POS[l.id]?.y ?? 50}`).join(" ");
    return (
      <div key={city} className="mt-5">
        <h3 className="text-xl font-black">
          {dark ? "🌃" : "🏠"} {city}
          {dark && <span className="text-xs font-bold text-muted-foreground"> · opens once the Airport Terminal is open</span>}
        </h3>
        <div
          className={`relative mt-3 rounded-[1.75rem] border-[3px] overflow-hidden aspect-[4/3] sm:aspect-[16/8] ${
            dark
              ? "border-indigo-300/60 bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-900"
              : "border-emerald-200 bg-gradient-to-b from-sky-200 via-emerald-50 to-amber-100"
          }`}
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline points={route} fill="none" stroke={dark ? "#f0abfc" : "#ffffff"} strokeWidth="0.7" strokeDasharray="2.2 1.6" opacity="0.8" />
          </svg>
          {cityLocs.map((loc) => {
            const pos = NODE_POS[loc.id] ?? { x: 50, y: 50 };
            const st = nodeState(loc);
            const isSel = loc.id === selectedId;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedId(loc.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                aria-label={`${loc.name}: ${st === "open" ? "open" : st === "available" ? "available to open" : `locked, needs ${gateName(loc)}`}`}
              >
                <span
                  className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-full border-[3px] flex items-center justify-center text-2xl sm:text-[1.7rem] shadow-lg transition-transform group-hover:scale-110 ${
                    st === "open"
                      ? "bg-white border-emerald-400"
                      : st === "available"
                        ? "bg-amber-50 border-amber-400 animate-pulse"
                        : "bg-slate-200 border-slate-400 grayscale opacity-80"
                  } ${isSel ? "ring-4 ring-primary scale-110" : ""}`}
                >
                  {st === "gated" ? "🔒" : loc.emoji}
                  {loc.unlocked && (
                    <span className="absolute -bottom-1.5 -right-1.5 bg-primary text-white text-[10px] font-black rounded-full px-1.5 py-0.5 shadow">
                      {loc.machines}/{machineCapOf(loc)}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] sm:text-[11px] font-black leading-none px-2 py-1 rounded-full shadow ${dark ? "bg-white/90 text-slate-800" : "bg-white/85 text-slate-700"}`}>
                  {loc.name}
                </span>
              </button>
            );
          })}
          {cityLocked && (
            <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 text-white text-center text-xs sm:text-sm font-black py-2">
              🔒 Neon Bay is across the bay. Open the Airport Terminal to unlock this whole city.
            </div>
          )}
        </div>
      </div>
    );
  };

  const selState = nodeState(selected);
  return (
    <div>
      <h2 className="text-3xl font-black mb-1">🗺️ City Map</h2>
      <p className="text-sm font-semibold text-muted-foreground">
        {locations.filter((l) => l.unlocked).length} of {locations.length} locations open · tap a pin to manage it · new cities and spots unlock as the empire grows
      </p>
      {CITIES.map(renderCity)}

      <Card className="bubbly-card p-5 mt-5">
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-floaty">{selected.emoji}</div>
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
          <p className="text-sm font-black text-amber-600 mt-4 text-center">🔒 Needs {gateName(selected)} open first. Clear that pin and this whole branch unlocks.</p>
        )}
      </Card>
    </div>
  );
};
