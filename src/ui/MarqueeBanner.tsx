// Shared types for MarqueeBanner
export type MarqueeBannerProps = {
  text: string
  textColor: string
}

// Re-export from native as default (bundler will use .web.tsx on web)
export { MarqueeBanner } from './MarqueeBanner.native'
