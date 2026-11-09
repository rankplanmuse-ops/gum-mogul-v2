import { useState, useEffect, useRef } from "react";
import { VendingMachine } from "@/components/VendingMachine";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { ProductInventory } from "@/components/ProductInventory";
import { BankPanel } from "@/components/BankPanel";
import { CostBreakdownPanel } from "@/components/CostBreakdownPanel";
import { LightningWalletPanel } from "@/components/LightningWalletPanel";
import { BitcoinWalletPanel } from "@/components/BitcoinWalletPanel";
import { EmpirePanel } from "@/components/EmpirePanel";
import { CityMapPanel } from "@/components/CityMapPanel";
import { LocationPanel } from "@/components/LocationPanel";
import { RewardsPanel } from "@/components/RewardsPanel";
import { InsightsPanel } from "@/components/InsightsPanel";
import { Button } from "@/components/ui/button";
import { GameState } from "@/types/game";
import {
  freshState, processDayEnd, purchaseStock, buyMachine, unlockLocation, buyUpgrade,
  zapPromo, takeRescueLoan, sellSats, receiveSats, forecastCosts, totalStock, refillLines, refillJars, buyMarketing, toggleOngoingMarketing, takeLoan, repayLoan, advanceCrate,
  buyBtc, sweepLightningToChain, consolidateUtxos, buyMiningRig, toggleMining,
  stockCapacity, totalMachines, hasUpgrade, SAVE_KEY, ActionResult, LN_CUSTOMER_SHARE,
} from "@/lib/gameLogic";
import { Play, FastForward, RotateCcw, HelpCircle, X, Volume2, VolumeX, Store, Map, Candy, Castle, Trophy, Cog } from "lucide-react";
import { chiptune, MUSIC_PREF_KEY } from "@/lib/music";
import { sfxCoin, sfxError, sfxFanfare, setSfxEnabled, SFX_PREF_KEY } from "@/lib/sfx";
import { toast } from "sonner";
import crateStage1 from "@/assets/gm1-stage-1.jpg";
import crateStage2 from "@/assets/gm1-stage-2.jpg";
import crateStage3 from "@/assets/gm1-stage-3.jpg";
import crateStage4 from "@/assets/gm1-stage-4.jpg";
import gm1Intro from "@/assets/gm1-intro.mp4";

const CRATE_STEPS = [
  { img: crateStage1, title: "A bigger crate just landed at the Corner Shop.", btn: "Open the crate" },
  { img: crateStage2, title: "The lid is off. Something red is rising out of the packing.", btn: "Keep unpacking" },
  { img: crateStage3, title: "Panels down. There she is.", btn: "Clear the wreckage" },
  { img: crateStage4, title: "Your first machine. GM-1, First Edition, and all yours.", btn: "Start selling" },
];
const CRATE_STEP_NAMES = ["Sealed", "Open", "Uncovered", "Ready"];
const THEME_KEY = "gum-mogul-theme";

const loadSave = (): GameState => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.day === "number" && Array.isArray(parsed.products)) {
        const merged = { ...freshState(), ...parsed };
        // Locations added in later versions must appear in old saves:
        // keep the player's unlocked/machines for ids they already have.
        if (Array.isArray(parsed.locations)) {
          merged.locations = freshState().locations.map((fresh) => {
            const saved = parsed.locations.find((l: { id: string }) => l.id === fresh.id);
            return saved ? { ...fresh, unlocked: !!saved.unlocked, machines: saved.machines ?? fresh.machines } : fresh;
          });
        }
        // Same for upgrades added later (Digital Displays, Extra Large Jars...).
        if (Array.isArray(parsed.upgrades)) {
          merged.upgrades = freshState().upgrades.map((fresh) => {
            const saved = parsed.upgrades.find((u: { id: string }) => u.id === fresh.id);
            return saved ? { ...fresh, owned: !!saved.owned } : fresh;
          });
        }
        // Old saves held a single bank loan: migrate it into the loans list.
        if (!Array.isArray(parsed.loans) && (parsed.bankLoan ?? 0) > 0) {
          merged.loans = [{ id: 1, tierId: parsed.bankLoanTier ?? "starter", name: "Bank Loan", emoji: "🏦", principal: parsed.bankLoan, owed: parsed.bankLoan, dayTaken: parsed.day ?? 1 }];
        }
        // Old saves ran exactly one mining rig: migrate to the fleet count.
        if (typeof parsed.miningMachines !== "number" && parsed.miningOwned) {
          merged.miningMachines = 1;
        }
        // Saves from before the crate opening: anyone already playing has
        // long since unpacked their first machine.
        if (typeof parsed.firstMachineUnpacked !== "boolean") {
          merged.firstMachineUnpacked = merged.locations.some((l) => (l.machines ?? 0) > 0) || (parsed.day ?? 1) > 1;
          merged.crateStep = merged.firstMachineUnpacked ? 3 : 0;
        }
        return merged;
      }
    }
  } catch { /* corrupted save falls through to a fresh game */ }
  return freshState();
};

