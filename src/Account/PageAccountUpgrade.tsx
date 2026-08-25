import { Box, Container, Grid, Heading } from '@radix-ui/themes';
import { useEffect } from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { useAuthUser, useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { pageTitle } from '../Nav/pageMeta';
import {
  RouteAccount,
  RouteAccountUpgrade,
  RouteTrips,
} from '../Routes/routes';
import { BackendAccountUpgrade } from './BackendAccountUpgrade';
import s from './PageAccountUpgrade.module.css';

export default PageAccountUpgrade;

export function PageAccountUpgrade(_props: RouteComponentProps) {
  const currentUser = useCurrentUser();
  const { authUser, authUserLoading } = useAuthUser();
  const [, setLocation] = useLocation();

  const isGuest = !currentUser?.email;

  // If user already has email, redirect to account page
  useEffect(() => {
    if (!authUserLoading && authUser && currentUser && !isGuest) {
      setLocation(RouteAccount.asRootRoute());
    }
  }, [authUserLoading, authUser, currentUser, isGuest, setLocation]);

  // If not logged in at all, redirect to trips (auth redirect will handle)
  useEffect(() => {
    if (!authUserLoading && !authUser) {
      setLocation(RouteTrips.asRootRoute());
    }
  }, [authUserLoading, authUser, setLocation]);

  return (
    <>
      <DocTitle title={pageTitle(RouteAccountUpgrade.routePath)} />
      <Navbar
        leftItems={[
          <Heading as="h1" key="title" size={{ initial: '3', xs: '5' }}>
            Upgrade Account
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu key="UserAvatarMenu" user={currentUser} />,
        ]}
      />
      <Container p="2" my="2">
        <Grid className={s.grid}>
          <Box maxWidth={CommonDialogMaxWidth} mx="2" px="2">
            <BackendAccountUpgrade />
          </Box>
        </Grid>
      </Container>
    </>
  );
}
