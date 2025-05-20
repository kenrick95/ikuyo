import { Spinner, Text } from '@radix-ui/themes';
import type { DbUser } from '../data/types';
import { useTripCommentGroup } from '../Trip/store';
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
  commentGroupId?: string;

  tripId: string | undefined;
  objectId: string | undefined;
  objectType: DbCommentGroupObjectType;
  isLoading?: boolean;
  error?: { message: string };
  onFormFocus: () => void;
}) {
  const commentGroup = useTripCommentGroup(commentGroupId);

  return (
    <>
      {tripId && objectId ? (
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
