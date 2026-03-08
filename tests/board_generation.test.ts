import { generateBoard } from '../lib/game-logic/board';
import { Hex } from '../lib/types';

describe('Balanced Map Generation', () => {

    const isAdjacent = (h1: Hex, h2: Hex) => {
        return Math.max(
            Math.abs(h1.q - h2.q),
            Math.abs(h1.r - h2.r),
            Math.abs((-h1.q - h1.r) - (-h2.q - h2.r))
        ) === 1;
    };

    it('should never have adjacent identical numbers', () => {
        for (let i = 0; i < 50; i++) {
            const { hexes } = generateBoard();
            for (const h1 of hexes) {
                if (h1.numberToken === null) continue;
                for (const h2 of hexes) {
                    if (h1.id === h2.id || h2.numberToken === null) continue;
                    if (isAdjacent(h1, h2)) {
                        expect(h1.numberToken).not.toBe(h2.numberToken);
                    }
                }
            }
        }
    });

    it('should never have 3 identical resources meeting at a vertex', () => {
        for (let i = 0; i < 50; i++) {
            const { hexes } = generateBoard();
            for (const h1 of hexes) {
                if (h1.type === 'desert') continue;
                const neighbors = hexes.filter(h2 => h2.id !== h1.id && isAdjacent(h1, h2));

                for (let j = 0; j < neighbors.length; j++) {
                    for (let k = j + 1; k < neighbors.length; k++) {
                        const n1 = neighbors[j];
                        const n2 = neighbors[k];
                        if (isAdjacent(n1, n2)) {
                            // Triangle found
                            const types = [h1.type, n1.type, n2.type];
                            const allSame = types.every(t => t === h1.type);
                            expect(allSame).toBe(false);
                        }
                    }
                }
            }
        }
    });

    it('should never have adjacent red numbers (6 or 8)', () => {
        for (let i = 0; i < 50; i++) {
            const { hexes } = generateBoard();
            const redHexes = hexes.filter(h => h.numberToken === 6 || h.numberToken === 8);

            for (const r1 of redHexes) {
                for (const r2 of redHexes) {
                    if (r1.id === r2.id) continue;
                    expect(isAdjacent(r1, r2)).toBe(false);
                }
            }
        }
    });

    it('should always have exactly one desert with no token', () => {
        const { hexes } = generateBoard();
        const deserts = hexes.filter(h => h.type === 'desert');
        expect(deserts.length).toBe(1);
        expect(deserts[0].numberToken).toBeNull();
        expect(deserts[0].hasRobber).toBe(true);
    });

    it('should have the correct distribution of tokens', () => {
        const { hexes } = generateBoard();
        const tokens = hexes.map(h => h.numberToken).filter(t => t !== null).sort((a, b) => a! - b!);
        const expected = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12].sort((a, b) => a - b);
        expect(tokens).toEqual(expected);
    });

    it('should have the correct distribution of terrains', () => {
        const { hexes } = generateBoard();
        const counts: Record<string, number> = {};
        hexes.forEach(h => counts[h.type] = (counts[h.type] || 0) + 1);

        expect(counts['forest']).toBe(4);
        expect(counts['field']).toBe(4);
        expect(counts['pasture']).toBe(4);
        expect(counts['mountain']).toBe(3);
        expect(counts['hill']).toBe(3);
        expect(counts['desert']).toBe(1);
    });
});
