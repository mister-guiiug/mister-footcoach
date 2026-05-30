import { query } from './_generated/server';

export const getAll = query({
  handler: async ctx => ctx.db.query('tournaments').collect(),
});
