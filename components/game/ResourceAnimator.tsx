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

// --- Memoized Particle to prevent React re-renders from restarting CSS animations ---
const AnimatedParticle = React.memo(({ p }: { p: AnimationParticle }) => {
    let Icon = TreePine;
    if (p.resource === "brick") Icon = BrickWall;
    else if (p.resource === "wheat") Icon = Wheat;
    else if (p.resource === "ore") Icon = Mountain;
    else if (p.resource === "wool") Icon = Cloud;

    return (
        <div
            className="absolute drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            style={{
                left: p.startX,
                top: p.startY,
                color: p.color,
                transform: 'translate(-50%, -50%)',
                animation: `fly_resource_anim 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                '--fly-delta-x': `${p.endX - p.startX}px`,
                '--fly-delta-y': `${p.endY - p.startY}px`
            } as React.CSSProperties}
        >
            <div className="bg-[#1e293b] p-2 rounded-full border border-white/20 shadow-2xl animate-pulse">
                <Icon size={24} strokeWidth={3} />
            </div>
        </div>
    );
});
AnimatedParticle.displayName = 'AnimatedParticle';

export function ResourceAnimator({ state }: Props) {
    const [particles, setParticles] = useState<AnimationParticle[]>([]);
    const lastDistributionRef = useRef(state.lastDistribution?.id || null);

    useEffect(() => {
        if (state.lastDistribution && state.lastDistribution.id !== lastDistributionRef.current) {
            lastDistributionRef.current = state.lastDistribution.id;

            const distributionData = state.lastDistribution;
            // Wait a tiny bit for the layout to settle after the dice roll
            setTimeout(() => {
                if (!distributionData) return;
                const newParticles: AnimationParticle[] = [];

                distributionData.resources.forEach((dist, index) => {
                    // 1. Find the starting pixel coordinates of the Hex
                    const hex = state.hexes.find(h => h.id === dist.hexId);

                    if (!hex) return;

                    // We need to map the internal SVG coords to screen coords.
                    // This is an estimation relative to the center of the board SVG.
                    // We'll spawn the particle centrally and animate it to the sidebar.
                    // The safest bet is finding the DOM elements directly to be window-resize resilient.

                    // 1. Get the actual SVG container bounds on screen
                    const svgElement = document.getElementById('catan-board-svg');
                    const targetElement = document.getElementById(`scoreboard-res-${dist.playerId}`);
                    const hexElement = document.getElementById(`hex-${dist.hexId}`);

                    if (svgElement && targetElement && hexElement) {
                        const svgRect = svgElement.getBoundingClientRect();
                        const targetRect = targetElement.getBoundingClientRect();
                        const hexRect = hexElement.getBoundingClientRect();

                        const startX = hexRect.left + (hexRect.width / 2);
                        const startY = hexRect.top + (hexRect.height / 2);

                        const finalStartX = startX > 0 ? startX : svgRect.left + (svgRect.width / 2);
                        const finalStartY = startY > 0 ? startY : svgRect.top + (svgRect.height / 2);

                        const count = Math.min(dist.amount, 3);
                        for (let i = 0; i < count; i++) {

                            let color = "#ffffff";
                            if (dist.resource === "wood") color = "#34d399";
                            else if (dist.resource === "brick") color = "#eb6640";
                            else if (dist.resource === "wheat") color = "#fcd34d";
                            else if (dist.resource === "ore") color = "#94a3b8";
                            else if (dist.resource === "wool") color = "#a3e635";

                            // End coordinates: targeting the resource UI icon
                            const endX = targetRect.left + (targetRect.width / 2) + (Math.random() * 10 - 5);
                            const endY = targetRect.top + (targetRect.height / 2) + (Math.random() * 10 - 5);

                            // Safe unique ID for keyframes without invalid characters (like hyphens at start or dots)
                            const sanitizedId = `anim_${dist.hexId}_${dist.playerId}_${index}_${i}_${Math.floor(Math.random() * 10000)}`;

                            newParticles.push({
                                id: sanitizedId,
                                resource: dist.resource,
                                startX: finalStartX + (Math.random() * 40 - 20),
                                startY: finalStartY + (Math.random() * 40 - 20),
                                endX,
                                endY,
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
                    }, 1200);
                }
            }, 100);
        } else if (!state.lastDistribution) {
            lastDistributionRef.current = null;
        }
    }, [state.lastDistribution]); // Important: removed state.hexes from dependencies to prevent unintended double firings

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {/* A single static keyframe definition using CSS variables */}
            <style>{`
                @keyframes fly_resource_anim {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(calc(-50% + var(--fly-delta-x) * 0.1), calc(-50% + var(--fly-delta-y) * 0.1 - 40px)) scale(1.5); }
                    80% { opacity: 1; transform: translate(calc(-50% + var(--fly-delta-x)), calc(-50% + var(--fly-delta-y))) scale(1); }
                    100% { opacity: 0; transform: translate(calc(-50% + var(--fly-delta-x)), calc(-50% + var(--fly-delta-y))) scale(0.5); }
                }
            `}</style>

            {particles.map(p => (
                <AnimatedParticle key={p.id} p={p} />
            ))}
        </div>
    );
}

export default ResourceAnimator;
