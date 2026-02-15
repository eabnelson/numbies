// deno-lint-ignore-file
/* eslint-disable */
// biome-ignore: needed import
import type { OneRouter } from 'one'

declare module 'one' {
  export namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/_sitemap` | `/privacy` | `/support` | `/terms`
      DynamicRoutes: `/user/${OneRouter.SingleRoutePart<T>}`
      DynamicRouteTemplate: `/user/[username]`
      IsTyped: true
      RouteTypes: {
        '/user/[username]': RouteInfo<{ username: string }>
      }
    }
  }
}

/**
 * Helper type for route information
 */
type RouteInfo<Params = Record<string, never>> = {
  Params: Params
  LoaderProps: { path: string; params: Params; request?: Request }
}