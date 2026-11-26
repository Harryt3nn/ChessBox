import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { DrillPanel } from './WeakPoints';
import type { Drill } from '../weakpoints/lines';

const drill: Drill = {
  nodeId: 'n1', source: 'deviation', userSide: 'white', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  line: ['e4', 'e5', 'Nf3'], from: 1, scoredFrom: 2, boardNodeId: 'Nf3',
};

// DrillPanel has no hooks, so calling it gives the element tree without a DOM
function buttons(node: ReactNode): ReactElement<{ children: ReactNode; onClick: () => void }>[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === 'button' ? [node as ReactElement<{ children: ReactNode; onClick: () => void }>] : [];
  return [...own, ...buttons(node.props.children)];
}

function panel(done: boolean, handlers = { onOpenInBoard: vi.fn(), onNext: vi.fn(), onStop: vi.fn() }) {
  const tree = DrillPanel({
    session: { drills: [drill], index: 0, right: 0, scored: 0 },
    current: drill,
    drill: { prompt: done ? 'Drill complete.' : 'Your move: this one counts.', feedback: null, done },
    ...handlers,
  });
  const byLabel = Object.fromEntries(buttons(tree).map(b => [String(b.props.children), b.props.onClick]));
  return { byLabel, ...handlers };
}

describe('DrillPanel (D46)', () => {
  it('shows only Stop before the drill is answered, so the board link cannot give the move away', () => {
    expect(Object.keys(panel(false).byLabel)).toEqual(['Stop']);
  });

  it('shows Open in board and Next once the drill is over, and waits for Next', () => {
    const { byLabel, onNext } = panel(true);
    expect(Object.keys(byLabel)).toEqual(['Open in board', 'Next', 'Stop']);
    expect(onNext).not.toHaveBeenCalled();
    byLabel.Next();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("opens the board at the drill's boardNodeId", () => {
    const { byLabel, onOpenInBoard } = panel(true);
    byLabel['Open in board']();
    expect(onOpenInBoard).toHaveBeenCalledWith('Nf3');
  });
});
