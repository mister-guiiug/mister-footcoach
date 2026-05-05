import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async (ctx) => ctx.db.query('teams').collect(),
});

export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    category: v.string(),
    coachId: v.string(),
    seasonId: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert('teams', args),
});
