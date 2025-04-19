import { Button, DropdownMenu } from '@radix-ui/themes';
import { Link, useLocation } from 'wouter';
import { db } from '../data/db';
import type { DbUser } from '../data/types';
import { ROUTES, asRootRoute } from '../routes';
import { UserAvatar } from './UserAvatar';

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
        <DropdownMenu.Item asChild>
          <Link to={asRootRoute(ROUTES.Account)}>Edit account</Link>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          onClick={() => {
            void db.auth.signOut().then(() => {
              setLocation(asRootRoute(ROUTES.Login));
            });
          }}
        >
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
