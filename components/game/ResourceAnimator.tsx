import React, { useEffect, useState, useRef } from 'react';
import { GameState } from '../../lib/types';
import { TreePine, BrickWall, Wheat, Mountain, Cloud } from 'lucide-react';
import { axialToPixel, scaleCoords } from '../board/math';

interface Props {
    state: GameState;
}

interface AnimationParticle {
    id: string;
    resource: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
}

export function ResourceAnimator({ state }: Props) {
    const [particles, setParticles] = useState<AnimationParticle[]>([]);
    const lastDistributionRef = useRef(state.lastDistribution);

    useEffect(() => {
        if (state.lastDistribution && state.lastDistribution !== lastDistributionRef.current) {
            lastDistributionRef.current = state.lastDistribution;

            // Wait a tiny bit for the layout to settle after the dice roll
            setTimeout(() => {
                const newParticles: AnimationParticle[] = [];

                state.lastDistribution!.forEach((dist, index) => {
                    // 1. Find the starting pixel coordinates of the Hex
                    const hex = state.hexes.find(h => h.id === dist.hexId);
                    if (!hex) return;

                    // We need to map the internal SVG coords to screen coords.
                    // This is an estimation relative to the center of the board SVG.
                    // We'll spawn the particle centrally and animate it to the sidebar.
                    // The safest bet is finding the DOM elements directly to be window-resize resilient.

                    const hexElement = document.getElementById(`hex-${dist.hexId}`);
                    const playerElement = document.getElementById(`scoreboard-player-${dist.playerId}`);

                    if (hexElement && playerElement) {
                        const hexRect = hexElement.getBoundingClientRect();
                        const playerRect = playerElement.getBoundingClientRect();

                        // Create a particle for however many resources they got (cap at 3 to prevent lag)
                        const count = Math.min(dist.amount, 3);
                        for (let i = 0; i < count; i++) {

                            let color = "#ffffff";
                            if (dist.resource === "wood") color = "#34d399";
                            else if (dist.resource === "brick") color = "#eb6640";
                            else if (dist.resource === "wheat") color = "#fcd34d";
                            else if (dist.resource === "ore") color = "#94a3b8";
                            else if (dist.resource === "wool") color = "#a3e635";

                            newParticles.push({
                                id: `anim-${dist.hexId}-${dist.playerId}-${index}-${i}-${Date.now()}`,
                                resource: dist.resource,
                                // Add slight randomness so they burst outward
                                startX: hexRect.left + (hexRect.width / 2) + (Math.random() * 40 - 20),
                                startY: hexRect.top + (hexRect.height / 2) + (Math.random() * 40 - 20),
                                // Target the resource pill specifically, or general player area
                                endX: playerRect.left + 50 + (Math.random() * 20 - 10),
                                endY: playerRect.top + 50 + (Math.random() * 20 - 10),
                                color
                            });
                        }
                    }
                });

                if (newParticles.length > 0) {
                    setParticles(prev => [...prev, ...newParticles]);

                    // Cleanup particles after animation
                    setTimeout(() => {
                        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
                    }, 1200); // Wait for transition duration + small buffer
                }
            }, 100);
        }
    }, [state.lastDistribution, state.hexes]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map(p => {
                let Icon = TreePine;
                if (p.resource === "brick") Icon = BrickWall;
                else if (p.resource === "wheat") Icon = Wheat;
                else if (p.resource === "ore") Icon = Mountain;
                else if (p.resource === "wool") Icon = Cloud;

                return (
                    <div
                        key={p.id}
                        className="absolute drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        style={{
                            left: p.startX,
                            top: p.startY,
                            color: p.color,
                            transform: 'translate(-50%, -50%)',
                            animation: 'resourceFly 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
                        }}
                    >
                        {/* We use a custom local style tag for the dynamic keyframes per particle */}
                        <style>{`
                            @keyframes resourceFly {
                                0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
                                20% { opacity: 1; transform: translate(${((p.endX - p.startX) * 0.1)}px, ${((p.endY - p.startY) * 0.1) - 40}px) scale(1.5); }
                                80% { opacity: 1; transform: translate(${p.endX - p.startX}px, ${p.endY - p.startY}px) scale(1); }
                                100% { opacity: 0; transform: translate(${p.endX - p.startX}px, ${p.endY - p.startY}px) scale(0.5); }
                            }
                        `}</style>

                        <div className="bg-[#1e293b] p-2 rounded-full border border-white/20 shadow-2xl">
                            <Icon size={24} strokeWidth={3} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ResourceAnimator;
