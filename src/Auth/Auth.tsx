import { Box, Grid, Spinner } from '@radix-ui/themes';
import { useEffect } from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { DocTitle } from '../Nav/DocTitle';
import { pageTitle } from '../Nav/pageMeta';
import { RouteLogin, RouteTrips } from '../Routes/routes';
import s from './Auth.module.css';
import { BackendLogin } from './BackendLogin';
import { useAuthUser, useCurrentUser } from './hooks';

export default PageLogin;

export function PageLogin(_props: RouteComponentProps) {
  const { authUser, authUserLoading } = useAuthUser();
  const currentUser = useCurrentUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (authUser && currentUser && !authUserLoading) {
      setLocation(RouteTrips.asRootRoute());
    }
  }, [authUser, currentUser, authUserLoading, setLocation]);

  return (
    <>
      <DocTitle title={pageTitle(RouteLogin.routePath)} />
      <Grid className={s.grid}>
        <Box maxWidth={CommonDialogMaxWidth} mx="2" px="2">
          {authUserLoading ? <Spinner m="3" /> : <BackendLogin />}
        </Box>
      </Grid>
    </>
  );
}
