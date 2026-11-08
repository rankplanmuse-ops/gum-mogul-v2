import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GameState, Location } from "@/types/game";
import { CITIES, MACHINE_COST, formatCurrency, machineCapOf } from "@/lib/gameLogic";
import { Lock, Plus } from "lucide-react";
import routeBubbleville from "@/assets/route-bubbleville-3d.jpg";
import routeNeonbay from "@/assets/route-neonbay-3d.jpg";

// The Route, full-screen stage: the street scene fills the display and the
// game's own chrome (top bar, Next Day bar, dock, all z-40 in Index) floats
// around it. The stage box keeps the scene's exact 1:2 aspect so the stops
// stay glued to the road on any screen; a blurred copy of the scene fills
// whatever the stage does not cover.
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
  const selState = nodeState(selected);
  const selIndex = locations.filter((l) => l.city === selected.city).findIndex((l) => l.id === selected.id);

  return (
    <div className="fixed inset-0 z-30 bg-slate-950" role="region" aria-label="The Route: full screen city map">
      {/* Blurred scene backdrop fills the whole display around the stage. */}
      <img src={scene.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover blur-md scale-110 brightness-[0.65]" draggable={false} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.55)]"
          style={{ width: "min(100vw, 50dvh)", height: "min(200vw, 100dvh)" }}
        >
          <img src={scene.img} alt={`${activeCity} street scene`} className="absolute inset-0 h-full w-full" draggable={false} />

          {/* City switcher, floating under the game's top bar. */}
          <div className="absolute inset-x-2 top-[calc(3.4rem+env(safe-area-inset-top))] z-20 flex gap-2">
            {CITIES.map((city) => {
              const locs = locations.filter((l) => l.city === city);
              const open = locs.filter((l) => l.unlocked).length;
              const isActive = city === activeCity;
              return (
                <button
                  key={city}
                  onClick={() => selectCity(city)}
                  aria-pressed={isActive}
                  className={`flex-1 rounded-2xl px-3 py-1.5 text-left backdrop-blur-md transition-transform hover:scale-[1.02] ${
                    isActive ? "bg-white/90 text-slate-900 shadow-lg" : "bg-slate-950/55 text-white"
                  }`}
                >
                  <span className="block font-black text-[13px] leading-tight">{city === "Neon Bay" ? "🌃" : "🏠"} {city}</span>
                  <span className={`block text-[10px] font-bold ${isActive ? "text-slate-500" : "text-white/70"}`}>{open} of {locs.length} stops open</span>
                  <span className={`block h-1 rounded-full mt-1 overflow-hidden ${isActive ? "bg-slate-900/15" : "bg-white/25"}`}>
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(open / locs.length) * 100}%` }} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Numbered stops on the road. */}
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
              <div className="absolute inset-0 bg-slate-950/40 z-[5]" />
              <div className="absolute inset-x-0 top-[calc(7.6rem+env(safe-area-inset-top))] bg-slate-950/75 text-white text-center text-xs sm:text-sm font-black py-2 px-3 z-20">
                🔒 Neon Bay is across the bay. Open the Airport Terminal to unlock this whole city.
              </div>
            </>
          )}

          {/* Selected stop sheet, floating just above the game's Next Day bar. */}
          <div className="absolute inset-x-2 bottom-[calc(8.1rem+env(safe-area-inset-bottom))] lg:bottom-[10.4rem] z-20 rounded-3xl bg-slate-950/72 backdrop-blur-md text-white p-3 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <span className="h-9 w-9 shrink-0 rounded-full border-[3px] border-amber-900 bg-amber-50 text-stone-900 flex items-center justify-center font-black shadow">
                {selIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black leading-tight truncate">{selected.name} <span className="text-[11px] font-bold text-white/60">· {selected.city}</span></p>
                <p className="text-[11px] font-bold text-white/70 truncate">{selected.blurb}</p>
              </div>
              <div className="text-right shrink-0 text-[11px] font-black leading-tight">
                <p>{selected.machines}/{machineCapOf(selected)} machines</p>
                <p className="text-white/70">x{selected.traffic.toFixed(1)} traffic · ${selected.rentPerMachine}/day</p>
              </div>
            </div>
            {selState === "open" && (
              <Button onClick={() => onBuyMachine(selected.id)} disabled={gameState.cash < MACHINE_COST || selected.machines >= machineCapOf(selected)} className="w-full rounded-full font-black mt-2.5 gap-1">
                <Plus className="h-4 w-4" /> {selected.machines >= machineCapOf(selected) ? "Location full" : `Add machine (${formatCurrency(MACHINE_COST)})`}
              </Button>
            )}
            {selState === "available" && (
              <Button onClick={() => onUnlockLocation(selected.id)} variant="secondary" className="w-full rounded-full font-black mt-2.5 gap-1">
                <Lock className="h-4 w-4" /> Open for {formatCurrency(selected.unlockCost + MACHINE_COST)} total (incl. first machine)
              </Button>
            )}
            {selState === "gated" && (
              <p className="text-[13px] font-black text-amber-300 mt-2 text-center">🔒 Needs {gateName(selected)} open first. Clear that stop and this whole branch unlocks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
