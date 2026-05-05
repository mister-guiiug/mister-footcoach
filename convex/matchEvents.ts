import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async (ctx) => ctx.db.query('matchEvents').collect(),
});

export const add = mutation({
  args: {
    id: v.string(),
    matchId: v.string(),
    type: v.string(),
    minute: v.optional(v.number()),
    playerId: v.optional(v.string()),
    player2Id: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert('matchEvents', args),
});
