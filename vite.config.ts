import fs from 'node:fs'
import path from 'node:path'
import { tamaguiPlugin } from '@tamagui/vite-plugin'
import { one } from 'one/vite'
import { transformWithEsbuild, type UserConfig } from 'vite'

const resolveExportsSuffixes = {
  name: 'resolve-exports-suffixes',
  enforce: 'pre' as const,
  async resolveId(this: any, id: string, importer?: string) {
    const match = id.match(/^(.*)\/(require|import)(\?.*)?$/)
    if (!match) return null

    const baseId = `${match[1]}${match[3] ?? ''}`
    const resolved = await this.resolve(baseId, importer, { skipSelf: true })
    return resolved?.id ?? baseId
  },
}

const resolveMissingJsxToJs = {
  name: 'resolve-missing-jsx-to-js',
  enforce: 'pre' as const,
  resolveId(id: string, importer?: string) {
    if (!id.endsWith('.jsx')) return null
    const resolvedBase = importer
      ? path.resolve(path.dirname(importer), id)
      : id
    const candidate = resolvedBase.replace(/\.jsx$/, '.js')
    if (fs.existsSync(candidate)) {
      return candidate
    }
    return null
  },
}

const resolveSolanaPackages = {
  name: 'resolve-solana-packages',
  enforce: 'pre' as const,
  resolveId(id: string) {
    // Match @solana/* but not @solana/kit (already handled) or subpaths
    if (!id.startsWith('@solana/') || id === '@solana/kit') return null
    // Only handle bare imports like @solana/accounts, not @solana/accounts/something
    const parts = id.split('/')
    if (parts.length > 2) return null

    const resolved = resolveSolanaBrowser(id)
    if (resolved) return resolved
    return null
  },
}

const solanaKitBrowserPath = path.resolve(
  process.cwd(),
  'node_modules/@solana/kit/dist/index.browser.mjs',
)
const joseBrowserPath = path.resolve(
  process.cwd(),
  'node_modules/jose/dist/browser/index.js',
)
const qrcodeBrowserPath = path.resolve(
  process.cwd(),
  'node_modules/qrcode/lib/browser.js',
)
const convexReactPath = path.resolve(
  process.cwd(),
  'node_modules/convex/dist/esm/react/index.js',
)
const convexPath = path.resolve(
  process.cwd(),
  'node_modules/convex/dist/esm/index.js',
)

// Resolve @solana/* packages to their browser builds
const resolveSolanaBrowser = (pkg: string) => {
  const browserPath = path.resolve(
    process.cwd(),
    `node_modules/${pkg}/dist/index.browser.mjs`,
  )
  if (fs.existsSync(browserPath)) return browserPath
  const fallback = path.resolve(
    process.cwd(),
    `node_modules/${pkg}/dist/index.mjs`,
  )
  if (fs.existsSync(fallback)) return fallback
  return null
}

const resolveMissingJsxInDeps = {
  name: 'resolve-missing-jsx-in-deps',
  setup(build: any) {
    build.onResolve({ filter: /\.jsx$/ }, (args: any) => {
      if (!args.resolveDir) return null
      const resolved = path.resolve(args.resolveDir, args.path)
      const candidate = resolved.replace(/\.jsx$/, '.js')
      if (fs.existsSync(candidate)) {
        return { path: candidate }
      }
      return null
    })

    build.onResolve({ filter: /^@solana\/kit$/ }, () => {
      return { path: solanaKitBrowserPath }
    })

    build.onResolve({ filter: /^@solana\/.+$/ }, (args: any) => {
      const pkgName = args.path.replace('/', path.sep)
      const candidate = path.resolve(
        process.cwd(),
        'node_modules',
        pkgName,
        'dist/index.browser.mjs',
      )
      if (fs.existsSync(candidate)) {
        return { path: candidate }
      }
      return null
    })

    // Force convex to use ESM
    build.onResolve({ filter: /^convex\/react$/ }, () => {
      return { path: convexReactPath }
    })

    build.onResolve({ filter: /^convex$/ }, () => {
      return { path: convexPath }
    })
  },
}

const transformExpoAppleAuthJsx = {
  name: 'transform-expo-apple-auth-jsx',
  enforce: 'pre' as const,
  async transform(code: string, id: string) {
    if (
      !id.endsWith(
        'node_modules/expo-apple-authentication/build/AppleAuthenticationButton.js',
      )
    ) {
      return null
    }
    return transformWithEsbuild(code, id, { loader: 'jsx' })
  },
}

const transformQrCodeSvgJsx = {
  name: 'transform-qrcode-svg-jsx',
  enforce: 'pre' as const,
  async transform(code: string, id: string) {
    if (!id.includes('node_modules/react-native-qrcode-svg/')) {
      return null
    }
    return transformWithEsbuild(code, id, { loader: 'jsx' })
  },
}

const devHmrHost = process.env.DEV_HMR_HOST

export default {
  ssr: {
    external: ['@privy-io/react-auth'],
  },
  server: {
    host: true,
    ...(devHmrHost && {
      allowedHosts: [devHmrHost],
      hmr: {
        host: devHmrHost,
        protocol: 'wss',
        clientPort: 443,
      },
    }),
  },
  esbuild: {
    loader: 'jsx',
    include: [
      /node_modules\/expo-apple-authentication\/build\/.*\.js$/,
      /node_modules\/react-native-qrcode-svg\/.*\.js$/,
    ],
  },
  envPrefix: ['VITE_', 'EXPO_PUBLIC_', 'WEB_PUBLIC_'],
  resolve: {
    conditions: ['browser', 'module', 'import', 'default'],
    alias: [
      { find: /\/(require|import)$/, replacement: '' },
      { find: '@headlessui/react/import', replacement: '@headlessui/react' },
      { find: /^x402$/, replacement: 'x402/client' },
      { find: /^@solana\/kit$/, replacement: solanaKitBrowserPath },
      { find: /^jose$/, replacement: joseBrowserPath },
      { find: /^qrcode$/, replacement: qrcodeBrowserPath },
      { find: /^convex\/react$/, replacement: convexReactPath },
      { find: /^convex$/, replacement: convexPath },
    ],
  },
  optimizeDeps: {
    exclude: ['@solana/kit'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
      conditions: ['browser', 'module', 'import', 'default'],
      plugins: [resolveMissingJsxInDeps],
    },
  },
  plugins: [
    resolveExportsSuffixes,
    resolveMissingJsxToJs,
    resolveSolanaPackages,
    transformExpoAppleAuthJsx,
    transformQrCodeSvgJsx,
    one({
      web: {
        deploy: 'vercel',
        defaultRenderMode: 'spa',
      },

      native: {
        key: 'one-example',
      },
    }),

    tamaguiPlugin({
      optimize: true,
      components: ['tamagui'],
      config: './config/tamagui.config.ts',
      outputCSS: './src/styles/tamagui.css',
    }),
  ],
} satisfies UserConfig
