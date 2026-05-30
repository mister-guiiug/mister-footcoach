import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

const slotSchema = v.object({
  position: v.string(),
  playerId: v.optional(v.string()),
  x: v.number(),
  y: v.number(),
});

export const getAll = query({
  handler: async ctx => ctx.db.query('lineups').collect(),
});

export const save = mutation({
  args: {
    id: v.string(),
    teamId: v.string(),
    matchId: v.optional(v.string()),
    name: v.string(),
    formation: v.string(),
    slots: v.array(slotSchema),
    substituteIds: v.array(v.string()),
    createdAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('lineups')
      .withIndex('by_string_id', q => q.eq('id', args.id))
      .first();
    if (existing) {
      // On retire `id` (clé applicative) du patch ; `_id` est intentionnellement inutilisé.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...fields } = args;
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('lineups', args);
    }
  },
});
