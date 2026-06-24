import "@testing-library/jest-dom";

const matchMediaStub = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

if (typeof window !== "undefined") {
  try {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: matchMediaStub,
    });
  } catch {
    (window as unknown as { matchMedia: typeof matchMediaStub }).matchMedia = matchMediaStub;
  }
}

if (typeof globalThis !== "undefined") {
  (globalThis as unknown as { matchMedia: typeof matchMediaStub }).matchMedia = matchMediaStub;
}

/* ─── Global sql.js WASM shim ────────────────────────────────────────
 * sql.js in Node tries to fetch its WASM from `https://sql.js.org/...`
 * and falls back to `fs.readFile`/`fs.readFileSync` with that URL as
 * the path, which crashes with ENOENT. Install the shim once per worker
 * so any test that loads sql.js (directly or transitively) can resolve
 * the bundled WASM bytes instead.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const wasmPath = path.resolve(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBytes = fs.readFileSync(wasmPath);

  const isWasm = (p: unknown): boolean => {
    if (typeof p === "string") return p.includes("sql-wasm.wasm");
    if (p instanceof URL) return p.href.includes("sql-wasm.wasm");
    return false;
  };

  const origReadFile = fs.readFile.bind(fs);
  const origReadFileSync = fs.readFileSync.bind(fs);
  type ReadFileCb = (err: NodeJS.ErrnoException | null, data: Buffer) => void;
  (fs as unknown as { readFile: unknown }).readFile = (
    p: string, ...rest: unknown[]
  ): void => {
    if (isWasm(p)) {
      const cb = rest[rest.length - 1] as ReadFileCb;
      cb(null, wasmBytes);
      return;
    }
    (origReadFile as unknown as (...a: unknown[]) => void)(p, ...rest);
  };
  (fs as unknown as { readFileSync: unknown }).readFileSync = (
    p: string, ...rest: unknown[]
  ): Buffer | string => {
    if (isWasm(p)) return wasmBytes;
    return (origReadFileSync as unknown as (...a: unknown[]) => Buffer | string)(p, ...rest);
  };

  const originalFetch: typeof fetch | undefined = globalThis.fetch?.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL ? input.href : input.url;
    if (url.includes("sql-wasm.wasm")) {
      return new Response(wasmBytes, {
        status: 200,
        headers: { "Content-Type": "application/wasm" },
      });
    }
    if (originalFetch) return originalFetch(input, init);
    throw new Error(`fetch shim: unexpected URL ${url}`);
  }) as typeof fetch;
} catch {
  // sql.js not installed or wasm missing — tests that need it will fail loudly.
}
