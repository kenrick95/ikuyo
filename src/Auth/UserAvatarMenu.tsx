import { Button, DropdownMenu } from '@radix-ui/themes';
import { db } from '../data/db';
import { useLocation } from 'wouter';
import { ROUTES } from '../routes';
import { UserAvatar } from './UserAvatar';
import { DbUser } from '../data/types';

export function UserAvatarMenu({ user }: { user: DbUser | null | undefined }) {
  const [, setLocation] = useLocation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="ghost">
          <UserAvatar user={user} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Account</DropdownMenu.Label>
        <DropdownMenu.Item
          onClick={() => {
            void db.auth.signOut().then(() => {
              setLocation(ROUTES.Login);
            });
          }}
        >
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
