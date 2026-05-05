import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async (ctx) => ctx.db.query('unavailabilities').collect(),
});

export const add = mutation({
  args: {
    id: v.string(),
    playerId: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    motif: v.string(),
    declaredBy: v.string(),
    note: v.optional(v.string()),
    injuryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert('unavailabilities', args),
});
