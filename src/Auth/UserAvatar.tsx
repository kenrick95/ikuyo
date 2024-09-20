import { Avatar } from '@radix-ui/themes';
import { DbUser } from '../data/types';

export function UserAvatar({ user }: { user: DbUser | null | undefined }) {
  return <Avatar radius="full" fallback={user?.handle[0] || ''} />;
}
