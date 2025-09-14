import { Flex, Heading, Text } from '@radix-ui/themes';
import { Link } from 'wouter';
import { Comment } from '../../Comment/Comment';
import { RouteTripComment } from '../../Routes/routes';
import { useCurrentTrip, useTripAllCommentsWithLimit } from '../store/hooks';

export function TripHomeComments() {
  const { trip } = useCurrentTrip();
  const latestComments = useTripAllCommentsWithLimit(trip?.id, 5);
  return (
    <>
      <Heading as="h3" size="4">
        Latest Comments
      </Heading>
      <Flex gap="2" direction="column">
        {latestComments.length === 0 && <Text size="2">No comments yet</Text>}
        {latestComments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            onFormFocus={() => {}}
            showCommentObjectTarget
            showControls={false}
          />
        ))}
        {latestComments.length > 0 ? (
          <Text size="1" ml="7" mt="2">
            <Link to={RouteTripComment.asRouteTarget()}>See all comments</Link>
          </Text>
        ) : null}
      </Flex>
    </>
  );
}
