import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async (ctx) => ctx.db.query('matches').collect(),
});

export const create = mutation({
  args: {
    id: v.string(),
    teamId: v.string(),
    seasonId: v.string(),
    tournamentId: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    address: v.string(),
    isHome: v.boolean(),
    opponent: v.string(),
    status: v.string(),
    phase: v.string(),
    scoreHome: v.optional(v.number()),
    scoreAway: v.optional(v.number()),
    note: v.optional(v.string()),
    liveActive: v.boolean(),
    meetingAddress: v.optional(v.string()),
    meetingTime: v.optional(v.string()),
    meetingNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert('matches', args),
});

export const setLive = mutation({
  args: { matchId: v.string(), active: v.boolean() },
  handler: async (ctx, { matchId, active }) => {
    const doc = await ctx.db
      .query('matches')
      .withIndex('by_string_id', (q) => q.eq('id', matchId))
      .first();
    if (doc) await ctx.db.patch(doc._id, { liveActive: active });
  },
});

export const updateScore = mutation({
  args: {
    matchId: v.string(),
    scoreHome: v.number(),
    scoreAway: v.number(),
  },
  handler: async (ctx, { matchId, scoreHome, scoreAway }) => {
    const doc = await ctx.db
      .query('matches')
      .withIndex('by_string_id', (q) => q.eq('id', matchId))
      .first();
    if (doc) await ctx.db.patch(doc._id, { scoreHome, scoreAway });
  },
});