const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 3) % 100}%`,
  size: 14 + ((i * 13) % 44),
  delay: `${(i * 1.7) % 12}s`,
  duration: `${11 + (i % 5) * 3}s`,
}));

const Index = () => {
  const [gameState, setGameState] = useState<GameState>(loadSave);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sfxOn, setSfxOn] = useState<boolean>(() => {
    try { return localStorage.getItem(SFX_PREF_KEY) !== "off"; } catch { return true; }
  });
  // The game is built around the Map: it is the home screen. Only a brand
  // new player (crate still sealed) starts on the Machines screen.
  const [activeTab, setActiveTab] = useState(() => (gameState.firstMachineUnpacked ? "map" : "play"));
  const [selectedLocId, setSelectedLocId] = useState("corner");
  // The no-text intro plays once for a new player, above the crate; it
  // collapses away when it ends or is skipped, and can be replayed.
  const [showIntro, setShowIntro] = useState(true);
  // Two unified color modes: Pink (default) and Blue (serious). One switch
  // re-skins every token-driven surface; the choice persists per player.
  const [theme, setTheme] = useState<"pink" | "blue">(() => {
    try { return localStorage.getItem(THEME_KEY) === "blue" ? "blue" : "pink"; } catch { return "pink"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => { setSfxEnabled(sfxOn); }, [sfxOn]);
  const toggleSfx = () => {
    const nowOn = !sfxOn;
    setSfxOn(nowOn);
    setSfxEnabled(nowOn);
    try { localStorage.setItem(SFX_PREF_KEY, nowOn ? "on" : "off"); } catch { /* ignore */ }
    if (nowOn) sfxCoin();
  };

  // Separate screens per menu (Duck.ai arrangement review, 2026-11-08):
  // the tab bar switches screens, it does not scroll one long page.
  const goToSection = (id: string) => {
    setActiveTab(id);
    window.scrollTo({ top: 0 });
  };

  // If the player left music on last visit, browsers still demand one
  // gesture before audio: the first click or tap anywhere starts it.
  useEffect(() => {
    let wanted = false;
    try { wanted = localStorage.getItem(MUSIC_PREF_KEY) === "on"; } catch { wanted = false; }
    if (!wanted) return;
    const kick = () => { chiptune.start(); setMusicOn(true); };
    window.addEventListener("pointerdown", kick, { once: true });
    return () => window.removeEventListener("pointerdown", kick);
  }, []);

  useEffect(() => {
    chiptune.onBlocked = () => { setMusicOn(false); toast.error("🎵 The browser blocked the music. Tap the speaker again."); };
    chiptune.onComposing = () => { toast.info("🎼 Composing your 3-minute overture, one moment..."); };
    return () => { chiptune.onBlocked = null; chiptune.onComposing = null; };
  }, []);

  const toggleMusic = () => {
    const nowOn = chiptune.toggle();
    setMusicOn(nowOn);
    if (nowOn) toast.success("🎵 Gum Mogul Overture on (3 minutes, orchestral)");
    try { localStorage.setItem(MUSIC_PREF_KEY, nowOn ? "on" : "off"); } catch { /* ignore */ }
  };
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); } catch { /* storage full/blocked: game still runs */ }
  }, [gameState]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const t = setInterval(() => {
      if (stateRef.current.gameOver) { setIsAutoPlaying(false); return; }
      if (stateRef.current.cash < 0) {
        setIsAutoPlaying(false);
        toast.error("Auto Play stopped: you are in the red. Fix your cash before the 3-day bankruptcy clock runs out.", { duration: 5000 });
        return;
      }
      setGameState((s) => processDayEnd(s));
    }, 1500);
    return () => clearInterval(t);
  }, [isAutoPlaying]);

  const costs = forecastCosts(gameState);
  const refill = refillLines(gameState);
  const refillUnits = refill.reduce((n, l) => n + l.qty, 0);
  const refillCost = refill.reduce((n, l) => n + l.cost, 0);
  const apply = (result: ActionResult) => {
    if (result.ok) { setGameState(result.state); toast.success(result.message); sfxCoin(); }
    else { toast.error(result.message); sfxError(); }
  };

  const handleNextDay = () => {
    if (!gameState.firstMachineUnpacked) {
      toast.info("First job: open the crate at the Corner Shop.");
      return;
    }
    const before = gameState;
    const after = processDayEnd(before);
    setGameState(after);
    const p = after.lastDay;
    if (p) {
      if (p.netProfit >= 0) { toast.success(`Day ${before.day} done: +$${p.netProfit.toFixed(2)} profit${p.satsEarned > 0 ? `, +${p.satsEarned.toLocaleString()} sats ⚡` : ""}`); sfxCoin(); }
      else { toast.error(`Day ${before.day} done: $${Math.abs(p.netProfit).toFixed(2)} loss`); sfxError(); }
    }
    const newAchievements = after.achievements.filter((a) => !before.achievements.includes(a));
    if (newAchievements.length) sfxFanfare();
    newAchievements.forEach(() => toast.success("🏆 Achievement unlocked! Check the trophy shelf.", { duration: 4000 }));
    const newMilestones = (after.milestonesClaimed ?? 0) - (before.milestonesClaimed ?? 0);
    if (newMilestones > 0) { sfxFanfare(); toast.success("🎉 Milestone reached! Reward paid, check the diary.", { duration: 5000 }); }
  };

  const handleReset = () => {
    if (!window.confirm("Pop the whole empire and start again from $100?")) return;
    localStorage.removeItem(SAVE_KEY);
    setGameState(freshState());
    setIsAutoPlaying(false);
    toast.info("Fresh start. One machine, big dreams.");
  };

  const breakdownCosts = gameState.lastDay
    ? { revenue: gameState.lastDay.revenue, productCost: gameState.lastDay.productCost, rent: gameState.lastDay.rent, marketing: gameState.lastDay.marketing, depreciation: gameState.lastDay.depreciation, cardFees: gameState.lastDay.cardFees, miningFees: gameState.lastDay.miningFees ?? 0, tax: gameState.lastDay.tax, netProfit: gameState.lastDay.netProfit }
    : costs;

  // Beginners see less: the full numbers unlock once the loop is learned.
  const beginner = gameState.day <= 7 && gameState.totalRevenue < 500;
  const crated = !gameState.firstMachineUnpacked;
  const crateStep = Math.min(3, Math.max(0, gameState.crateStep ?? 0));

  return (
    <div className="min-h-screen relative overflow-x-clip game-scene">
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        {BUBBLES.map((b, i) => (
          <span key={i} className="bubble" style={{ left: b.left, width: b.size, height: b.size, animationDelay: b.delay, animationDuration: b.duration }} />
        ))}
      </div>

      {/* Persistent top bar on every screen but the Map: day, balances,
          Finance, settings. The diorama is a full game menu with its own
          buttons, so the global header hides there. */}
      {activeTab !== "map" && activeTab !== "location" && (
      <div className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center gap-2">
          <span className="font-black text-sm whitespace-nowrap">📅 Day {gameState.day}</span>
          <button onClick={() => goToSection("finance")} className="flex-1 flex items-center justify-center gap-3 rounded-full bg-slate-900 text-white font-black text-sm py-1.5 px-3 active:scale-[0.98] transition-transform" aria-label="Open Finance: wallet and bank">
            <span>💵 ${gameState.cash.toFixed(0)}</span>
            <span className="text-amber-300">⚡ {gameState.sats.toLocaleString()} sats</span>
            <span className="text-[11px] uppercase tracking-wide bg-white/20 rounded-full px-2 py-0.5">Finance</span>
          </button>
          <button onClick={() => setShowSettings(true)} aria-label="Open settings" className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-white/10 border-2 border-white/20 text-primary">
            <Cog className="h-4 w-4" />
          </button>
        </div>
      </div>
      )}

      <button
        onClick={toggleMusic}
        aria-label={musicOn ? "Turn the 8-bit music off" : "Turn the 8-bit music on"}
        title={musicOn ? "Music: on (8-bit chiptune, synthesized live)" : "Music: off"}
        className={`fixed bottom-[calc(8.4rem+env(safe-area-inset-bottom))] right-4 lg:bottom-44 lg:right-5 z-50 h-14 w-14 rounded-full border-[3px] border-white shadow-xl flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 ${activeTab === "map" || activeTab === "location" ? "hidden" : ""} ${musicOn ? (theme === "blue" ? "bg-gradient-to-br from-blue-600 to-teal-400 animate-floaty" : "bg-gradient-to-br from-fuchsia-500 to-amber-500 animate-floaty") : "bg-slate-500/85"}`}
      >
        {musicOn ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
      </button>

      {/* Global action bar (Duck.ai spec): Next Day with a live forecast,
          refill shortcut and auto play, floating above the dock. Hidden on
          the Map, whose diorama menu carries its own Next Day button. */}
      {activeTab !== "map" && activeTab !== "location" && (
      <div className="fixed bottom-[calc(3.4rem+env(safe-area-inset-bottom))] lg:bottom-[5.75rem] inset-x-0 z-40 bg-slate-950/75 backdrop-blur border-t border-white/10 px-3 pt-2 pb-2 flex gap-2 lg:max-w-2xl lg:mx-auto lg:rounded-t-3xl">
        <Button onClick={handleNextDay} disabled={isAutoPlaying || gameState.gameOver} className="flex-[1.4] h-12 rounded-full font-black gap-1.5">
          <Play className="h-5 w-5" /> Next Day <span className="text-[11px] font-bold opacity-85">est {costs.netProfit >= 0 ? "+" : "-"}${Math.abs(costs.netProfit).toFixed(0)}</span>
        </Button>
        <Button onClick={() => apply(refillJars(gameState))} disabled={refillUnits === 0 || gameState.gameOver} variant="secondary" className="flex-1 h-12 rounded-full font-black gap-1.5">
          🧃 Refill{refillUnits > 0 ? ` $${refillCost.toFixed(0)}` : ""}
        </Button>
        <Button onClick={() => setIsAutoPlaying(!isAutoPlaying)} variant={isAutoPlaying ? "destructive" : "outline"} className="h-12 w-12 rounded-full font-black p-0" aria-label={isAutoPlaying ? "Stop auto play" : "Auto play"}>
          <FastForward className="h-5 w-5" />
        </Button>
      </div>
      )}

      {/* Bottom dock: five screens (Duck.ai spec). Wallet and Bank live
          together on the Finance screen, opened from the top bar. Hidden on
          the Map, whose diorama menu carries its own dock. */}
      {activeTab !== "map" && activeTab !== "location" && (
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/75 backdrop-blur-xl border-t border-white/10 pt-1 pb-[max(0.3rem,env(safe-area-inset-bottom))] lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[600px] lg:bottom-3 lg:rounded-full lg:border lg:border-white/10 lg:shadow-2xl lg:px-3" aria-label="Game screens">
        <div className="grid grid-cols-5">
          {[
            { id: "map", label: "Map", icon: Map },
            { id: "play", label: "Machines", icon: Store },
            { id: "gums", label: "Gums", icon: Candy },
            { id: "empire", label: "Empire", icon: Castle },
            { id: "rewards", label: "Rewards", icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => goToSection(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${activeTab === tab.id ? "text-primary" : "text-white/55"}`}
            >
              <tab.icon className="h-5 w-5" strokeWidth={activeTab === tab.id ? 2.6 : 2} />
              <span className={`text-[11px] leading-none ${activeTab === tab.id ? "font-black" : "font-semibold"}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
      )}

      <div className="relative z-10 container mx-auto px-4 py-5 pb-56 lg:pb-36 sm:py-8 space-y-7 sm:space-y-10 max-w-7xl">
        <div className={activeTab === "play" ? "space-y-7 sm:space-y-10" : "hidden"}>
        <header id="play" className="text-center space-y-2">
          <div className="text-5xl sm:text-6xl animate-floaty inline-block">🍬</div>
          <h1 className={`text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-r ${theme === "blue" ? "from-blue-400 via-sky-400 to-teal-300" : "from-pink-400 via-fuchsia-400 to-amber-300"} bg-clip-text text-transparent drop-shadow-sm`}>
            Gum Mogul
          </h1>
          <p className="text-base sm:text-lg font-bold text-muted-foreground">Build a bubblegum empire, one machine at a time.</p>
          <button onClick={() => setShowHelp(!showHelp)} className="inline-flex items-center gap-1 font-black text-primary underline underline-offset-4">
            {showHelp ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />} How to play
          </button>
          <button onClick={() => setShowSettings(true)} aria-label="Open settings" className="ml-3 inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-white/10 border-[3px] border-white/20 shadow-[0_4px_0_rgba(0,0,0,0.25)] text-primary align-middle">
            <Cog className="h-5 w-5" />
          </button>
          {showHelp && (
            <div className="max-w-2xl mx-auto text-left bg-slate-950/70 backdrop-blur rounded-3xl border border-white/10 p-5 text-sm font-semibold space-y-2 animate-pop">
              <p>1. <strong>Stock up.</strong> Buy gum on the Gums tab so the machine is never empty.</p>
              <p>2. <strong>Set your price.</strong> Cheaper sells more. Pricier earns more per gum, until people walk away.</p>
              <p>3. <strong>Hit Next Day.</strong> That is the whole loop. Everything else unlocks as you grow.</p>
            </div>
          )}
        </header>

        {gameState.mogulReached && (
          <div className="text-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 rounded-full py-3 px-6 font-black text-amber-900 text-lg shadow-lg animate-pop">
            👑 HEADLINE GOAL SMASHED: $250,000 net worth. You are the Gum Tycoon, and the ladder keeps climbing: $2.5M is next. How big can it get?
          </div>
        )}

        {crated ? (
        <div className="max-w-3xl mx-auto w-full">
          {showIntro ? (
            <div className="relative rounded-[1.75rem] overflow-hidden border border-white/10 shadow-2xl mb-4">
              <video src={gm1Intro} poster={crateStage4} autoPlay muted playsInline onEnded={() => setShowIntro(false)} className="w-full h-[58dvh] object-cover" aria-label="Gum Mogul intro: the first machine being unpacked" />
              <button onClick={() => setShowIntro(false)} className="absolute top-3 right-3 rounded-full bg-slate-950/70 backdrop-blur-md px-4 py-2 text-white font-black text-[13px] active:scale-[0.97] transition-transform">Skip intro</button>
            </div>
          ) : (
            <button onClick={() => setShowIntro(true)} className="mb-3 text-[13px] font-black text-primary underline underline-offset-4">Replay the intro</button>
          )}
          <div className="bubbly-card overflow-hidden">
            <div className="flex gap-1.5 p-3 pb-0">
              {CRATE_STEP_NAMES.map((name, i) => (
                <span key={name} className={`flex-1 text-center text-[11px] font-black rounded-full py-1.5 ${i < crateStep ? "bg-emerald-500 text-white" : i === crateStep ? "bg-primary text-white" : "bg-white/10 text-white/45"}`}>{i + 1}. {name}</span>
              ))}
            </div>
            <img key={crateStep} src={CRATE_STEPS[crateStep].img} alt="Your first gum machine, being unpacked from its wooden crate" className="w-full h-[56dvh] sm:h-[600px] object-cover mt-3 animate-pop" draggable={false} />
            <div className="p-5 space-y-3 text-center">
              <p className="text-xl font-black">{CRATE_STEPS[crateStep].title}</p>
              <Button onClick={() => { const res = advanceCrate(gameState); apply(res); if (res.state.firstMachineUnpacked) goToSection("map"); }} className="w-full h-14 text-lg rounded-full font-black">
                {CRATE_STEPS[crateStep].btn}
              </Button>
              <p className="text-sm font-bold text-muted-foreground">Every empire starts with one machine.</p>
            </div>
          </div>
        </div>
        ) : (
        <>
        {/* News bar: HARD fixed height at every breakpoint, content is
            line-clamped inside it. The bar can never grow or shrink, so
            the page below never shifts when the headline changes. */}
        <div className="bg-slate-950/60 backdrop-blur rounded-3xl sm:rounded-full border border-white/10 px-6 font-bold text-center shadow h-[4.75rem] sm:h-[3.25rem] flex items-center justify-center overflow-hidden">
          {gameState.pendingEvent ? (
            <p className="line-clamp-3 sm:line-clamp-1">🔮 Tomorrow: {gameState.pendingEvent.icon} <strong>{gameState.pendingEvent.title}</strong> · demand x{gameState.pendingEvent.demandFactor}. {gameState.pendingEvent.text}</p>
          ) : (
            <p className="text-muted-foreground line-clamp-3 sm:line-clamp-1">🗞️ Tomorrow: a quiet day on the gum beat. No surprises forecast.</p>
          )}
        </div>

        <FinancialDashboard gameState={gameState} dailyProfit={costs.netProfit} simple={beginner} />

        <div className="max-w-2xl mx-auto w-full">
          <div className="flex flex-col gap-4">
            <VendingMachine gumCount={totalStock(gameState)} capacity={stockCapacity(gameState)} machines={totalMachines(gameState)} tickerText={hasUpgrade(gameState, "displays") ? gameState.products.filter((p) => p.unlocked).map((p) => `${p.emoji} ${p.name.toUpperCase()} $${p.sellPrice.toFixed(2)}`).join(" · ") + " · PAY WITH LIGHTNING ⚡ NO CARD FEES" : undefined} />
            <div className="order-first lg:order-none space-y-3">
              <div className="flex gap-3">
                <Button onClick={handleNextDay} disabled={isAutoPlaying || gameState.gameOver} className="flex-[1.7] h-14 text-lg rounded-full font-black gap-2 ring-4 ring-primary/30">
                  <Play className="h-5 w-5" /> Next Day
                </Button>
                <Button onClick={() => setIsAutoPlaying(!isAutoPlaying)} variant={isAutoPlaying ? "destructive" : "outline"} className="flex-1 h-14 text-base rounded-full font-black gap-2">
                  <FastForward className="h-5 w-5" /> {isAutoPlaying ? "Stop Auto" : "Auto Play"}
                </Button>
              </div>
              <Button onClick={() => apply(refillJars(gameState))} disabled={refillUnits === 0 || gameState.gameOver} variant="secondary" className="w-full h-12 rounded-full font-black gap-2">
                🧃 Refill jars{refillUnits > 0 ? `: ${refillUnits} gums for $${refillCost.toFixed(2)}` : " (already at forecast)"}
              </Button>
            </div>
            {!beginner && (
            <CostBreakdownPanel costs={breakdownCosts} title={gameState.lastDay ? "Yesterday in numbers" : "Today, forecast"} lnShare={gameState.lastDay ? gameState.lastDay.lnShare : hasUpgrade(gameState, "ln-terminal") ? LN_CUSTOMER_SHARE : 0} />
            )}
          </div>
        </div>
        </>
        )}
        </div>

        <div id="gums" className={activeTab === "gums" ? "" : "hidden"}>
          <ProductInventory
            gameState={gameState}
            onPurchase={(id, qty, method) => apply(purchaseStock(gameState, id, qty, method))}
            onPriceChange={(id, price) => setGameState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, sellPrice: price } : p)) }))}
          />
        </div>

        <div id="map" className={activeTab === "map" ? "" : "hidden"}>
          <CityMapPanel
            gameState={gameState}
            onUnlockLocation={(id) => apply(unlockLocation(gameState, id))}
            onBuyMachine={(id) => apply(buyMachine(gameState, id))}
            onNavigate={goToSection}
            onEnterLocation={(id) => { setSelectedLocId(id); goToSection("location"); }}
            onNextDay={handleNextDay}
            nextDayEst={costs.netProfit}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        <div id="location" className={activeTab === "location" ? "" : "hidden"}>
          <LocationPanel
            gameState={gameState}
            locationId={selectedLocId}
            onBack={() => goToSection("map")}
            onBuyMachine={(id) => apply(buyMachine(gameState, id))}
            onUnlockLocation={(id) => apply(unlockLocation(gameState, id))}
            onNavigate={goToSection}
            onNextDay={handleNextDay}
            nextDayEst={costs.netProfit}
          />
        </div>

        <div id="empire" className={activeTab === "empire" ? "" : "hidden"}>
        <EmpirePanel
          gameState={gameState}
          onBuyUpgrade={(id) => apply(buyUpgrade(gameState, id))}
          onMarketingChange={(spend) => setGameState((s) => ({ ...s, marketingSpend: spend }))}
          onRestockLevelChange={(levelId) => { setGameState((s) => ({ ...s, restockLevel: levelId })); toast.success(`Restock Bot set to ${levelId}`); }}
          onBuyMarketing={(channelId) => apply(buyMarketing(gameState, channelId))}
          onToggleOngoing={(activityId) => apply(toggleOngoingMarketing(gameState, activityId))}
        />
        </div>

        <div id="rewards" className={activeTab === "rewards" ? "" : "hidden"}>
          <RewardsPanel gameState={gameState} />
        </div>

        <div id="wallet" className={activeTab === "finance" ? "" : "hidden"}>
          <LightningWalletPanel
            gameState={gameState}
            onReceive={(amount, label) => { setGameState((s) => receiveSats(s, amount, label)); toast.success(`⚡ +${amount.toLocaleString()} sats settled`); }}
            onZapPromo={() => apply(zapPromo(gameState))}
            onSellSats={(amount) => apply(sellSats(gameState, amount))}
            onRescueLoan={() => apply(takeRescueLoan(gameState))}
          />
          <BitcoinWalletPanel
            gameState={gameState}
            onBuyBtc={(routeId, usd) => apply(buyBtc(gameState, routeId, usd))}
            onSweep={(amount) => apply(sweepLightningToChain(gameState, amount))}
            onConsolidate={() => apply(consolidateUtxos(gameState))}
            onBuyMining={(payWithSats: boolean) => apply(buyMiningRig(gameState, payWithSats))}
            onToggleMining={() => apply(toggleMining(gameState))}
          />
        </div>

        <div className={activeTab === "play" && !beginner && !crated ? "" : "hidden"}>
          <InsightsPanel gameState={gameState} />
        </div>

        <div id="bank" className={activeTab === "finance" ? "" : "hidden"}>
          <BankPanel
            gameState={gameState}
            onTakeLoan={(tierId) => apply(takeLoan(gameState, tierId))}
            onRepay={(amount, loanId) => apply(repayLoan(gameState, amount, loanId))}
          />
        </div>

        <footer className={`text-center text-sm font-bold text-muted-foreground pb-4 space-y-3 ${activeTab === "finance" ? "" : "hidden"}`}>
          <p>Gum Mogul is free and open source software (MIT). The sats in game are simulated; the Lightning Network it teaches is very real. ⚡</p>
          <Button onClick={handleReset} variant="outline" className="rounded-full gap-2 font-black" title="Reset game: wipe the save and start over">
            <RotateCcw className="h-4 w-4" /> Reset game
          </Button>
        </footer>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="game-frame relative bg-[hsl(var(--card))] max-w-sm w-full px-6 pb-6 pt-10 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="ribbon-title absolute -top-5 left-1/2 -translate-x-1/2 px-10 py-2 text-2xl font-black font-display whitespace-nowrap">Settings</div>
            <button onClick={() => setShowSettings(false)} aria-label="Close settings" className="absolute -top-3 right-3 h-10 w-10 rounded-xl bg-white/10 border-[3px] border-rose-300/50 shadow-[0_4px_0_rgba(0,0,0,0.3)] text-rose-400 font-black text-lg leading-none">✕</button>
            <div className="space-y-2.5 mt-1">
              <div className="w-full flex items-center justify-between bg-white/10 rounded-2xl border-2 border-white/10 px-4 py-3 font-black">
                <span>🎨 Color mode</span>
                <span className="flex gap-1.5">
                  <button onClick={() => setTheme("pink")} aria-pressed={theme === "pink"} className={`rounded-full px-3 py-1 text-sm ${theme === "pink" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Pink</button>
                  <button onClick={() => setTheme("blue")} aria-pressed={theme === "blue"} className={`rounded-full px-3 py-1 text-sm ${theme === "blue" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Blue</button>
                </span>
              </div>
              <button onClick={toggleMusic} className="w-full flex items-center justify-between bg-white/10 rounded-2xl border-2 border-white/10 px-4 py-3 font-black">
                <span>🎵 Music: Gum Mogul Overture</span><span className={musicOn ? "text-accent" : "text-muted-foreground"}>{musicOn ? "ON" : "OFF"}</span>
              </button>
              <button onClick={toggleSfx} className="w-full flex items-center justify-between bg-white/10 rounded-2xl border-2 border-white/10 px-4 py-3 font-black">
                <span>🔊 Sound effects</span><span className={sfxOn ? "text-accent" : "text-muted-foreground"}>{sfxOn ? "ON" : "OFF"}</span>
              </button>
              <button onClick={() => { setShowSettings(false); setShowHelp(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full flex items-center justify-between bg-white/10 rounded-2xl border-2 border-white/10 px-4 py-3 font-black">
                <span>❓ How to play</span><span className="text-primary">Open</span>
              </button>
              <button onClick={() => { setShowSettings(false); handleReset(); }} className="w-full flex items-center justify-between bg-white/10 rounded-2xl border-2 border-rose-300/40 px-4 py-3 font-black text-rose-400">
                <span>🗑️ Reset game</span><span>Wipe save</span>
              </button>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground text-center mt-4">Gum Mogul · free and open source (MIT) · the sats are simulated, the lessons are real ⚡</p>
          </div>
        </div>
      )}

      {gameState.gameOver && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] rounded-[2rem] border-[4px] border-rose-300/50 max-w-md w-full p-8 text-center shadow-2xl animate-pop">
            <div className="text-6xl mb-3">💥</div>
            <h2 className="text-3xl font-black">The bubble popped</h2>
            <p className="font-semibold text-muted-foreground mt-2">Three days in the red. You reached day {gameState.day} with {`$${gameState.totalRevenue.toFixed(0)}`} lifetime revenue and {gameState.achievements.length} achievements.</p>
            <div className="space-y-2 mt-6">
              {!gameState.rescueUsed && hasUpgrade(gameState, "ln-terminal") && (
                <Button onClick={() => apply(takeRescueLoan(gameState))} className="w-full rounded-full font-black h-12">
                  ⚡ Take the $200 Lightning rescue loan and keep going
                </Button>
              )}
              <Button onClick={handleReset} className="w-full rounded-full font-black h-12">Start a fresh empire</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
