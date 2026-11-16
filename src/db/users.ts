import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const resolvedName =
      displayName && displayName.trim().length > 0
        ? displayName.trim()
        : email.split('@')[0] || 'Analyst';

    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: resolvedName,
        role: 'analyst',
        organisationScope: 'KINT Advisory',
        lastLoginAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: resolvedName,
          lastLoginAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to upsert user:', error);
    throw new Error('Database user synchronization failed.', { cause: error });
  }
}
