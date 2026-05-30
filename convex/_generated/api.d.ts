/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attendances from '../attendances.js';
import type * as exercises from '../exercises.js';
import type * as injuries from '../injuries.js';
import type * as lineups from '../lineups.js';
import type * as matchEvents from '../matchEvents.js';
import type * as matches from '../matches.js';
import type * as players from '../players.js';
import type * as positionHistory from '../positionHistory.js';
import type * as seed from '../seed.js';
import type * as surveys from '../surveys.js';
import type * as teams from '../teams.js';
import type * as tournaments from '../tournaments.js';
import type * as trainings from '../trainings.js';
import type * as unavailabilities from '../unavailabilities.js';

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from 'convex/server';

declare const fullApi: ApiFromModules<{
  attendances: typeof attendances;
  exercises: typeof exercises;
  injuries: typeof injuries;
  lineups: typeof lineups;
  matchEvents: typeof matchEvents;
  matches: typeof matches;
  players: typeof players;
  positionHistory: typeof positionHistory;
  seed: typeof seed;
  surveys: typeof surveys;
  teams: typeof teams;
  tournaments: typeof tournaments;
  trainings: typeof trainings;
  unavailabilities: typeof unavailabilities;
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
  FunctionReference<any, 'public'>
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
  FunctionReference<any, 'internal'>
>;

export declare const components: {};
