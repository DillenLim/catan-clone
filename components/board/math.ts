// Math constants and functions for SVG rendering
export const HEX_SIZE = 55; // Reduced from 70 for better fit
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

/**
 * Pointy-top axial to pixel coordinates
 */
export function axialToPixel(q: number, r: number) {
    const x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = HEX_SIZE * (3 / 2 * r);
    return { x, y };
}

/**
 * Scale unit-radius coordinates from the server to screen pixels
 */
export function scaleCoords(x: number, y: number) {
    return {
        x: x * HEX_SIZE,
        y: y * HEX_SIZE
    };
}

export function hexCorners(cx: number, cy: number, size: number) {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = Math.PI / 180 * (60 * i - 30);
        return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
    });
}

/**
 * Calculate the bounding box for a set of hexes/vertices
 */
export function getBoardBounds(hexes: { q: number; r: number }[]) {
    if (hexes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    hexes.forEach(h => {
        const { x, y } = axialToPixel(h.q, h.r);
        const corners = hexCorners(x, y, HEX_SIZE);
        corners.forEach(c => {
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x);
            maxY = Math.max(maxY, c.y);
        });
    });

    // Add padding for harbors/labels (Increased to 1.5x HEX_SIZE to accommodate protruding docks)
    const padding = HEX_SIZE * 1.5;
    return {
        minX: minX - padding,
        minY: minY - padding,
        width: (maxX - minX) + padding * 2,
        height: (maxY - minY) + padding * 2
    };
}
