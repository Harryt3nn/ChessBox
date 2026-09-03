/*apps/desktop/src/types/stockfish.d.ts*/

declare module "stockfish" {
  interface StockfishEngine {
    sendCommand(cmd: string): void;
    listener: (line: string) => void;
    quit?: () => void;
  }

  function initEngine(enginePath?: string): Promise<StockfishEngine>;

  export default initEngine;
}