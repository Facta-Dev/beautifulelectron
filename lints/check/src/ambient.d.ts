// Ambient modules so the violation harness type-checks clean without
// installing electron, react or the full node type packages. The violations
// are lint-level; tsc only proves the files parse and type-check, so the
// ambient surface stays deliberately tiny.
declare module "electron" {
  export const app: { whenReady(): Promise<void> };
  export const ipcMain: {
    handle(channel: string, handler: (...args: unknown[]) => unknown): void;
  };
  export const ipcRenderer: {
    send(channel: string, ...args: unknown[]): void;
  };
}

declare module "node:fs" {
  export function readFileSync(path: string, ...args: unknown[]): unknown;
}

declare module "react" {
  export function createElement(...args: unknown[]): unknown;
}

declare const process: {
  env: Record<string, string | undefined>;
  version: string;
};

declare function require(id: string): unknown;
