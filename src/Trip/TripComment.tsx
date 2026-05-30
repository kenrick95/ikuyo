import { LockClosedIcon } from '@radix-ui/react-icons';
import { Container, Flex, Heading, Text } from '@radix-ui/themes';
import { Comment } from '../Comment/Comment';
import { DocTitle } from '../Nav/DocTitle';
import { getSectionVisibility } from './sectionVisibility';
import { useCurrentTrip, useTripAllComments } from './store/hooks';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };

export function TripComment() {
  const { trip } = useCurrentTrip();
  const allComments = useTripAllComments(trip?.id);
  const sectionVisibility = trip ? getSectionVisibility(trip) : null;

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <DocTitle title={`${trip?.title ?? 'Trip'} - Comments`} />
      <Heading as="h2" size="4" mb="2">
        All Comments
      </Heading>
      {sectionVisibility?.comments === false ? (
        <Flex align="center" justify="center" gap="2" py="9">
          <LockClosedIcon />
          <Text color="gray">Comments are hidden for this trip.</Text>
        </Flex>
      ) : allComments.length === 0 ? (
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
