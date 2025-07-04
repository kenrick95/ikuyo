import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import clsx from 'clsx';
import type React from 'react';
import { Link } from 'wouter';
import imgUrl from '../logo/ikuyo.svg';
import { RouteTrips } from '../Routes/routes';
import s from './Navbar.module.css';

export function Navbar({
  leftItems,
  rightItems,
}: {
  leftItems: Array<React.ReactElement>;
  rightItems: Array<React.ReactElement>;
}) {
  return (
    <Container className={s.container}>
      <Flex gap="3" align="stretch" className={s.flexContainer}>
        <Box className={s.logoBox}>
          <Heading asChild as="h1" size="6">
            <Link to={RouteTrips.asRootRoute()}>
              <img src={imgUrl} className={s.logo} alt="Logo" />
              <span className={s.logoText}>
                Ikuyo<span className={s.logoTextExclamation}>!</span>
              </span>
            </Link>
          </Heading>
        </Box>
        {leftItems.map((item, index) => {
          return (
            <Box
              key={item.key}
              className={clsx(
                s.boxLeft,
                index === leftItems.length - 1 ? s.boxLeftLast : '',
              )}
            >
              {item}
            </Box>
          );
        })}
        {rightItems.map((item, index) => {
          return (
            <Box
              key={item.key}
              className={clsx(s.boxRight, index === 0 ? s.boxRightFirst : '')}
            >
              {item}
            </Box>
          );
        })}
      </Flex>
    </Container>
  );
}
