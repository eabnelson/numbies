// Polyfills must be set up before any crypto-dependent code
// Using expo-crypto directly to avoid HMR issues with react-native-get-random-values
import * as ExpoCrypto from 'expo-crypto'

// Polyfill window for libraries that expect browser APIs (like Convex)
if (typeof window === 'undefined') {
  ;(global as any).window = global
}

// Polyfill document for libraries that expect it
if (typeof document === 'undefined') {
  ;(global as any).document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    documentElement: { style: {} },
    body: { style: {} },
    head: {},
  }
}

// Polyfill window.addEventListener/removeEventListener for online/offline detection
const listeners: Map<string, Set<(...args: any[]) => void>> = new Map()

if (typeof window.addEventListener !== 'function') {
  ;(window as any).addEventListener = (
    event: string,
    handler: (...args: any[]) => void,
  ) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event)?.add(handler)

    // Handle online/offline events via AppState
    if (event === 'online' || event === 'offline') {
      // React Native is always "online" when app is active
      // We could enhance this with NetInfo if needed
    }
  }
}

if (typeof window.removeEventListener !== 'function') {
  ;(window as any).removeEventListener = (
    event: string,
    handler: (...args: any[]) => void,
  ) => {
    listeners.get(event)?.delete(handler)
  }
}

// navigator.onLine polyfill (Convex uses this)
if (typeof navigator === 'undefined') {
  ;(global as any).navigator = {}
}
if (typeof navigator.onLine === 'undefined') {
  Object.defineProperty(navigator, 'onLine', {
    get: () => true, // Assume online in React Native
    configurable: true,
  })
}

// Set up crypto.getRandomValues polyfill
if (!global.crypto) {
  ;(global as any).crypto = {}
}

if (typeof global.crypto.getRandomValues !== 'function') {
  ;(global.crypto as any).getRandomValues = function getRandomValues<
    T extends ArrayBufferView,
  >(array: T): T {
    if (
      !(
        array instanceof Int8Array ||
        array instanceof Uint8Array ||
        array instanceof Int16Array ||
        array instanceof Uint16Array ||
        array instanceof Int32Array ||
        array instanceof Uint32Array ||
        array instanceof Uint8ClampedArray
      )
    ) {
      throw new TypeError('Expected an integer array')
    }
    if (array.byteLength > 65536) {
      throw new Error('Can only request a maximum of 65536 bytes')
    }
    // Use expo-crypto's native implementation
    const bytes = ExpoCrypto.getRandomBytes(array.byteLength)
    new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes)
    return array
  }
}

if (typeof global.crypto.randomUUID !== 'function') {
  ;(global.crypto as any).randomUUID = () => ExpoCrypto.randomUUID()
}

// Shims for ethers.js and text encoding
import '@ethersproject/shims'
import 'fast-text-encoding'

// BigInt JSON serialization polyfill (needed for viem/RPC calls)
// @ts-expect-error - adding toJSON to BigInt prototype
BigInt.prototype.toJSON = function () {
  return this.toString()
}
