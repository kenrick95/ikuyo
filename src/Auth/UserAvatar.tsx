import { Avatar } from '@radix-ui/themes';
import { memo } from 'react';

function UserAvatarInner({
  user,
}: {
  user: { id: string; handle: string } | null | undefined;
}) {
  return (
    <Avatar
      highContrast={true}
      size="2"
      radius="full"
      color="gray"
      variant="soft"
      fallback={user?.handle?.[0] || ''}
    />
  );
}
export const UserAvatar = memo(UserAvatarInner, (prevProps, nextProps) => {
  return (
    prevProps.user?.id === nextProps.user?.id &&
    prevProps.user?.handle === nextProps.user?.handle
  );
});
