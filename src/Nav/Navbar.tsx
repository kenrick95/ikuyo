import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import s from './Navbar.module.css';
import imgUrl from '/ikuyo.svg';
import React from 'react';
import clsx from 'clsx';

export function Navbar({
  leftItems,
  rightItems,
}: {
  leftItems: Array<React.ReactNode>;
  rightItems: Array<React.ReactNode>;
}) {
  return (
    <Container className={s.container}>
      <Flex gap="3" align="center" className={s.flex}>
        <Box>
          <Heading as="h1" size="6">
            <img src={imgUrl} className={s.logo} />
            Ikuyo!
          </Heading>
        </Box>
        {leftItems.map((item, index) => {
          return <Box key={index}>{item}</Box>;
        })}
        {rightItems.map((item, index) => {
          return (
            <Box
              key={index}
              className={clsx(index === 0 ? s.flexAlignRight : '')}
            >
              {item}
            </Box>
          );
        })}
      </Flex>
    </Container>
  );
}
