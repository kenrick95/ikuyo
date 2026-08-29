import { Select, Text } from '@radix-ui/themes';

export const planningStatuses = ['planned', 'tentative', 'confirmed'] as const;
export type PlanningStatus = (typeof planningStatuses)[number];

export const planningStatusLabel: Record<PlanningStatus, string> = {
  planned: 'Planned',
  tentative: 'Tentative',
  confirmed: 'Confirmed',
};

export function toPlanningStatus(
  value: string | null | undefined,
): PlanningStatus {
  return planningStatuses.includes(value as PlanningStatus)
    ? (value as PlanningStatus)
    : 'planned';
}

export function PlanningStatusSelect({
  id,
  value,
  onValueChange,
}: {
  id: string;
  value: PlanningStatus;
  onValueChange: (value: PlanningStatus) => void;
}) {
  return (
    <>
      <Text as="label" htmlFor={id}>
        Planning status{' '}
        <Text weight="light" size="1">
          (confidence, separate from whether it is an idea)
        </Text>
      </Text>
      <Select.Root
        name="planningStatus"
        value={value}
        onValueChange={(next) => onValueChange(next as PlanningStatus)}
      >
        <Select.Trigger id={id} />
        <Select.Content>
          {planningStatuses.map((status) => (
            <Select.Item key={status} value={status}>
              {planningStatusLabel[status]}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </>
  );
}
