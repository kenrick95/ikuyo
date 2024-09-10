import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import { DbTrip } from '../data/types';
import { TriggerNewActivity } from '../Event/Activity';
import s from './Navbar.module.css';

export function Navbar({ trip }: { trip: DbTrip }) {
  return (
    <Container className={s.container}>
      <Flex gap="3" align="center">
        <Box>
          <Heading as="h1" size="6">Ikuyo</Heading>
        </Box>
        <Box>
          <Heading as="h2" size="5">{trip.title}</Heading>
        </Box>
        <Box>
          <TriggerNewActivity trip={trip} />
        </Box>
      </Flex>
    </Container>
  );
}
