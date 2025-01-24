import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const Users = pgTable('users', {
  id: text('id').primaryKey().notNull(), //Clerk_ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  username: text('username').notNull(),
  email: text('email').notNull(),
});
