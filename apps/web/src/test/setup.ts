import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { installMatchMediaMock, resetMatchMediaMock } from './media';
import { MockWebSocket } from './mock-socket';

beforeAll(() => {
  installMatchMediaMock();
  // jsdom не реализует scrollIntoView
  Element.prototype.scrollIntoView = () => undefined;
});

beforeEach(() => {
  // Реальный WebSocket jsdom пытался бы подключиться к ws://localhost и шумел ошибками.
  // Стаб ставится перед каждым тестом: vi.unstubAllGlobals() в тестах его снимает.
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  cleanup();
  resetMatchMediaMock();
  MockWebSocket.reset();
});
