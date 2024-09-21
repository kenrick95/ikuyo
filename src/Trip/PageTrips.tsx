import { Link } from 'wouter';
import { db } from '../data/db';
import { ROUTES } from '../routes';
import { useAuthUser } from '../Auth/hooks';
import { Navbar } from '../Nav/Navbar';
import { Container, Heading } from '@radix-ui/themes';
import { UserAvatar } from '../Auth/UserAvatar';

export default PageTrips;
export function PageTrips() {
  const { user: authUser } = useAuthUser();
  const { isLoading, data, error } = db.useQuery({
    trip: {
      $: {
        where: {
          'user.email': authUser?.email,
        },
      },
    },
    user: {
      $: {
        where: {
          email: authUser?.email
        }
      }
    }
  });
  const user = data?.user[0];

  return (
    <>
      <Navbar
        leftItems={[
          <Heading as="h2" size="5">
            Trips
          </Heading>,
        ]}
        rightItems={[<UserAvatar user={user} />]}
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
