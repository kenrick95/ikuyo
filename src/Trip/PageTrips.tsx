import { Link } from 'wouter';
import { db } from '../data/db';
import { ROUTES } from '../routes';
import { useAuthUser } from '../Auth/hooks';
import { Navbar } from '../Nav/Navbar';
import { Container, Heading } from '@radix-ui/themes';

export function PageTrips() {
  const { user } = useAuthUser();
  const { isLoading, data, error } = db.useQuery({
    trip: {
      $: {
        where: {
          'user.email': user?.email,
        },
      },
    },
  });

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
        {isLoading ? (
          'Loading'
        ) : error ? (
          `Error: ${error.message}`
        ) : (
          <ul>
            {data.trip.map((trip) => {
              return (
                <li key={trip.id}>
                  <Link to={ROUTES.Trip.replace(':id', trip.id)}>
                    {trip.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </>
  );
}
