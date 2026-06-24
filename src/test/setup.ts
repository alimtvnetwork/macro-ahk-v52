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
