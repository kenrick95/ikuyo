import { Box, Flex } from '@radix-ui/themes';
import { TripMap } from '../../Map/TripMap';
import { TripHeading } from './TripHeading';
import s from './TripHome.module.css';
import { TripHomeActivities } from './TripHomeActivities';
import { TripHomeComments } from './TripHomeComments';
import { TripHomeOnboarding } from './TripHomeOnboarding';
import { TripHomeTasks } from './TripHomeTasks';
import { TripStatistics } from './TripStatistics';

const containerPx = { initial: '1', md: '2' };
const containerPb = { initial: '9', sm: '5' };
const containerDirection = { initial: 'column' as const, sm: 'row' as const };
const containerWrap = { initial: 'wrap' as const, md: 'nowrap' as const };
const sideColumnMarginTop = { initial: '0', sm: '5' };
export function TripHome() {
  // For ongoing trips, prioritize activities and comments
  return (
    <Flex
      mt="4"
      gap="4"
      pb={containerPb}
      px={containerPx}
      justify="between"
      direction={containerDirection}
      wrap={containerWrap}
      className={s.container}
    >
      <Flex
        gap="2"
        direction="column"
        flexGrow="1"
        flexBasis="65%"
        className={s.mainColumn}
      >
        <TripHeading />
        <TripHomeOnboarding />
        <TripHomeActivities />
        <Box display={{ initial: 'none', sm: 'block' }} mt="2" height="100%">
          <TripMap useCase="home" />
        </Box>
      </Flex>
      <Flex
        gap="2"
        direction="column"
        flexGrow="1"
        flexBasis="20%"
        mt={sideColumnMarginTop}
        className={s.sideColumnFirst}
      >
        <TripHomeTasks />
        <TripHomeComments />
      </Flex>
      <Flex
        gap="2"
        direction="column"
        flexGrow="1"
        flexBasis="15%"
        mt={sideColumnMarginTop}
        className={s.sideColumnSecond}
      >
        <TripStatistics />
      </Flex>
    </Flex>
  );
}
