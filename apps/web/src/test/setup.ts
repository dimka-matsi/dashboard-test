import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

import { installMatchMediaMock, resetMatchMediaMock } from './media';

beforeAll(() => {
  installMatchMediaMock();
  // jsdom не реализует scrollIntoView
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  resetMatchMediaMock();
});
