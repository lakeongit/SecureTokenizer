
import { db } from './db';
import { tokens } from '@shared/schema';
import { and, between } from 'drizzle-orm';

async function purgeTokens() {
  try {
    const result = await db.delete(tokens)
      .where(between(tokens.id, 1, 205))
      .returning();
    
    console.log(`Successfully purged ${result.length} tokens`);
  } catch (error) {
    console.error('Failed to purge tokens:', error);
  } finally {
    process.exit(0);
  }
}

purgeTokens();
