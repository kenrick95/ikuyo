import { Flex, Text } from '@radix-ui/themes';
import s from './PageTripNew.module.css';

export function WizardProgressDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <Flex direction="column" align="center" gap="2" mb="5">
      <Text size="1" color="gray">
        Step {step} of 3
      </Text>
      <div className={s.progressDots}>
        <div className={`${s.dot}${step >= 1 ? ` ${s.dotActive}` : ''}`} />
        <div className={`${s.dot}${step >= 2 ? ` ${s.dotActive}` : ''}`} />
        <div className={`${s.dot}${step >= 3 ? ` ${s.dotActive}` : ''}`} />
      </div>
    </Flex>
  );
}
