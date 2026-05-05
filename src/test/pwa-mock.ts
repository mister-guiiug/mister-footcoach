import { vi } from 'vitest';

export const useRegisterSW = vi.fn(() => ({
  needRefresh: [false as boolean, vi.fn()] as const,
  updateServiceWorker: vi.fn(),
}));
