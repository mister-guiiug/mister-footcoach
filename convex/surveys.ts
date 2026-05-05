import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAll = query({
  handler: async (ctx) => ctx.db.query('surveys').collect(),
});

export const getAllResponses = query({
  handler: async (ctx) => ctx.db.query('surveyResponses').collect(),
});

export const addResponse = mutation({
  args: {
    id: v.string(),
    surveyId: v.string(),
    playerId: v.string(),
    intentionJoueur: v.optional(v.string()),
    dateIntentionJoueur: v.optional(v.string()),
    confirmationParent: v.optional(v.string()),
    dateConfirmationParent: v.optional(v.string()),
    parentUserId: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert('surveyResponses', args),
});

export const updateResponse = mutation({
  args: {
    id: v.string(),
    intentionJoueur: v.optional(v.string()),
    dateIntentionJoueur: v.optional(v.string()),
    confirmationParent: v.optional(v.string()),
    dateConfirmationParent: v.optional(v.string()),
    parentUserId: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const doc = await ctx.db
      .query('surveyResponses')
      .filter((q) => q.eq(q.field('id'), id))
      .first();
    if (doc) await ctx.db.patch(doc._id, fields);
  },
});
