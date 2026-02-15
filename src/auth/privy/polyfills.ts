// Web polyfills
import { Buffer } from 'buffer'

// Make Buffer available globally (needed by viem/tempo)
// Use globalThis for broad compatibility
globalThis.Buffer = Buffer
