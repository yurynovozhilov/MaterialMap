/**
 * Jest setup file - provides browser environment mocks
 */

// Mock browser globals for Node.js environment
global.window = {
  location: {
    hostname: 'localhost',
    protocol: 'http:',
    pathname: '/'
  },
  localStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  sessionStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  fetch: jest.fn()
};

global.document = {
  createElement: jest.fn(() => ({
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    innerHTML: '',
    textContent: '',
    value: ''
  })),
  getElementById: jest.fn(() => null),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),
  getElementsByClassName: jest.fn(() => []),
  getElementsByTagName: jest.fn(() => []),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.navigator = {
  userAgent: 'Jest',
  platform: 'Node.js'
};

// Mock jQuery
global.$ = jest.fn(() => ({
  DataTable: jest.fn(() => ({})),
  closest: jest.fn(() => ({})),
  on: jest.fn(),
  off: jest.fn(),
  trigger: jest.fn(),
  addClass: jest.fn(),
  removeClass: jest.fn(),
  toggleClass: jest.fn(),
  hasClass: jest.fn(() => false),
  attr: jest.fn(),
  removeAttr: jest.fn(),
  prop: jest.fn(),
  val: jest.fn(),
  text: jest.fn(),
  html: jest.fn(),
  append: jest.fn(),
  prepend: jest.fn(),
  remove: jest.fn(),
  hide: jest.fn(),
  show: jest.fn(),
  fadeIn: jest.fn(),
  fadeOut: jest.fn(),
  each: jest.fn(),
  find: jest.fn(() => ({})),
  parent: jest.fn(() => ({})),
  children: jest.fn(() => ({})),
  siblings: jest.fn(() => ({})),
  length: 0
}));

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Mock crypto for UUID generation (if needed)
global.crypto = {
  randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012'),
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});