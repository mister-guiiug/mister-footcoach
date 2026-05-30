import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async ctx => ctx.db.query('injuries').collect(),
});

export const add = mutation({
  args: {
    id: v.string(),
    playerId: v.string(),
    zone: v.string(),
    nature: v.string(),
    startDate: v.string(),
    estimatedReturnDate: v.optional(v.string()),
    actualReturnDate: v.optional(v.string()),
    status: v.string(),
    noteCoach: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert('injuries', args),
});
