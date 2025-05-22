import { Flex } from '@radix-ui/themes';
import { useTripComments } from '../Trip/hooks';
import type { TripSliceCommentGroup } from '../Trip/store';
import { Comment } from './Comment';

export function CommentGroup({
  commentGroup,
  onFormFocus,
  showCommentObjectTarget,
  showControls,
}: {
  commentGroup: undefined | TripSliceCommentGroup;
  onFormFocus: () => void;
  showCommentObjectTarget: boolean;
  showControls: boolean;
}) {
  const comments = useTripComments(commentGroup?.commentIds ?? []);

  return (
    <Flex direction="column" gap="3">
      {comments.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          onFormFocus={onFormFocus}
          showCommentObjectTarget={showCommentObjectTarget}
          showControls={showControls}
        />
      ))}
    </Flex>
  );
}
