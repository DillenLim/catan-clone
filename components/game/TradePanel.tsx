"use client";
import React, { useState, useEffect, useRef } from "react";
import { GameState, ResourceBundle, ResourceInput, ResourceType, GameAction, TradeOffer } from "../../lib/types";
import { getHarborRates } from "../../lib/game-logic/resources";
import { TreePine, BrickWall, Cloud, Wheat, Mountain, Minus, X, ArrowLeftRight, Building2, Users, RefreshCw } from "lucide-react";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDispatch: (action: GameAction) => void;
}

const RESOURCES: ResourceType[] = ["wood", "brick", "wool", "wheat", "ore"];

const ICON_MAP: Record<ResourceType, React.ReactNode> = {
    wood: <TreePine size={18} className="text-emerald-400" />,
    brick: <BrickWall size={18} className="text-[#eb6640]" />,
    wool: <Cloud size={18} className="text-lime-400" />,
    wheat: <Wheat size={18} className="text-amber-300" />,
    ore: <Mountain size={18} className="text-slate-400" />,
};

const ICON_MAP_SM: Record<ResourceType, React.ReactNode> = {
    wood: <TreePine size={13} className="text-emerald-400" />,
    brick: <BrickWall size={13} className="text-[#eb6640]" />,
    wool: <Cloud size={13} className="text-lime-400" />,
    wheat: <Wheat size={13} className="text-amber-300" />,
    ore: <Mountain size={13} className="text-slate-400" />,
};

const EMPTY_COUNTS = (): Record<ResourceType, number> => ({ wood: 0, brick: 0, wool: 0, wheat: 0, ore: 0 });

