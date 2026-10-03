import {
  Badge,
  Button,
  Flex,
  Heading,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { LoadState } from './components';
import { type AdminUser, useAdminResource } from './data';
import styles from './PageAdmin.module.css';

export default function PageAdminUsers() {
  const query = new URLSearchParams(useSearch()).get('search') ?? '';
  const [search, setSearch] = useState(query);
  const [, navigate] = useLocation();
  const users = useAdminResource<AdminUser[]>(
    `/api/admin/users?search=${encodeURIComponent(query)}`,
  );
  return (
    <section className={styles.panel} aria-label="Find users">
      <Heading as="h1" size="6" mb="2">
        Users
      </Heading>
      <Text as="p" size="2" color="gray" mb="4">
        Find an account to inspect trips or manage access.
      </Text>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (search === query) users.reload();
          else navigate(`~/admin/users?search=${encodeURIComponent(search)}`);
        }}
      >
        <Flex gap="2">
          <TextField.Root
            className={styles.search}
            aria-label="Search users by handle or email"
            placeholder="Handle or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="submit">Search</Button>
        </Flex>
      </form>
      <Text as="p" size="1" color="gray" my="3">
        Up to 30 matches, including deleted accounts.
      </Text>
      <LoadState
        loading={users.loading}
        error={users.error}
        empty={users.data?.length === 0 ? 'No matching users.' : undefined}
      />
      {users.data?.map((user) => (
        <Link
          key={user.id}
          to={`~/admin/users/${encodeURIComponent(user.id)}`}
          className={styles.userRow}
        >
          <Flex justify="between" gap="2" align="center" wrap="wrap">
            <Text weight="medium">{user.handle}</Text>
            <Flex gap="2">
              {user.role === 'admin' ? <Badge>Admin</Badge> : null}
              {user.deletedAt ? <Badge color="red">Deleted</Badge> : null}
            </Flex>
          </Flex>
          <Text as="p" size="1" color="gray" className={styles.wrap}>
            {user.email ?? 'Guest account'}
          </Text>
        </Link>
      ))}
    </section>
  );
}
