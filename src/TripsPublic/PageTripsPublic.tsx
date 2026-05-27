import { Heading } from '@radix-ui/themes';
import type { RouteComponentProps } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
export default PageTripsPublic;

export function PageTripsPublic(_props: RouteComponentProps) {
  const currentUser = useCurrentUser();
  return (
    <>
      <DocTitle title={'Trips'} />
      <Navbar
        leftItems={[
          <Heading as="h2" size="5" key="trips">
            Public Trips Directory
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu user={currentUser} key="userAvatarMenu" />,
        ]}
      />
    </>
  );
}