function ResourceCard({
    res, count, onClick, onDec, disabled, isError,
}: {
    res: ResourceType; count: number; onClick: () => void; onDec: () => void; disabled: boolean; isError?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative flex-1 flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-150 select-none min-w-0 ${count > 0
                ? isError
                    ? "bg-red-500/20 border-red-500/70"
                    : "bg-blue-500/10 border-blue-500/40"
                : "bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
        >
            {ICON_MAP[res]}

            {count > 0 && (
                <>
                    <div className={`absolute top-0.5 left-1 text-[11px] font-black leading-tight ${isError ? "text-red-400" : "text-blue-300"}`}>
                        {count}
                    </div>
                    <div
                        onClick={(e) => { e.stopPropagation(); onDec(); }}
                        className="absolute top-0 right-0 p-1 hover:bg-white/20 rounded-bl-lg transition-colors cursor-pointer"
                    >
                        <Minus size={9} className="text-white/50" strokeWidth={3} />
                    </div>
                </>
            )}
        </button>
    );
}

function IncomingOfferBanner({ offer, myId, players, onDispatch }: {
    offer: TradeOffer; myId: string; players: GameState["players"]; onDispatch: (a: GameAction) => void;
}) {
    const isMyOffer = offer.fromPlayerId === myId;
    const offerorName = players.find(p => p.id === offer.fromPlayerId)?.name ?? "?";

    const renderBundle = (bundle: ResourceInput) =>
        Object.entries(bundle).filter(([, v]) => (v || 0) > 0).map(([res, amt]) => (
            <span key={res} className="flex items-center gap-0.5">
                {ICON_MAP_SM[res as ResourceType]}
                <span className="font-black text-white/80 text-[11px]">{amt}</span>
            </span>
        ));

    return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-2.5 flex flex-col gap-2 mb-2">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    {isMyOffer ? "Waiting for response…" : `Trade from ${offerorName}`}
                </span>
                {isMyOffer ? (
                    <button
                        onClick={() => onDispatch({ type: "CANCEL_TRADE" })}
                        className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white uppercase font-black"
                    >
                        <X size={9} /> Cancel
                    </button>
                ) : (
                    <button
                        onClick={() => onDispatch({ type: "REJECT_TRADE", offerId: offer.id })}
                        className="flex items-center gap-1 text-[9px] text-red-400/70 hover:text-red-300 uppercase font-black"
                    >
                        <X size={9} /> Decline
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex gap-1.5 flex-wrap">{renderBundle(offer.offer)}</div>
                <ArrowLeftRight size={11} className="text-white/30 flex-shrink-0" />
                <div className="flex gap-1.5 flex-wrap">{renderBundle(offer.request)}</div>
            </div>
            {!isMyOffer && (
                <button
                    onClick={() => onDispatch({ type: "ACCEPT_TRADE", offerId: offer.id })}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-black text-[10px] text-white tracking-wider transition-colors"
                >
                    ACCEPT
                </button>
            )}
        </div>
    );
}

export function TradePanel({ state, myPlayerId, onDispatch }: Props) {
    const isMyTurn = state.currentPlayerId === myPlayerId && state.phase === "action";
    const [open, setOpen] = useState(false);
    const [giveCounts, setGiveCounts] = useState(EMPTY_COUNTS);
    const [getCounts, setGetCounts] = useState(EMPTY_COUNTS);
    const popupRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Auto-open popup when someone else sends a trade offer
    useEffect(() => {
        if (state.pendingTradeOffer && state.pendingTradeOffer.fromPlayerId !== myPlayerId) {
            setOpen(true);
        }
    }, [state.pendingTradeOffer, myPlayerId]);

    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return null;

    const rates = getHarborRates(myPlayerId, state.vertices);

    const handleClear = () => {
        setGiveCounts(EMPTY_COUNTS());
        setGetCounts(EMPTY_COUNTS());
    };

    const incGive = (res: ResourceType) => setGiveCounts(p => ({ ...p, [res]: (p[res] || 0) + 1 }));
    const decGive = (res: ResourceType) => setGiveCounts(p => ({ ...p, [res]: Math.max(0, (p[res] || 0) - 1) }));
    const incGet = (res: ResourceType) => setGetCounts(p => ({ ...p, [res]: (p[res] || 0) + 1 }));
    const decGet = (res: ResourceType) => setGetCounts(p => ({ ...p, [res]: Math.max(0, (p[res] || 0) - 1) }));

    // Bank validation
    let bankEffectiveOffers = 0;
    let canAffordGive = true;
    for (const res of RESOURCES) {
        const amt = giveCounts[res];
        if (amt > 0) {
            if ((me.resources[res] || 0) < amt) canAffordGive = false;
            const rate = rates[res] || 4;
            if (amt % rate === 0) bankEffectiveOffers += amt / rate;
        }
    }
    const totalGetAmt = RESOURCES.reduce((s, r) => s + (getCounts[r] || 0), 0);
    const hasGive = RESOURCES.some(r => giveCounts[r] > 0);
    const hasGet = RESOURCES.some(r => getCounts[r] > 0);
    const hasAnySelection = hasGive || hasGet;

    const bankTradeValid = isMyTurn && canAffordGive && totalGetAmt > 0 && bankEffectiveOffers === totalGetAmt;
    const playerTradeValid = isMyTurn && canAffordGive && hasGive && hasGet;
    const canOfferToPlayers = state.players.filter(p => p.id !== myPlayerId).length > 0;

    const handleBankTrade = () => {
        onDispatch({ type: "BANK_TRADE", offer: giveCounts, request: getCounts });
        handleClear();
    };

    const handleOfferTrade = () => {
        onDispatch({ type: "OFFER_TRADE", offer: giveCounts, request: getCounts });
        handleClear();
    };

    const hasPendingOffer = !!state.pendingTradeOffer;

    const triggerLabel = hasPendingOffer
        ? state.pendingTradeOffer!.fromPlayerId === myPlayerId ? "Offer Sent" : "Trade Offer!"
        : "Trade";

    return (
        <>
            {/* ── TRIGGER BUTTON (compact pill, sits beside hand) ── */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl font-black transition-all duration-200 flex-shrink-0 border-2 ${open
                    ? "bg-blue-600/40 border-blue-400 text-blue-200 shadow-lg shadow-blue-900/40"
                    : hasPendingOffer
                        ? "bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse shadow-lg shadow-amber-900/30"
                        : "bg-blue-900/30 border-blue-700/60 text-blue-400 hover:bg-blue-700/30 hover:border-blue-500 hover:text-blue-300"
                    }`}
            >
                <RefreshCw size={15} />
                <span className="text-[8px] tracking-widest uppercase leading-none">Trade</span>
                {hasPendingOffer && (
                    <span className="absolute top-1 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
                )}
            </button>

            {/* ── FLOATING POPUP ── */}
            {open && (
                <div
                    ref={popupRef}
                    className="fixed left-4 bottom-40 z-50 w-[340px] glass-dark rounded-2xl shadow-2xl border border-white/10 p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    style={{ maxHeight: "calc(100vh - 200px)" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Bank / Player Trade</span>
                        <div className="flex items-center gap-2">
                            {hasAnySelection && (
                                <button onClick={handleClear} className="flex items-center gap-1 text-[9px] text-white/40 hover:text-white uppercase font-black transition-colors">
                                    <X size={9} /> Clear
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Pending trade offer */}
                    {state.pendingTradeOffer && (
                        <IncomingOfferBanner
                            offer={state.pendingTradeOffer}
                            myId={myPlayerId}
                            players={state.players}
                            onDispatch={onDispatch}
                        />
                    )}

                    {/* Give row */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] uppercase font-black text-white/40 px-0.5">Give</span>
                        <div className="flex gap-1.5">
                            {RESOURCES.map(res => (
                                <ResourceCard
                                    key={res}
                                    res={res}
                                    count={giveCounts[res]}
                                    onClick={() => incGive(res)}
                                    onDec={() => decGive(res)}
                                    disabled={!isMyTurn}
                                    isError={giveCounts[res] > (me.resources[res] || 0)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Get row */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] uppercase font-black text-white/40 px-0.5">Get</span>
                        <div className="flex gap-1.5">
                            {RESOURCES.map(res => (
                                <ResourceCard
                                    key={res}
                                    res={res}
                                    count={getCounts[res]}
                                    onClick={() => incGet(res)}
                                    onDec={() => decGet(res)}
                                    disabled={!isMyTurn}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Context hint */}
                    {isMyTurn && (
                        <p className="text-[9px] text-white/25 text-center -mt-1">
                            Bank requires port rates (4:1 default). Players trade at any ratio.
                        </p>
                    )}
                    {!isMyTurn && (
                        <p className="text-[9px] text-white/25 text-center -mt-1">
                            Only available on your turn
                        </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-0.5">
                        <button
                            onClick={handleBankTrade}
                            disabled={!bankTradeValid}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all ${bankTradeValid
                                ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                                }`}
                        >
                            <Building2 size={13} />
                            Trade with Bank
                        </button>
                        <button
                            onClick={handleOfferTrade}
                            disabled={!playerTradeValid || !canOfferToPlayers || hasPendingOffer}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all ${playerTradeValid && canOfferToPlayers && !hasPendingOffer
                                ? "bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/30"
                                : "bg-white/5 text-white/20 cursor-not-allowed"
                                }`}
                        >
                            <Users size={13} />
                            Offer to Players
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
