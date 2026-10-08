import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/platform/database/schema.ts',
  out: './src/platform/database/migrations',
  dbCredentials: { url: process.env.LEXCON_DATABASE_URL ?? './data/lexcon.sqlite' },
});
