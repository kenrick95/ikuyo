import { db } from '../data/db';

/**
 * Checks whether an email is already linked to a different user.
 * Returns `true` if the email is taken by another user, `false` otherwise.
 */
export async function isEmailTakenByOtherUser(
  email: string,
  currentUserId: string | undefined,
): Promise<boolean> {
  const { data } = await db.queryOnce({
    user: {
      $: {
        where: { email },
        limit: 1,
      },
    },
  });
  const existingUser = data?.user?.[0] as { id: string } | undefined;
  return !!existingUser && existingUser.id !== currentUserId;
}
