"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { GameState, DevCardType, ResourceType } from "../../lib/types";
import { X } from "lucide-react";

interface Props {
    cardType: DevCardType | null;
    state: GameState;
    myPlayerId: string;
    // For Knight/RoadBuilding the modal just signals the mode; no action dispatched immediately
    onSetPendingCard: (card: "knight" | "road_building") => void;
    onConfirm: (action: import("../../lib/types").GameAction) => void;
    onClose: () => void;
}

const RESOURCES: ResourceType[] = ["wood", "brick", "wool", "wheat", "ore"];
const RES_COLORS: Record<string, string> = {
    wood: "bg-emerald-700 text-white",
    brick: "bg-[#d6512b] text-white",
    wool: "bg-green-400 text-green-950",
    wheat: "bg-yellow-400 text-yellow-950",
    ore: "bg-slate-500 text-white",
};
const RES_LABEL: Record<string, string> = {
    wood: "Wood", brick: "Brick", wool: "Wool", wheat: "Wheat", ore: "Ore",
};

export function DevCardModal({ cardType, onSetPendingCard, onConfirm, onClose }: Props) {
    const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);
    const [selectedResources, setSelectedResources] = useState<ResourceType[]>([]);

    if (!cardType) return null;

    const toggleResource2 = (res: ResourceType) => {
        setSelectedResources(prev => {
            if (prev.includes(res)) return prev.filter(r => r !== res);
            if (prev.length >= 2) return [...prev.slice(1), res];  // Replace oldest
            return [...prev, res];
        });
    };

    const renderContent = () => {
        switch (cardType) {
            case "knight":
                return (
                    <div className="text-center">
                        <div className="text-5xl mb-3">⚔️</div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Knight Card</h2>
                        <p className="text-slate-500 mb-6">
                            Move the robber to any hex and steal a card from a player on that hex.
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                            After clicking Play, click a hex on the board to place the robber.
                        </p>
                        <button
                            onClick={() => { onSetPendingCard("knight"); onClose(); }}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                        >
                            Play Knight
                        </button>
                    </div>
                );

            case "monopoly":
                return (
                    <div className="text-center">
                        <div className="text-5xl mb-3">💰</div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Monopoly</h2>
                        <p className="text-slate-500 mb-4">All other players give you ALL their cards of the chosen type.</p>
                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {RESOURCES.map(res => (
                                <button
                                    key={res}
                                    onClick={() => setSelectedResource(res)}
                                    className={`py-3 rounded-lg font-bold text-sm transition-all ${selectedResource === res
                                        ? `${RES_COLORS[res]} ring-4 ring-offset-2 ring-purple-500 scale-105`
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    {RES_LABEL[res]}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => selectedResource && onConfirm({ type: "PLAY_MONOPOLY", resource: selectedResource })}
                            disabled={!selectedResource}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold rounded-xl"
                        >
                            Claim Monopoly
                        </button>
                    </div>
                );

            case "year_of_plenty":
                return (
                    <div className="text-center">
                        <div className="text-5xl mb-3">🌾</div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Year of Plenty</h2>
                        <p className="text-slate-500 mb-4">Take any 2 resources from the bank (tap to select).</p>
                        <div className="grid grid-cols-5 gap-2 mb-2">
                            {RESOURCES.map(res => {
                                const count = selectedResources.filter(r => r === res).length;
                                return (
                                    <button
                                        key={res}
                                        onClick={() => toggleResource2(res)}
                                        className={`relative py-3 rounded-lg font-bold text-sm transition-all ${count > 0
                                            ? `${RES_COLORS[res]} scale-105`
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        {RES_LABEL[res]}
                                        {count > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border-2 border-purple-500 rounded-full text-purple-700 text-xs font-black flex items-center justify-center">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-400 mb-4">{selectedResources.length}/2 selected</p>
                        <button
                            onClick={() => {
                                if (selectedResources.length === 2) {
                                    const resources: Partial<Record<ResourceType, number>> = {};
                                    for (const r of selectedResources) {
                                        resources[r] = (resources[r] || 0) + 1;
                                    }
                                    onConfirm({ type: "PLAY_YEAR_OF_PLENTY", resources: resources as Record<ResourceType, number> });
                                }
                            }}
                            disabled={selectedResources.length !== 2}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold rounded-xl"
                        >
                            Take Resources
                        </button>
                    </div>
                );

            case "road_building":
                return (
                    <div className="text-center">
                        <div className="text-5xl mb-3">🛤️</div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Road Building</h2>
                        <p className="text-slate-500 mb-6">
                            Build 2 roads for free. After clicking Play, select 2 road locations on the board.
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                            Click an edge on the board to place each road.
                        </p>
                        <button
                            onClick={() => onConfirm({ type: "PLAY_ROAD_BUILDING" })}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                        >
                            Start Building Roads
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 relative"
                initial={{ scale: 0.85, y: 40 }} animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={20} />
                </button>
                {renderContent()}
            </motion.div>
        </motion.div>
    );
}
