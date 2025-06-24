import { Box } from '@radix-ui/themes';
import { TripMap } from '../Map/TripMap';
import s from './PageTripMap.module.css';

export function PageTripMap() {
  return (
    <Box className={s.pageMapWrapper}>
      <TripMap useCase="map" />
    </Box>
  );
}
