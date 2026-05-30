import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async ctx => ctx.db.query('attendances').collect(),
});

export const set = mutation({
  args: {
    id: v.string(),
    sessionType: v.union(v.literal('match'), v.literal('training')),
    sessionId: v.string(),
    playerId: v.string(),
    status: v.string(),
    note: v.optional(v.string()),
    recordedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('attendances')
      .withIndex('by_session', q =>
        q.eq('sessionType', args.sessionType).eq('sessionId', args.sessionId)
      )
      .filter(q => q.eq(q.field('playerId'), args.playerId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        note: args.note,
        recordedBy: args.recordedBy,
      });
    } else {
      await ctx.db.insert('attendances', args);
    }
  },
});
