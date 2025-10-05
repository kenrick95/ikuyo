import { Box } from '@radix-ui/themes';
import { TripMap } from '../Map/TripMap';
import { DocTitle } from '../Nav/DocTitle';
import s from './PageTripMap.module.css';
import { useCurrentTrip } from './store/hooks';

export function PageTripMap() {
  const { trip } = useCurrentTrip();
  return (
    <Box className={s.pageMapWrapper}>
      <DocTitle title={`${trip?.title ?? 'Trip'} - Map`} />
      <TripMap useCase="map" />
    </Box>
  );
}
