import { LockClosedIcon } from '@radix-ui/react-icons';
import { Flex, Spinner, Text } from '@radix-ui/themes';
import type { DbUser } from '../data/types';
import { canModifyTripContent } from '../Trip/permissions';
import { getSectionVisibility } from '../Trip/sectionVisibility';
import { useTrip, useTripCommentGroup } from '../Trip/store/hooks';
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
  const userCanComment = canModifyTripContent(trip);
  const sectionVisibility = trip ? getSectionVisibility(trip) : null;

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
      ) : sectionVisibility?.comments === false ? (
        <Flex align="center" justify="center" gap="2" py="2">
          <LockClosedIcon />
          <Text color="gray">Comments are hidden for this trip.</Text>
        </Flex>
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
