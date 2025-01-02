import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import s from './Navbar.module.css';
import imgUrl from '/ikuyo.svg';
import React from 'react';
import clsx from 'clsx';
import { Link } from 'wouter';
import { ROUTES } from '../routes';

export function Navbar({
  leftItems,
  rightItems,
}: {
  leftItems: Array<React.ReactNode>;
  rightItems: Array<React.ReactNode>;
}) {
  return (
    <Container className={s.container}>
      <Flex gap="3" align="center" className={s.flexContainer}>
        <Box className={s.logoBox}>
          <Heading asChild as="h1" size="6">
            <Link to={`~${ROUTES.Trips}`}>
              <img src={imgUrl} className={s.logo} />
              <span className={s.logoText}>Ikuyo!</span>
            </Link>
          </Heading>
        </Box>
        {leftItems.map((item, index) => {
          return (
            <Box
              key={index}
              className={clsx(
                index === leftItems.length - 1 ? s.boxLeftLast : ''
              )}
            >
              {item}
            </Box>
          );
        })}
        {rightItems.map((item, index) => {
          return (
            <Box
              key={index}
              className={clsx(index === 0 ? s.boxRightFirst : '')}
            >
              {item}
            </Box>
          );
        })}
      </Flex>
    </Container>
  );
}
