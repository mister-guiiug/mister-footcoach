import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async ctx => ctx.db.query('trainings').collect(),
});

export const create = mutation({
  args: {
    id: v.string(),
    teamId: v.string(),
    date: v.string(),
    time: v.string(),
    duration: v.number(),
    type: v.string(),
    cancelled: v.boolean(),
    theme: v.optional(v.string()),
    note: v.optional(v.string()),
    seriesId: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert('trainings', args),
});

export const update = mutation({
  args: {
    id: v.string(),
    teamId: v.string(),
    date: v.string(),
    time: v.string(),
    duration: v.number(),
    type: v.string(),
    cancelled: v.boolean(),
    theme: v.optional(v.string()),
    note: v.optional(v.string()),
    seriesId: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const doc = await ctx.db
      .query('trainings')
      .withIndex('by_string_id', q => q.eq('id', id))
      .first();
    if (doc) await ctx.db.patch(doc._id, fields);
  },
});
