import { Container, Heading } from '@radix-ui/themes';
import { Navbar } from '../Nav/Navbar';
import { db } from '../data/db';
import { useAuthUser } from '../Auth/hooks';
import { DbUser } from '../data/types';

import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { DocTitle } from '../Nav/DocTitle';
import { RouteComponentProps } from 'wouter';

export default PageAccount;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PageAccount(_props: RouteComponentProps) {
  const { user: authUser } = useAuthUser();

  const { data } = db.useQuery({
    user: {
      $: { where: { email: authUser?.email ?? '' } },
    },
  });
  const user = data?.user[0] as DbUser | undefined;

  return (
    <>
      <DocTitle title={'Account'} />
      <Navbar
        leftItems={[
          <Heading as="h1" size={{ initial: '3', xs: '5' }}>
            {'Account'}
          </Heading>,
        ]}
        rightItems={[<UserAvatarMenu user={user} />]}
      />
      <Container>Under construction</Container>
    </>
  );
}
