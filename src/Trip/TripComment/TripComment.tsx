import { Container, Flex, Heading, Text } from '@radix-ui/themes';
import { Comment } from '../../Comment/Comment';
import { useCurrentTrip, useTripAllComments } from '../store';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };

export function TripComment() {
  const trip = useCurrentTrip();
  const allComments = useTripAllComments(trip?.id);

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
