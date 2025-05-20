import { Container, Flex, Heading, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import { Comment } from '../../Comment/Comment';
import type { DbComment, DbCommentGroupObjectType } from '../../Comment/db';
import { useCurrentTrip } from '../store';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };

export function TripComment() {
  const trip = useCurrentTrip();
  const allComments = useMemo(() => {
    const comments: DbComment<DbCommentGroupObjectType>[] = [];
    trip.commentGroup?.forEach((commentGroup) => {
      comments.push(...commentGroup.comment);
    });
    // Sort comments by createdAt in descending order
    comments.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    return comments;
  }, [trip.commentGroup]);
  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <Heading as="h2" size="4" mb="2">
        All Comments
      </Heading>
      {allComments.length === 0 ? (
        <Text>No comments yet in this trip</Text>
      ) : (
        <Flex gap="2" direction="column">
          {allComments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onFormFocus={() => {}}
              showCommentObjectTarget
              showControls={false}
            />
          ))}
        </Flex>
      )}
    </Container>
  );
}
