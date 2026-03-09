import { beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/dom'
import 'whatwg-fetch'

// Setup jsdom environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock fetch
global.fetch = vi.fn()

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})