import { Avatar } from '@radix-ui/themes';
import { DbUser } from '../data/types';

export function UserAvatar({ user }: { user: DbUser | null | undefined }) {
  return (
    <Avatar
      highContrast={true}
      size="2"
      radius="full"
      color="gray"
      variant="soft"
      fallback={user?.handle[0] || ''}
    />
  );
}
