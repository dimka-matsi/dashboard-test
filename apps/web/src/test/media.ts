/** Управляемый мок matchMedia для jsdom: по умолчанию узкий экран (split-view выключен). */
let mediaMatches = false;
const listeners = new Set<() => void>();

export function setMediaMatches(value: boolean): void {
  mediaMatches = value;
  for (const listener of listeners) listener();
}

export function installMatchMediaMock(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        get matches() {
          return mediaMatches;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void) => {
          listeners.delete(listener);
        },
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

export function resetMatchMediaMock(): void {
  mediaMatches = false;
  listeners.clear();
}
