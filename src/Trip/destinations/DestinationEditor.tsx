import { Button, Card, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { CurrencySelect } from '../../common/CurrencySelect/CurrencySelect';
import { DateTimePicker } from '../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../common/DatePicker2/DateTimePickerMode';
import { TimeZoneSelect } from '../../common/TimeZoneSelect/TimeZoneSelect';
import { id } from '../../data/id';
import { getDefaultCurrencyForRegion } from '../../data/intl/currencies';
import { REGIONS_LIST } from '../../data/intl/regions';
import {
  ALL_TIMEZONES,
  getDefaultTimezoneForRegion,
} from '../../data/intl/timezones';
import {
  destinationStart,
  regionName,
  startCandidates,
  type TripDestination,
} from './destinations';

export type DestinationArrival = { id: string; label: string; instant: number };

export function DestinationEditor({
  destinations,
  onChange,
  onDraftChange,
  first,
  firstFields,
  arrivals = [],
  dayPlans = [],
  initialAdd = false,
}: {
  destinations: TripDestination[];
  onChange: (destinations: TripDestination[]) => void;
  onDraftChange?: (active: boolean) => void;
  firstFields?: ReactNode;
  first: { region: string; timeZone: string; currency: string; date?: string };
  arrivals?: DestinationArrival[];
  dayPlans?: { id: string; name: string; date: string }[];
  initialAdd?: boolean;
}) {
  const [draft, setDraftValue] = useState<TripDestination | undefined>(() =>
    initialAdd ? makeDraft() : undefined,
  );
  function setDraft(value: TripDestination | undefined) {
    setDraftValue(value);
    setZoneEdited(Boolean(value?.region));
    onDraftChange?.(value !== undefined);
  }
  const [zoneEdited, setZoneEdited] = useState(false);
  const [editFirst, setEditFirst] = useState(false);
  const [arrival, setArrival] = useState('');
  const prefix = useId();
  const draftId = draft?.id;
  useEffect(() => {
    if (draftId) document.getElementById(`${prefix}-region`)?.focus();
  }, [draftId, prefix]);
  function change(patch: Partial<TripDestination>) {
    setDraftValue(
      (current) => current && { ...current, startsAtMs: undefined, ...patch },
    );
  }
  const candidates = draft ? startCandidates(draft) : [];
  const sorted = [...destinations].sort(
    (a, b) => (destinationStart(a) ?? 0) - (destinationStart(b) ?? 0),
  );

  return (
    <Flex direction="column" gap="3">
      <Card size="1">
        <Flex direction="column" gap="2">
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text weight="medium">{regionName(first.region)}</Text>
              <Text size="2" color="gray">
                {first.date} · {first.timeZone} · {first.currency}
              </Text>
            </Flex>
            {firstFields ? (
              <Button
                type="button"
                variant="soft"
                size="2"
                aria-label={
                  editFirst
                    ? 'Close first destination details'
                    : 'Edit first destination'
                }
                aria-expanded={editFirst}
                onClick={() => setEditFirst(!editFirst)}
              >
                {editFirst ? 'Done' : 'Edit'}
              </Button>
            ) : null}
          </Flex>
          {editFirst ? firstFields : null}
        </Flex>
      </Card>
      {sorted.map((destination) => (
        <Card key={destination.id} size="1">
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text weight="medium">{destination.name}</Text>
              <Text size="2" color="gray">
                {Temporal.PlainDate.from(destination.startsOn).toLocaleString(
                  undefined,
                  { month: 'short', day: 'numeric' },
                )}
                {destination.startsAtTime ? ` ${destination.startsAtTime}` : ''}
                {' · '}
                {destination.timeZone}
                {' · '}
                {destination.currency}
              </Text>
            </Flex>
            <Button
              type="button"
              variant="soft"
              size="2"
              disabled={!!draft}
              aria-label={`Edit ${destination.name}`}
              onClick={() => {
                setDraft(destination);
                setArrival('');
              }}
            >
              Edit
            </Button>
          </Flex>
        </Card>
      ))}
      {draft ? (
        <Card size="2">
          <Flex direction="column" gap="3">
            <Flex asChild direction="column" gap="1">
              <label htmlFor={`${prefix}-region`}>
                <Text size="2" weight="medium">
                  Region
                </Text>
                <Select.Root
                  value={draft.region}
                  onValueChange={(region) => {
                    change({
                      region,
                      timeZone: getDefaultTimezoneForRegion(region) ?? 'UTC',
                      currency:
                        getDefaultCurrencyForRegion(region) ?? first.currency,
                      startOffset: null,
                    });
                    setArrival('');
                    setZoneEdited(false);
                  }}
                >
                  <Select.Trigger
                    id={`${prefix}-region`}
                    placeholder="Select a region…"
                  />
                  <Select.Content position="popper">
                    {REGIONS_LIST.map(([code, name]) => (
                      <Select.Item key={code} value={code}>
                        {name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
            </Flex>
            <Flex asChild direction="column" gap="1">
              <label htmlFor={`${prefix}-place`}>
                <Text size="2" weight="medium">
                  Place
                </Text>
                <TextField.Root
                  id={`${prefix}-place`}
                  value={draft.name}
                  maxLength={120}
                  placeholder={
                    draft.region ? regionName(draft.region) : 'City or region'
                  }
                  onChange={(event) =>
                    change({ name: event.currentTarget.value })
                  }
                  onBlur={() => {
                    if (zoneEdited) return;
                    const name = draft.name
                      .split(',')[0]
                      ?.trim()
                      .toLocaleLowerCase();
                    const zones = ALL_TIMEZONES.filter(
                      (zone) =>
                        zone
                          .split('/')
                          .at(-1)
                          ?.replaceAll('_', ' ')
                          .toLocaleLowerCase() === name,
                    );
                    if (zones.length === 1 && zones[0] !== draft.timeZone)
                      change({ timeZone: zones[0], startOffset: null });
                  }}
                />
              </label>
            </Flex>
            <Flex gap="3" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Starts on
                </Text>
                <DateTimePicker
                  name={`${prefix}-date`}
                  aria-label="Destination start date"
                  mode={DateTimePickerMode.Date}
                  value={
                    draft.startsOn
                      ? Temporal.PlainDate.from(draft.startsOn)
                      : undefined
                  }
                  onChange={(date) => {
                    change({
                      startsOn:
                        date instanceof Temporal.PlainDateTime
                          ? date.toPlainDate().toString()
                          : (date?.toString() ?? ''),
                      startOffset: null,
                    });
                    setArrival('');
                  }}
                  placeholder="Select date"
                />
              </Flex>
              <Flex asChild direction="column" gap="1">
                <label htmlFor={`${prefix}-time`}>
                  <Text size="2" weight="medium">
                    Time (optional)
                  </Text>
                  <TextField.Root
                    id={`${prefix}-time`}
                    type="time"
                    value={draft.startsAtTime ?? ''}
                    onChange={(event) => {
                      change({
                        startsAtTime: event.currentTarget.value || null,
                        startOffset: null,
                      });
                      setArrival('');
                    }}
                  />
                </label>
              </Flex>
            </Flex>
            {arrivals.length > 0 && draft.region ? (
              <Flex direction="column" gap="1">
                <Text
                  as="label"
                  htmlFor={`${prefix}-arrival`}
                  size="2"
                  weight="medium"
                >
                  Use arrival
                </Text>
                <Select.Root
                  value={arrival}
                  onValueChange={(value) => {
                    const selected = arrivals.find((item) => item.id === value);
                    if (!selected) return;
                    const local = Temporal.Instant.fromEpochMilliseconds(
                      selected.instant,
                    ).toZonedDateTimeISO(draft.timeZone);
                    setArrival(value);
                    change({
                      startsOn: local.toPlainDate().toString(),
                      startsAtTime: local
                        .toPlainTime()
                        .toString({ smallestUnit: 'minute' }),
                      startOffset: local.offset,
                    });
                  }}
                >
                  <Select.Trigger
                    id={`${prefix}-arrival`}
                    placeholder="Select arrival…"
                  />
                  <Select.Content position="popper">
                    {arrivals.map((item) => (
                      <Select.Item key={item.id} value={item.id}>
                        {item.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            ) : null}
            <Flex direction="column" gap="1">
              <Text
                as="label"
                htmlFor={`${prefix}-tz`}
                size="2"
                weight="medium"
              >
                Time zone
              </Text>
              <TimeZoneSelect
                name={`${prefix}-tz`}
                id={`${prefix}-tz`}
                isFormLoading={false}
                value={draft.timeZone}
                handleChange={(timeZone) => {
                  setZoneEdited(true);
                  change({ timeZone, startOffset: null });
                  setArrival('');
                }}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text
                as="label"
                htmlFor={`${prefix}-currency`}
                size="2"
                weight="medium"
              >
                Currency
              </Text>
              <CurrencySelect
                name={`${prefix}-currency`}
                id={`${prefix}-currency`}
                isFormLoading={false}
                value={draft.currency}
                handleChange={(currency) => change({ currency })}
              />
            </Flex>
            {candidates.length > 1 ? (
              <Flex direction="column" gap="1">
                <Text
                  as="label"
                  htmlFor={`${prefix}-offset`}
                  size="2"
                  weight="medium"
                >
                  UTC offset
                </Text>
                <Select.Root
                  value={draft.startOffset ?? ''}
                  onValueChange={(startOffset) => change({ startOffset })}
                >
                  <Select.Trigger
                    id={`${prefix}-offset`}
                    placeholder="Select an offset…"
                  />
                  <Select.Content>
                    {candidates.map((item) => (
                      <Select.Item key={item.offset} value={item.offset}>
                        UTC{item.offset}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            ) : null}
            {draft.startsOn && !candidates.length && (
              <Text size="2" color="red" role="alert">
                Choose a start that exists in this time zone.
              </Text>
            )}
            <Flex justify="between" gap="2" wrap="wrap">
              {destinations.some(
                (destination) => destination.id === draft.id,
              ) ? (
                <Button
                  type="button"
                  color="red"
                  variant="ghost"
                  onClick={() => {
                    onChange(
                      destinations.filter((item) => item.id !== draft.id),
                    );
                    setDraft(undefined);
                  }}
                >
                  Remove destination
                </Button>
              ) : (
                <span />
              )}
              <Flex gap="2">
                <Button
                  type="button"
                  variant="soft"
                  color="gray"
                  onClick={() => setDraft(undefined)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !draft.region ||
                    !draft.currency ||
                    destinationStart(draft) === undefined
                  }
                  onClick={() => {
                    const next = {
                      ...draft,
                      name: draft.name.trim() || regionName(draft.region),
                      startsAtMs: destinationStart(draft),
                    };
                    onChange([
                      ...destinations.filter((item) => item.id !== draft.id),
                      next,
                    ]);
                    setDraft(undefined);
                  }}
                >
                  Done
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      ) : (
        <Flex gap="3" align="center" wrap="wrap">
          <Button
            type="button"
            variant="soft"
            onClick={() => {
              setArrival('');
              setDraft(makeDraft());
            }}
          >
            Add destination
          </Button>
          {dayPlans.length ? (
            <Select.Root
              value=""
              onValueChange={(value) => {
                const plan = dayPlans.find((item) => item.id === value);
                if (plan) {
                  setArrival('');
                  setDraft({
                    ...makeDraft(),
                    name: plan.name,
                    startsOn: plan.date,
                  });
                }
              }}
            >
              <Select.Trigger
                aria-label="Add destination from Day plan"
                placeholder="From Day plan…"
              />
              <Select.Content position="popper">
                {dayPlans.map((plan) => (
                  <Select.Item key={plan.id} value={plan.id}>
                    {plan.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          ) : null}
        </Flex>
      )}
    </Flex>
  );
}

function makeDraft(): TripDestination {
  return {
    id: id(),
    name: '',
    region: '',
    timeZone: 'UTC',
    currency: '',
    startsOn: '',
    startsAtTime: null,
    startOffset: null,
  };
}
