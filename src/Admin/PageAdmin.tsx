import {
  Button,
  Callout,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { lazy, Suspense } from 'react';
import { Link, Redirect, Route, Switch, useLocation, useSearch } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';

const PageAdminActivity = lazy(() => import('./PageAdminActivity'));
const PageAdminTrip = lazy(() => import('./PageAdminTrip'));
const PageAdminUser = lazy(() => import('./PageAdminUser'));
const PageAdminUsers = lazy(() => import('./PageAdminUsers'));

export default function PageAdmin() {
  const currentUser = useCurrentUser();
  const [location] = useLocation();
  const search = useSearch();
  const activity = location === '/activity' || location.endsWith('/activity');
  return (
    <>
      <DocTitle title="Admin" />
      <Navbar
        leftItems={[
          <Heading key="admin" size="5">
            Admin
          </Heading>,
        ]}
        rightItems={[<UserAvatarMenu key="account" user={currentUser} />]}
      />
      <Container my="4" px="3">
        {currentUser?.role !== 'admin' ? (
          <Text>Administrator access is required.</Text>
        ) : (
          <Flex direction="column" gap="4">
            <nav aria-label="Admin navigation">
              <Flex gap="2">
                <Button asChild variant={activity ? 'outline' : 'solid'}>
                  <Link
                    to="~/admin/users"
                    aria-current={!activity ? 'page' : undefined}
                  >
                    Users
                  </Link>
                </Button>
                <Button asChild variant={activity ? 'solid' : 'outline'}>
                  <Link
                    to="~/admin/activity"
                    aria-current={activity ? 'page' : undefined}
                  >
                    Audit history
                  </Link>
                </Button>
              </Flex>
            </nav>
            <Callout.Root color="amber" size="1">
              <Callout.Text>
                Access to other users' trips is audited. Deleted accounts and
                content remain recoverable.
              </Callout.Text>
            </Callout.Root>
            <Suspense
              key={`${location}?${search}`}
              fallback={
                <Flex gap="2" align="center" role="status">
                  <Spinner />
                  <Text size="2">Loading page…</Text>
                </Flex>
              }
            >
              <Switch>
                <Route path="/">
                  <Redirect to="~/admin/users" replace />
                </Route>
                <Route path="/users">
                  <PageAdminUsers />
                </Route>
                <Route path="/users/:id">
                  {({ id }) => <PageAdminUser id={id} />}
                </Route>
                <Route path="/trips/:id/activity">
                  {({ id }) => <PageAdminActivity tripId={id} />}
                </Route>
                <Route path="/trips/:id">
                  {({ id }) => <PageAdminTrip id={id} />}
                </Route>
                <Route path="/activity">
                  <PageAdminActivity />
                </Route>
                <Route>
                  <Heading size="4">Admin page not found</Heading>
                  <Link to="~/admin/users">Go to users</Link>
                </Route>
              </Switch>
            </Suspense>
          </Flex>
        )}
      </Container>
    </>
  );
}
