import { Link } from 'wouter';
import { db } from '../data/db';
import { ROUTES } from '../routes';
import { useAuthUser } from '../Auth/hooks';
import { useEffect } from 'react';
import { useBoundStore } from '../data/store';
import { Navbar } from '../Nav/Navbar';
import { Container, Heading } from '@radix-ui/themes';

export function PageTrips() {
  const { user } = useAuthUser();
  const addUser = useBoundStore((state) => state.addUser);
  const trips = useBoundStore((state) => state.trips);
  console.log('user', user);

  const { data } = db.useQuery({
    user: {
      $: {
        where: {
          email: user?.email,
        },
      },
      trip: {
        activity: {},
      },
    },
  });

  useEffect(() => {
    if (data?.user[0]) {
      addUser(data?.user[0]);
    }
  }, [data, addUser]);
  return (
    <>
      <Navbar
        leftItems={[
          <Heading as="h2" size="5">
            Trips
          </Heading>,
        ]}
        rightItems={[<>{user ? `Signed in as ${user.email}` : ''}</>]}
      />

      <Container>
        <ul>
          {trips.map((trip) => {
            return (
              <li key={trip.id}>
                <Link to={ROUTES.Trip.replace(':id', trip.id)}>{trip.title}</Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}
