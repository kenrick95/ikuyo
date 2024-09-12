import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import { DbTrip } from '../data/types';
import { AddNewActivityButton } from '../Event/Activity';
import s from './Navbar.module.css';
import imgUrl from '/ikuyo.svg';

export function Navbar({ trip }: { trip: DbTrip }) {
  return (
    <Container className={s.container}>
      <Flex gap="3" align="center" className={s.flex}>
        <Box>
          <Heading as="h1" size="6">
            <img src={imgUrl} className={s.logo} />
            Ikuyo!
          </Heading>
        </Box>
        <Box>
          <Heading as="h2" size="5">
            {trip.title}
          </Heading>
        </Box>
        <Box className={s.flexAlignRight}>
          <AddNewActivityButton trip={trip} />
        </Box>
      </Flex>
    </Container>
  );
}
