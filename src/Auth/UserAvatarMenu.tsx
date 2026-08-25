import { Button, DropdownMenu } from '@radix-ui/themes';
import { Link, useLocation } from 'wouter';
import { UserHandle } from '../common/UserHandle/UserHandle';
import { postMutation } from '../data/apiClient';
import { useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import {
  RouteAccount,
  RouteAccountUpgrade,
  RouteLogin,
} from '../Routes/routes';

export function UserAvatarMenu({ user }: { user: DbUser | null | undefined }) {
  const [, setLocation] = useLocation();
  const subscribeUser = useBoundStore((state) => state.subscribeUser);
  const clearSession = useBoundStore((state) => state.clearSession);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="ghost">
          <UserHandle handle={user?.handle} size="2" mode="avatar-only" />
        </Button>
      </DropdownMenu.Trigger>

      {user ? (
        <DropdownMenu.Content>
          <DropdownMenu.Label>Account</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link to={RouteAccount.asRootRoute()}>Edit account</Link>
          </DropdownMenu.Item>
          {!user.email ? (
            <DropdownMenu.Item asChild>
              <Link to={RouteAccountUpgrade.asRootRoute()}>
                Upgrade account
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator />
          {/* Help */}
          <DropdownMenu.Label>Others</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <a
              href="https://blog.kenrick95.org/2025/06/ikuyo-plan-your-next-trip/#respond"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href="https://github.com/kenrick95/ikuyo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source Code (GitHub)
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={() => {
              if (!user) {
                setLocation(RouteLogin.asRootRoute());
                return;
              }
              void postMutation('/api/auth/logout', {}).then(() => {
                // Forget the user + all cached trip data so the next user on this
                // browser never sees the previous session's trips. subscribeUser()
                // then re-fetches the (now null) session into the cleared store.
                clearSession();
                subscribeUser();
                setLocation(RouteLogin.asRootRoute());
              });
            }}
          >
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      ) : (
        <DropdownMenu.Content>
          <DropdownMenu.Label>Account</DropdownMenu.Label>
          <DropdownMenu.Item
            onClick={() => {
              setLocation(RouteLogin.asRootRoute());
            }}
          >
            Log in
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {/* Help */}
          <DropdownMenu.Label>Others</DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <a
              href="https://blog.kenrick95.org/2025/06/ikuyo-plan-your-next-trip/#respond"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href="https://github.com/kenrick95/ikuyo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source Code (GitHub)
            </a>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      )}
    </DropdownMenu.Root>
  );
}
