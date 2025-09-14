import { Flex } from '@radix-ui/themes';
import { TripHeading } from './TripHeading';
import { TripHomeActivities } from './TripHomeActivities';
import { TripHomeComments } from './TripHomeComments';
import { TripHomeTasks } from './TripHomeTasks';
import { TripStatistics } from './TripStatistics';
import { TripToday } from './TripToday';

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
    >
      <Flex
        gap="2"
        direction="column"
        flexGrow="1"
        flexBasis="20%"
        mt={sideColumnMarginTop}
      >
        <TripHomeTasks />
        <TripHomeComments />
      </Flex>
      <Flex gap="2" direction="column" flexGrow="1" flexBasis="65%">
        <TripHeading />
        <TripToday />
        <TripHomeActivities />
      </Flex>
      <Flex
        gap="2"
        direction="column"
        flexGrow="1"
        flexBasis="15%"
        mt={sideColumnMarginTop}
      >
        <TripStatistics />
      </Flex>
    </Flex>
  );
}
