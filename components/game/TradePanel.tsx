import React, { useState } from "react";
import { GameState, ResourceBundle, ResourceType, GameAction } from "../../lib/types";
import { getHarborRates } from "../../lib/game-logic/resources";

interface Props {
    state: GameState;
    myPlayerId: string;
    onDispatch: (action: GameAction) => void;
}

export function TradePanel({ state, myPlayerId, onDispatch }: Props) {
    const isMyTurn = state.currentPlayerId === myPlayerId && state.phase === "action";
    const [giveType, setGiveType] = useState<ResourceType | null>(null);
    const [getType, setGetType] = useState<ResourceType | null>(null);

    const me = state.players.find(p => p.id === myPlayerId);
    if (!me) return null;

    const rates = getHarborRates(myPlayerId, state.vertices);

    const handleBankTrade = () => {
        if (!giveType || !getType) return;
        const requiredAmt = rates[giveType] || 4;

        const offer: ResourceBundle = { [giveType]: requiredAmt };
        const request: ResourceBundle = { [getType]: 1 };

        onDispatch({ type: "BANK_TRADE", offer, request });
        setGiveType(null);
        setGetType(null);
    };

    const currentRate = giveType ? (rates[giveType] || 4) : 4;
    const canAfford = giveType ? ((me.resources[giveType] || 0) >= currentRate) : false;

    return (
        <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Bank Trade</h2>

            <div className="flex items-center gap-2 mb-3">
                <select
                    className="flex-1 p-2 border rounded text-sm bg-slate-50"
                    value={giveType || ""}
                    onChange={e => setGiveType(e.target.value as ResourceType)}
                    disabled={!isMyTurn}
                >
                    <option value="" disabled>Give</option>
                    <option value="wood">Wood (1:{rates.wood || 4})</option>
                    <option value="brick">Brick (1:{rates.brick || 4})</option>
                    <option value="wool">Wool (1:{rates.wool || 4})</option>
                    <option value="wheat">Wheat (1:{rates.wheat || 4})</option>
                    <option value="ore">Ore (1:{rates.ore || 4})</option>
                </select>

                <span className="font-bold text-slate-400">➔</span>

                <select
                    className="flex-1 p-2 border rounded text-sm bg-slate-50"
                    value={getType || ""}
                    onChange={e => setGetType(e.target.value as ResourceType)}
                    disabled={!isMyTurn}
                >
                    <option value="" disabled>Get</option>
                    <option value="wood">Wood</option>
                    <option value="brick">Brick</option>
                    <option value="wool">Wool</option>
                    <option value="wheat">Wheat</option>
                    <option value="ore">Ore</option>
                </select>
            </div>

            <button
                onClick={handleBankTrade}
                disabled={!isMyTurn || !giveType || !getType || !canAfford || giveType === getType}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded"
            >
                Trade {currentRate}:1
            </button>

            {/* Maritime-only setting disables the complex player trading UI for simplicity */}
            {!state.settings.maritimeOnly && (
                <div className="mt-4 pt-4 border-t border-slate-100 italic text-xs text-center text-slate-400">
                    Player trading is not implemented in this minimal build yet.
                </div>
            )}
        </div>
    );
}
