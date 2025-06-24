import { Spinner, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import type { DbUser } from '../data/types';
import { useTrip, useTripCommentGroup } from '../Trip/store/hooks';
import { TripUserRole } from '../User/TripUserRole';
import { CommentForm } from './CommentForm';
import { CommentGroup } from './CommentGroup';
import { CommentMode } from './CommentMode';
import type { DbCommentGroupObjectType } from './db';

export function CommentGroupWithForm({
  user,
  commentGroupId,
  tripId,
  objectId,
  objectType,
  isLoading,
  error,
  onFormFocus,
}: {
  user?: DbUser;
  commentGroupId: undefined | string;

  tripId: string | undefined;
  objectId: string | undefined;
  objectType: DbCommentGroupObjectType;
  isLoading?: boolean;
  error?: { message: string };
  onFormFocus: () => void;
}) {
  const commentGroup = useTripCommentGroup(commentGroupId);
  const { trip } = useTrip(tripId);
  const userCanComment = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  return (
    <>
      {tripId && objectId && userCanComment ? (
        <CommentForm
          mode={CommentMode.Add}
          tripId={tripId}
          objectId={objectId}
          objectType={objectType}
          user={user}
          commentGroupId={commentGroup?.id}
          setCommentMode={() => {}}
          onFormFocus={onFormFocus}
        />
      ) : null}

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Text>Error loading comments: {error.message}</Text>
      ) : (
        <CommentGroup
          commentGroup={commentGroup}
          onFormFocus={onFormFocus}
          showCommentObjectTarget={false}
          showControls
        />
      )}
    </>
  );
}
