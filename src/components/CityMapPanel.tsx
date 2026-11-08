import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GameState, Location } from "@/types/game";
import { CITIES, MACHINE_COST, formatCurrency, machineCapOf } from "@/lib/gameLogic";
import { Lock, Plus } from "lucide-react";
import mapBubbleville from "@/assets/map-bubbleville.jpg";
import mapNeonbay from "@/assets/map-neonbay.jpg";

// The Diorama: a modern-city plate fills the screen and the BUILDINGS are
// the buttons. No overlay discs or pins: each building is a patch of the
// scene itself (same image, background-positioned so the patch shows exactly
// its own region) and it wiggles gently on a stagger to say "tap me". The
// game's own chrome (top bar, Next Day bar, dock, all z-40 in Index) floats
// around the stage. The stage box keeps the plate's exact 2:3 aspect so the
// patches stay glued to their buildings on any screen; a blurred copy of
// the plate fills whatever the stage does not cover.
interface Box { x: number; y: number; w: number; h: number }
const SCENES: Record<string, { img: string; boxes: Record<string, Box> }> = {
  Bubbleville: {
    img: mapBubbleville,
    boxes: {
      corner: { x: 3, y: 71, w: 40, h: 20 },
      bus: { x: 40, y: 84, w: 16, h: 7 },
      arcade: { x: 30, y: 55, w: 38, h: 16 },
      school: { x: 0, y: 42, w: 37, h: 15 },
      mall: { x: 59, y: 44, w: 41, h: 17 },
      university: { x: 62, y: 26, w: 35, h: 17 },
      beach: { x: 26, y: 5, w: 44, h: 12 },
      airport: { x: 66, y: 9, w: 28, h: 11 },
    },
  },
  "Neon Bay": {
    img: mapNeonbay,
    boxes: {
      ferry: { x: 12, y: 67, w: 78, h: 28 },
      nightmarket: { x: 5, y: 39, w: 57, h: 25 },
      tech: { x: 40, y: 25, w: 56, h: 24 },
      kiosk: { x: 41, y: 5, w: 30, h: 11 },
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

  return (
    <div className="fixed inset-0 z-30 bg-slate-950" role="region" aria-label={`${activeCity} diorama map`}>
      {/* Blurred plate backdrop fills the whole display around the stage. */}
      <img src={scene.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover blur-md scale-110 brightness-[0.65]" draggable={false} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.55)]"
          style={{ width: "min(100vw, 66.67dvh)", height: "min(150vw, 100dvh)" }}
        >
          <img src={scene.img} alt={`${activeCity} city diorama`} className="absolute inset-0 h-full w-full" draggable={false} />

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
                  <span className="block font-black text-[13px] leading-tight">{city === "Neon Bay" ? "🌃" : "🏙️"} {city}</span>
                  <span className={`block text-[11px] font-bold ${isActive ? "text-slate-500" : "text-white/70"}`}>{open} of {locs.length} locations open</span>
                  <span className={`block h-1 rounded-full mt-1 overflow-hidden ${isActive ? "bg-slate-900/15" : "bg-white/25"}`}>
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(open / locs.length) * 100}%` }} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* The buildings are the buttons: a scene patch per location that
              wiggles when it can be tapped, dark and still while locked. */}
          {cityLocs.map((loc, idx) => {
            const box = scene.boxes[loc.id] ?? { x: 40, y: 40, w: 20, h: 12 };
            const st = nodeState(loc);
            const isSel = loc.id === selectedId;
            return (
              <button
                key={loc.id}
                onClick={() => setSelectedId(loc.id)}
                className="absolute z-10 group"
                style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                aria-label={`${loc.name}: ${st === "open" ? "open" : st === "available" ? "available to open" : `locked, needs ${gateName(loc)}`}`}
                aria-pressed={isSel}
              >
                {/* Warm glow pooled at the building's base when it wants a tap. */}
                {(st !== "gated" || isSel) && (
                  <span
                    aria-hidden
                    className={`absolute left-1/2 -translate-x-1/2 bottom-[-4%] w-[85%] h-[22%] rounded-[50%] blur-md transition-opacity ${
                      isSel ? "bg-amber-300/70" : "bg-amber-200/35 group-hover:bg-amber-200/55"
                    }`}
                  />
                )}
                {/* The patch: the scene region itself, cut by background maths. */}
                <span
                  aria-hidden
                  className={`absolute inset-0 block ${
                    st === "gated" ? "" : isSel ? "animate-house-sel" : "animate-house"
                  }`}
                  style={{
                    backgroundImage: `url(${scene.img})`,
                    backgroundSize: `${(100 / box.w) * 100}% ${(100 / box.h) * 100}%`,
                    backgroundPosition: `${(box.x / (100 - box.w)) * 100}% ${(box.y / (100 - box.h)) * 100}%`,
                    animationDelay: `${idx * 0.7}s`,
                    filter: st === "gated" ? "grayscale(0.65) brightness(0.78)" : undefined,
                  }}
                />
                {/* Name appears only for the selected building: above it, or
                    below it for bottom-row buildings where the sheet sits. */}
                {isSel && (
                  <span className={`absolute left-1/2 -translate-x-1/2 ${box.y > 55 ? "top-[calc(100%+6px)]" : "-top-7"} whitespace-nowrap rounded-full bg-slate-950/80 backdrop-blur px-2.5 py-1 text-[11px] font-black text-white shadow-lg z-10`}>
                    {loc.name}
                    {st !== "open" && <span className="text-amber-300"> · {formatCurrency(loc.unlockCost)}</span>}
                  </span>
                )}
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

          {/* Selected location sheet, floating just above the game's Next Day bar. */}
          <div className="absolute inset-x-2 bottom-[calc(8.1rem+env(safe-area-inset-bottom))] lg:bottom-[10.4rem] z-20 rounded-3xl bg-slate-950/72 backdrop-blur-md text-white p-3 shadow-2xl">
            <div className="flex items-center gap-2.5">
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
              <p className="text-[13px] font-black text-amber-300 mt-2 text-center">🔒 Needs {gateName(selected)} open first. Open that building and this one unlocks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
