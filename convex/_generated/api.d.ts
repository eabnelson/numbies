/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as contacts from "../contacts.js";
import type * as faucet from "../faucet.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_verifyToken from "../lib/verifyToken.js";
import type * as migrations from "../migrations.js";
import type * as payments from "../payments.js";
import type * as requests from "../requests.js";
import type * as seed from "../seed.js";
import type * as tokens from "../tokens.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  contacts: typeof contacts;
  faucet: typeof faucet;
  "lib/auth": typeof lib_auth;
  "lib/verifyToken": typeof lib_verifyToken;
  migrations: typeof migrations;
  payments: typeof payments;
  requests: typeof requests;
  seed: typeof seed;
  tokens: typeof tokens;
  users: typeof users;
  utils: typeof utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
