import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async ctx => ctx.db.query('players').collect(),
});

export const create = mutation({
  args: {
    id: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    primaryTeamId: v.string(),
    secondaryTeamId: v.optional(v.string()),
    preferredPosition: v.string(),
    appetences: v.record(v.string(), v.number()),
    number: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => ctx.db.insert('players', args),
});

export const update = mutation({
  args: {
    id: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    primaryTeamId: v.string(),
    secondaryTeamId: v.optional(v.string()),
    preferredPosition: v.string(),
    appetences: v.record(v.string(), v.number()),
    number: v.optional(v.number()),
    active: v.boolean(),
  },
  handler: async (ctx, { id, ...fields }) => {
    const doc = await ctx.db
      .query('players')
      .withIndex('by_string_id', q => q.eq('id', id))
      .first();
    if (doc) await ctx.db.patch(doc._id, fields);
  },
});
