// Math constants and functions for SVG rendering
export const HEX_SIZE = 70; // Increased base size for better visibility
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

// ... more component exports to come
