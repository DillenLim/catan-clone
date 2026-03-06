// Math functions for SVG rendering
export const HEX_SIZE = 56;
export const HEX_WIDTH = 2 * HEX_SIZE;
export const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

export function hexToPixel(q: number, r: number) {
    const x = HEX_SIZE * (3 / 2 * q);
    const y = HEX_SIZE * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
    return { x, y };
}

export function hexCorners(cx: number, cy: number, size: number) {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = Math.PI / 180 * (60 * i - 30);
        return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
    });
}

// ... more component exports to come
