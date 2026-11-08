import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameState, Product } from "@/types/game";
import { formatCurrency, forecastDemand, hasUpgrade, SATS_PER_USD, LN_SUPPLIER_DISCOUNT, bulkDiscountFor, purchaseFactor } from "@/lib/gameLogic";
import { Lock, ShoppingCart, Zap, DollarSign, Minus, Plus, LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { GUM_IMAGES } from "@/assets/gumImages";

interface Props {
  gameState: GameState;
  onPurchase: (productId: string, quantity: number, method: "cash" | "sats") => void;
  onPriceChange: (productId: string, price: number) => void;
}

const VIEW_KEY = "gum-mogul-gums-view";
type View = "gallery" | "list";

// Two views on the same stock room: the gallery is one big gum at a time for
// swiping and setting up, the list is compact rows for batch stock work.
export const ProductInventory = ({ gameState, onPurchase, onPriceChange }: Props) => {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<"cash" | "sats">("cash");
  const [view, setView] = useState<View>(() => {
    try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "gallery"; } catch { return "gallery"; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);
  const lnReady = hasUpgrade(gameState, "ln-terminal");

  const priceStep = (p: Product) => (p.refPrice < 1 ? 0.05 : 0.25);
  const bumpPrice = (p: Product, dir: 1 | -1) => {
    const next = Math.round((p.sellPrice + dir * priceStep(p)) * 100) / 100;
    const clamped = Math.min(p.refPrice * 2.5, Math.max(Math.max(0.05, p.costPrice * 0.5), next));
    onPriceChange(p.id, clamped);
  };
  const mood = (p: Product): { word: string; cls: string } => {
    const margin = p.sellPrice - p.costPrice;
    if (p.sellPrice <= p.costPrice) return { word: "Below cost", cls: "text-rose-600" };
    if (margin / p.sellPrice <= 0.2 || p.sellPrice < p.refPrice) return { word: "Deal", cls: "text-emerald-600" };
    if (p.sellPrice > p.refPrice * 1.3) return { word: "Pricey", cls: "text-rose-600" };
    return { word: "Sweet spot", cls: "text-amber-600" };
  };
  const buyCost = (p: Product, q: number) => {
    const usd = p.costPrice * q * (1 - bulkDiscountFor(q)) * purchaseFactor(gameState);
    return method === "sats"
      ? `${Math.ceil(usd * SATS_PER_USD * (1 - LN_SUPPLIER_DISCOUNT)).toLocaleString()} sats`
      : formatCurrency(usd);
  };

  const qtyChips = (p: Product, small?: boolean) => {
    const q = qty[p.id] ?? 10;
    return (
      <div className="flex rounded-full overflow-hidden border-2 shrink-0">
        {[10, 25, 50, 100].map((n) => (
          <button key={n} onClick={() => setQty({ ...qty, [p.id]: n })} className={`${small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"} font-black ${q === n ? "bg-secondary text-white" : "bg-white text-muted-foreground"}`}>{n}</button>
        ))}
      </div>
    );
  };

  const priceStepper = (p: Product, big?: boolean) => (
    <div className="flex items-center gap-2">
      <button onClick={() => bumpPrice(p, -1)} aria-label={`Lower the price of ${p.name}`} className={`${big ? "h-11 w-11" : "h-8 w-8"} rounded-full bg-white border-2 font-black flex items-center justify-center active:scale-95 transition-transform`}><Minus className={big ? "h-5 w-5" : "h-4 w-4"} /></button>
      <div className="text-center min-w-[5.5rem]">
        <p className={`${big ? "text-3xl" : "text-lg"} font-black leading-none`}>{formatCurrency(p.sellPrice)}</p>
        <p className={`text-[11px] font-black uppercase ${mood(p).cls}`}>{mood(p).word}</p>
      </div>
      <button onClick={() => bumpPrice(p, 1)} aria-label={`Raise the price of ${p.name}`} className={`${big ? "h-11 w-11" : "h-8 w-8"} rounded-full bg-white border-2 font-black flex items-center justify-center active:scale-95 transition-transform`}><Plus className={big ? "h-5 w-5" : "h-4 w-4"} /></button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-black">🍬 The Gum Lineup</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-white border-[3px] overflow-hidden shadow" role="tablist" aria-label="Gums view">
            <button onClick={() => setView("gallery")} aria-pressed={view === "gallery"} className={`px-3.5 py-2 font-black flex items-center gap-1 text-sm ${view === "gallery" ? "bg-slate-900 text-white" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-4 w-4" /> Gallery
            </button>
            <button onClick={() => setView("list")} aria-pressed={view === "list"} className={`px-3.5 py-2 font-black flex items-center gap-1 text-sm ${view === "list" ? "bg-slate-900 text-white" : "text-muted-foreground"}`}>
              <List className="h-4 w-4" /> List
            </button>
          </div>
          <div className="flex rounded-full bg-white border-[3px] overflow-hidden shadow">
            <button onClick={() => setMethod("cash")} className={`px-4 py-2 font-black flex items-center gap-1 ${method === "cash" ? "bg-primary text-white" : "text-muted-foreground"}`}>
              <DollarSign className="h-4 w-4" /> Cash
            </button>
            <button onClick={() => lnReady && setMethod("sats")} disabled={!lnReady} className={`px-4 py-2 font-black flex items-center gap-1 ${method === "sats" ? "bg-amber-400 text-white" : "text-muted-foreground"} disabled:opacity-40`} title={lnReady ? "Pay suppliers over Lightning, 8% cheaper" : "Buy the Lightning Terminal upgrade first"}>
              <Zap className="h-4 w-4" /> Sats -8%
            </button>
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold text-muted-foreground -mt-2">
        {view === "gallery" ? "Swipe through your gums. One at a time: set the price, stock up." : "Every gum on one screen, for fast batch stock work."} Bulk deals: 25+ is 5% off, 50+ is 10%, 100+ is 15%.
      </p>

      {view === "gallery" ? (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {gameState.products.map((p) => {
            const forecast = Math.round(forecastDemand(gameState, p));
            const q = qty[p.id] ?? 10;
            if (!p.unlocked) {
              return (
                <Card key={p.id} className="bubbly-card overflow-hidden snap-center shrink-0 w-[86%] sm:w-[400px] opacity-80">
                  <div className="h-52 overflow-hidden grayscale"><img src={GUM_IMAGES[p.id]} alt={p.name} className="w-full h-full object-cover" draggable={false} /></div>
                  <div className="p-5 text-center space-y-1.5">
                    <h3 className="text-2xl font-black flex items-center justify-center gap-2"><Lock className="h-5 w-5" /> {p.name}</h3>
                    <p className="font-bold text-muted-foreground">Unlocks at {formatCurrency(p.unlockRevenue || 0)} total revenue</p>
                  </div>
                </Card>
              );
            }
            const low = p.stock < forecast;
            return (
              <Card key={p.id} className="bubbly-card overflow-hidden snap-center shrink-0 w-[86%] sm:w-[400px]">
                <div className="h-52 overflow-hidden"><img src={GUM_IMAGES[p.id]} alt={p.name} className="w-full h-full object-cover" draggable={false} /></div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-2xl font-black leading-tight">{p.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-sm font-black whitespace-nowrap ${low ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{p.stock} in stock</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-muted-foreground">Your price</span>
                    {priceStepper(p, true)}
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Sells about {forecast} a day{low && <span className="text-rose-600 font-black"> · you will run out</span>}</p>
                  <div className="flex items-center gap-2">
                    {qtyChips(p)}
                    <Button onClick={() => onPurchase(p.id, q, method)} className="flex-1 h-11 rounded-full font-black gap-1">
                      <ShoppingCart className="h-4 w-4" /> {buyCost(p, q)}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {gameState.products.map((p) => {
            const forecast = Math.round(forecastDemand(gameState, p));
            const q = qty[p.id] ?? 10;
            if (!p.unlocked) {
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-3xl border-2 border-dashed bg-muted/50 px-3 py-2.5 opacity-70">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden grayscale shrink-0"><img src={GUM_IMAGES[p.id]} alt={p.name} className="w-full h-full object-cover" draggable={false} /></div>
                  <p className="font-black flex items-center gap-2"><Lock className="h-4 w-4" /> {p.name}</p>
                  <p className="ml-auto text-sm font-bold text-muted-foreground whitespace-nowrap">at {formatCurrency(p.unlockRevenue || 0)} revenue</p>
                </div>
              );
            }
            const low = p.stock < forecast;
            const need = Math.max(10, Math.ceil((forecast - p.stock) / 10) * 10);
            return (
              <div key={p.id} className="rounded-3xl border-2 bg-white/85 backdrop-blur px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0"><img src={GUM_IMAGES[p.id]} alt={p.name} className="w-full h-full object-cover" draggable={false} /></div>
                  <div className="min-w-0">
                    <p className="font-black leading-tight truncate">{p.name}</p>
                    <p className={`text-xs font-black ${low ? "text-rose-600" : "text-muted-foreground"}`}>{p.stock} in stock · sells ~{forecast}/day</p>
                  </div>
                  <div className="ml-auto">{priceStepper(p)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {qtyChips(p, true)}
                  <Button onClick={() => onPurchase(p.id, q, method)} className="flex-1 h-9 rounded-full font-black gap-1 text-sm">
                    <ShoppingCart className="h-4 w-4" /> {buyCost(p, q)}
                  </Button>
                  {low && (
                    <Button onClick={() => onPurchase(p.id, need, method)} variant="secondary" className="h-9 rounded-full font-black text-sm whitespace-nowrap">
                      Top up +{need}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
