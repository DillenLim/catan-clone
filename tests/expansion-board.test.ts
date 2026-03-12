import { generateBoard, shuffleDevCards } from '../lib/game-logic/board';
import { getExpansionConfig } from '../lib/types';

// ── Helper: count harbors by finding edges where both vertices share the same harbor type ──
function countHarbors(
  vertices: ReturnType<typeof generateBoard>['vertices'],
  edges: ReturnType<typeof generateBoard>['edges']
) {
  const harbors: { type: string }[] = [];
  for (const edge of edges) {
    const v1 = vertices[edge.vertexIds[0]];
    const v2 = vertices[edge.vertexIds[1]];
    if (v1.harbor && v2.harbor && v1.harbor.type === v2.harbor.type) {
      harbors.push(v1.harbor);
    }
  }
  return harbors;
}

// ═══════════════════════════════════════════════════════════════════
//  Board Generation Tests
// ═══════════════════════════════════════════════════════════════════

describe('Board Generation', () => {

  // ── Base board (19 hexes) ──────────────────────────────────────

  describe('Base board (19 hexes)', () => {
    const board = generateBoard('base');

    it('produces exactly 19 hexes', () => {
      expect(board.hexes).toHaveLength(19);
    });

    it('has correct terrain counts', () => {
      const counts: Record<string, number> = {};
      for (const hex of board.hexes) {
        counts[hex.type] = (counts[hex.type] || 0) + 1;
      }
      expect(counts['forest']).toBe(4);
      expect(counts['field']).toBe(4);
      expect(counts['mountain']).toBe(3);
      expect(counts['pasture']).toBe(4);
      expect(counts['hill']).toBe(3);
      expect(counts['desert']).toBe(1);
    });

    it('has 18 number tokens (deserts have null)', () => {
      const tokened = board.hexes.filter(h => h.numberToken !== null);
      expect(tokened).toHaveLength(18);
    });

    it('has 9 harbors (4 generic, 5 resource-specific)', () => {
      const harbors = countHarbors(board.vertices, board.edges);
      expect(harbors).toHaveLength(9);

      const generic = harbors.filter(h => h.type === 'generic');
      const specific = harbors.filter(h => h.type !== 'generic');
      expect(generic).toHaveLength(4);
      expect(specific).toHaveLength(5);
    });
  });

  // ── 5-6 board (30 hexes) ──────────────────────────────────────

  describe('5-6 board (30 hexes)', () => {
    const board = generateBoard('5-6');

    it('produces exactly 30 hexes', () => {
      expect(board.hexes).toHaveLength(30);
    });

    it('has correct terrain counts', () => {
      const counts: Record<string, number> = {};
      for (const hex of board.hexes) {
        counts[hex.type] = (counts[hex.type] || 0) + 1;
      }
      expect(counts['forest']).toBe(6);
      expect(counts['field']).toBe(6);
      expect(counts['mountain']).toBe(5);
      expect(counts['pasture']).toBe(6);
      expect(counts['hill']).toBe(5);
      expect(counts['desert']).toBe(2);
    });

    it('has 28 number tokens', () => {
      const tokened = board.hexes.filter(h => h.numberToken !== null);
      expect(tokened).toHaveLength(28);
    });

    it('has 11 harbors (6 generic, 5 resource-specific)', () => {
      const harbors = countHarbors(board.vertices, board.edges);
      expect(harbors).toHaveLength(11);

      const generic = harbors.filter(h => h.type === 'generic');
      const specific = harbors.filter(h => h.type !== 'generic');
      expect(generic).toHaveLength(6);
      expect(specific).toHaveLength(5);
    });
  });

  // ── 7-8 board (37 hexes) ──────────────────────────────────────

  describe('7-8 board (37 hexes)', () => {
    const board = generateBoard('7-8');

    it('produces exactly 37 hexes', () => {
      expect(board.hexes).toHaveLength(37);
    });

    it('has correct terrain counts', () => {
      const counts: Record<string, number> = {};
      for (const hex of board.hexes) {
        counts[hex.type] = (counts[hex.type] || 0) + 1;
      }
      expect(counts['forest']).toBe(7);
      expect(counts['field']).toBe(7);
      expect(counts['mountain']).toBe(7);
      expect(counts['pasture']).toBe(7);
      expect(counts['hill']).toBe(7);
      expect(counts['desert']).toBe(2);
    });

    it('has 35 number tokens', () => {
      const tokened = board.hexes.filter(h => h.numberToken !== null);
      expect(tokened).toHaveLength(35);
    });

    it('has 13 harbors (8 generic, 5 resource-specific)', () => {
      const harbors = countHarbors(board.vertices, board.edges);
      expect(harbors).toHaveLength(13);

      const generic = harbors.filter(h => h.type === 'generic');
      const specific = harbors.filter(h => h.type !== 'generic');
      expect(generic).toHaveLength(8);
      expect(specific).toHaveLength(5);
    });
  });

  // ── Shared invariants across all modes ────────────────────────

  describe.each<'base' | '5-6' | '7-8'>(['base', '5-6', '7-8'])(
    'Shared invariants (%s)',
    (mode) => {
      const board = generateBoard(mode);

      it('has vertices.length > 0', () => {
        expect(board.vertices.length).toBeGreaterThan(0);
      });

      it('has edges.length > 0', () => {
        expect(board.edges.length).toBeGreaterThan(0);
      });

      it('no hex has numberToken === 7', () => {
        for (const hex of board.hexes) {
          expect(hex.numberToken).not.toBe(7);
        }
      });

      it('all desert hexes have numberToken === null', () => {
        const deserts = board.hexes.filter(h => h.type === 'desert');
        for (const d of deserts) {
          expect(d.numberToken).toBeNull();
        }
      });

      it('all hex IDs are unique', () => {
        const ids = board.hexes.map(h => h.id);
        expect(new Set(ids).size).toBe(ids.length);
      });
    }
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Dev Card Deck Tests
// ═══════════════════════════════════════════════════════════════════

describe('Dev Card Deck', () => {

  it('base deck has 25 cards with correct distribution', () => {
    const deck = shuffleDevCards('base');
    expect(deck).toHaveLength(25);

    const counts: Record<string, number> = {};
    for (const card of deck) {
      counts[card] = (counts[card] || 0) + 1;
    }
    expect(counts['knight']).toBe(14);
    expect(counts['victory_point']).toBe(5);
    expect(counts['road_building']).toBe(2);
    expect(counts['year_of_plenty']).toBe(2);
    expect(counts['monopoly']).toBe(2);
  });

  it('5-6 deck has 34 cards with correct distribution', () => {
    const deck = shuffleDevCards('5-6');
    expect(deck).toHaveLength(34);

    const counts: Record<string, number> = {};
    for (const card of deck) {
      counts[card] = (counts[card] || 0) + 1;
    }
    expect(counts['knight']).toBe(20);
    expect(counts['victory_point']).toBe(5);
    expect(counts['road_building']).toBe(3);
    expect(counts['year_of_plenty']).toBe(3);
    expect(counts['monopoly']).toBe(3);
  });

  it('7-8 deck has 43 cards with correct distribution', () => {
    const deck = shuffleDevCards('7-8');
    expect(deck).toHaveLength(43);

    const counts: Record<string, number> = {};
    for (const card of deck) {
      counts[card] = (counts[card] || 0) + 1;
    }
    expect(counts['knight']).toBe(26);
    expect(counts['victory_point']).toBe(5);
    expect(counts['road_building']).toBe(4);
    expect(counts['year_of_plenty']).toBe(4);
    expect(counts['monopoly']).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  Expansion Config Tests
// ═══════════════════════════════════════════════════════════════════

describe('Expansion Config', () => {

  it('base config returns maxPlayers=4, bankPerResource=19, specialBuildPhase=false', () => {
    const config = getExpansionConfig('base');
    expect(config.maxPlayers).toBe(4);
    expect(config.bankPerResource).toBe(19);
    expect(config.specialBuildPhase).toBe(false);
  });

  it('5-6 config returns maxPlayers=6, bankPerResource=24, specialBuildPhase=true', () => {
    const config = getExpansionConfig('5-6');
    expect(config.maxPlayers).toBe(6);
    expect(config.bankPerResource).toBe(24);
    expect(config.specialBuildPhase).toBe(true);
  });

  it('7-8 config returns maxPlayers=8, bankPerResource=29, specialBuildPhase=true', () => {
    const config = getExpansionConfig('7-8');
    expect(config.maxPlayers).toBe(8);
    expect(config.bankPerResource).toBe(29);
    expect(config.specialBuildPhase).toBe(true);
  });
});
