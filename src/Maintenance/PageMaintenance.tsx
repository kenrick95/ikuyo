import { Flex, Heading, Text } from '@radix-ui/themes';
import { readOnlyMode } from '../data/backendConfig';
import imgUrl from '../logo/ikuyo.svg';
import s from './PageMaintenance.module.css';

/**
 * Rendered in place of the whole app whenever `IKUYO_MAINTENANCE_MODE` is on.
 *
 * During an InstantDB → MySQL cutover this is the safe “everything is frozen”
 * state: normal routes, auth, and the router are bypassed entirely.
 *
 * browsing; the maintenance page is *not* shown — a small banner is (see
 * `App`). The two heading/body variants below exist so the full maintenance
 * gate can also describe a read-only freeze if an operator enables both flags.
 */
export default PageMaintenance;

export function PageMaintenance() {
  const readOnly = readOnlyMode;
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="6"
      className={s.container}
    >
      <img src={imgUrl} className={s.logo} alt="Ikuyo Logo" />
      <Heading size="9" weight="bold" className={s.logoText}>
        Ikuyo<span className={s.logoTextExclamation}>!</span>
      </Heading>
      <Heading size="6" align="center" className={s.heading}>
        {readOnly
          ? 'We will be back shortly'
          : 'We are currently undergoing maintenance'}
      </Heading>
      <Text size="3" align="center" className={s.body}>
        {readOnly
          ? 'Ikuyo is temporarily in read-only mode while we migrate data between systems. Your trips are safe — you can still view them, but edits are paused until we finish.'
          : 'We are making some improvements behind the scenes. Your trips are safe and will be waiting for you shortly. Please check back in a little while.'}
      </Text>
    </Flex>
  );
}
