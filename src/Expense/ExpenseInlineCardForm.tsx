import { MagicWandIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Flex,
  Select,
  Text,
  TextField,
  Tooltip,
} from '@radix-ui/themes';
import type * as React from 'react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
// import { TimeZoneSelect } from '../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../common/ui';
import { id as newExpenseId } from '../data/id';
import { ALL_CURRENCIES } from '../data/intl/currencies';
import { useBoundStore } from '../data/store';
import type { TripSliceExpense, TripSliceTrip } from '../Trip/store/types';
import { formatCurrencyAmount } from './currency';
import { dbAddExpense, dbUpdateExpense } from './db';
import s from './ExpenseCard.module.css';
import { ExpenseMode } from './ExpenseMode';
import { ExpenseSplitFields } from './ExpenseSplitFields';
import { type ExpenseLedger, previewSplit, toMinor } from './ledger';

export function ExpenseInlineCardForm({
  trip,
  expense,
  expenseMode,
  refundOf,
  setExpenseMode,
}: {
  trip: TripSliceTrip;
  expense: TripSliceExpense | undefined;
  expenseMode: ExpenseMode;
  refundOf?: TripSliceExpense;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  const tripLocalState = useBoundStore((state) =>
    state.getTripLocalState(trip.id),
  );
  const setTripLocalState = useBoundStore((state) => state.setTripLocalState);

  const dateTimeIncurred: Temporal.PlainDate = useMemo(
    () =>
      Temporal.Instant.fromEpochMilliseconds(
        expenseMode === ExpenseMode.Edit && expense
          ? expense.timestampIncurred
          : tripLocalState?.expenseTimestampIncurred != null
            ? tripLocalState?.expenseTimestampIncurred
            : trip.timestampStart,
      )
        .toZonedDateTimeISO(trip.timeZone)
        .toPlainDate(),
    [
      trip.timestampStart,
      trip.timeZone,
      tripLocalState?.expenseTimestampIncurred,
      expense,
      expenseMode,
    ],
  );
  const publishToast = useBoundStore((state) => state.publishToast);
  const idForm = useId();
  const [formState, setFormState] = useState(
    expenseMode === ExpenseMode.Edit && expense
      ? {
          loading: false,
          dateTimeIncurred,
          title: expense.title,
          description: expense.description,
          currency: expense.currency,
          amount: formatCurrencyAmount(undefined, expense.amount, false),
          currencyConversionFactor:
            expense.currencyConversionFactor != null
              ? formatCurrencyAmount(
                  undefined,
                  expense.currencyConversionFactor,
                  false,
                )
              : '',
          amountInOriginCurrency:
            expense.amountInOriginCurrency != null
              ? formatCurrencyAmount(
                  undefined,
                  expense.amountInOriginCurrency,
                  false,
                )
              : '',

          amountAbleToBeCalculated:
            expense.amountInOriginCurrency != null &&
            expense.currencyConversionFactor != null,
          currencyConversionFactorAbleToBeCalculated:
            expense.amount != null && expense.amountInOriginCurrency != null,
          amountInOriginCurrencyAbleToBeCalculated:
            expense.amount != null && expense.currencyConversionFactor != null,
        }
      : {
          loading: false,
          dateTimeIncurred,
          title: '',
          description: '',
          currency:
            tripLocalState?.expenseCurrency != null
              ? tripLocalState?.expenseCurrency
              : trip.currency,
          amount: '',
          currencyConversionFactor:
            tripLocalState?.expenseCurrencyConversionFactor != null
              ? formatCurrencyAmount(
                  undefined,
                  tripLocalState?.expenseCurrencyConversionFactor,
                  false,
                )
              : '',
          amountInOriginCurrency: '',

          amountAbleToBeCalculated: false,
          currencyConversionFactorAbleToBeCalculated: false,
          amountInOriginCurrencyAbleToBeCalculated: false,
          ...(refundOf
            ? {
                title: `Refund: ${refundOf.title}`,
                currency: refundOf.currency,
                amount: String(refundOf.amount),
                currencyConversionFactor: '',
                amountInOriginCurrency: '',
              }
            : {}),
        },
  );
  const [errorMessage, setErrorMessage] = useState('');
  const currentUser = useBoundStore((state) => state.currentUser);
  const selfId =
    trip.expenseLedger?.participants.find((p) => p.userId === currentUser?.id)
      ?.id ?? 'me';
  const [ledger, setLedger] = useState<ExpenseLedger>(
    refundOf?.ledger
      ? { ...refundOf.ledger, kind: 'refund', refundOf: refundOf.id }
      : (expense?.ledger ?? { paidBy: selfId, method: null, shares: [] }),
  );
  const [expectedRevision] = useState(expense?.ledgerRevision);
  const [payerEdited, setPayerEdited] = useState(false);
  const submitting = useRef(false);
  const [creationId, setCreationId] = useState(() => newExpenseId());
  useEffect(() => {
    if (selfId === 'me') return;
    setLedger((previous) => ({
      ...previous,
      paidBy: previous.paidBy === 'me' ? selfId : previous.paidBy,
      shares: previous.shares.map((r) =>
        r.participantId === 'me' ? { ...r, participantId: selfId } : r,
      ),
      contributions: previous.contributions?.map((r) =>
        r.participantId === 'me' ? { ...r, participantId: selfId } : r,
      ),
    }));
  }, [selfId]);
  const [timeZoneIncurred] = useState<string>(
    expenseMode === ExpenseMode.Edit && expense && expense.timeZoneIncurred
      ? expense.timeZoneIncurred
      : trip.timeZone,
  );

  const resetFormState = useCallback(() => {
    setFormState((prevValue) => ({
      loading: false,
      dateTimeIncurred: prevValue.dateTimeIncurred,
      title: '',
      description: '',
      currency: prevValue.currency,
      amount: '',
      currencyConversionFactor: prevValue.currencyConversionFactor,
      amountInOriginCurrency: '',
      amountAbleToBeCalculated: false,
      currencyConversionFactorAbleToBeCalculated: false,
      amountInOriginCurrencyAbleToBeCalculated: false,
    }));
  }, []);

  const deriveNewState = useCallback((prevState: typeof formState) => {
    const newState = { ...prevState } satisfies typeof prevState;

    const amountFloat = Number.parseFloat(newState.amount);
    const currencyConversionFactorFloat = Number.parseFloat(
      newState.currencyConversionFactor,
    );
    const amountInOriginCurrencyFloat = Number.parseFloat(
      newState.amountInOriginCurrency,
    );

    if (
      newState.amount != null &&
      !Number.isNaN(amountFloat) &&
      newState.amountInOriginCurrency != null &&
      !Number.isNaN(amountInOriginCurrencyFloat)
    ) {
      newState.currencyConversionFactorAbleToBeCalculated = true;
    } else {
      newState.currencyConversionFactorAbleToBeCalculated = false;
    }

    if (
      newState.amount != null &&
      !Number.isNaN(amountFloat) &&
      newState.currencyConversionFactor != null &&
      !Number.isNaN(currencyConversionFactorFloat)
    ) {
      newState.amountInOriginCurrencyAbleToBeCalculated = true;
    } else {
      newState.amountInOriginCurrencyAbleToBeCalculated = false;
    }

    if (
      newState.amountInOriginCurrency != null &&
      !Number.isNaN(amountInOriginCurrencyFloat) &&
      newState.currencyConversionFactor != null &&
      !Number.isNaN(currencyConversionFactorFloat)
    ) {
      newState.amountAbleToBeCalculated = true;
    } else {
      newState.amountAbleToBeCalculated = false;
    }
    return newState;
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState((prevState) => {
        const newState = {
          ...prevState,
          [name]: value,
        } satisfies typeof prevState;

        return deriveNewState(newState);
      });
    },
    [deriveNewState],
  );

  // TODO: implement later
  // const handleTimeZoneChange = useCallback((newTimeZone: string) => {
  //   setTimeZoneIncurred(newTimeZone);
  // }, []);

  const handleForm = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting.current) return;
    setErrorMessage('');
    try {
      const { dateTimeIncurred, title, description, currency, amount } =
        formState;
      const amountFloat = Number(amount);
      if (
        !dateTimeIncurred ||
        !title.trim() ||
        !currency ||
        !Number.isFinite(amountFloat) ||
        amountFloat <= 0
      )
        throw new Error('Enter a title, date and positive amount.');
      const includeLedger =
        !expense || !!expense.ledger || ledger.method !== null || payerEdited;
      if (includeLedger) previewSplit(amount, currency, ledger);
      if (includeLedger && ledger.paidBy === 'multiple') {
        const contributions = ledger.contributions ?? [];
        if (
          !contributions.length ||
          contributions.some((row) => !/^\d+$/.test(row.amountMinor))
        )
          throw new Error('Enter valid payer amounts.');
        if (
          contributions.reduce(
            (sum, row) => sum + BigInt(row.amountMinor),
            0n,
          ) !== BigInt(toMinor(amount, currency))
        )
          throw new Error('Payer amounts must match the expense total.');
      }
      const sameCurrency = currency === trip.originCurrency;
      const factor = sameCurrency
        ? 1
        : formState.currencyConversionFactor.trim()
          ? Number(formState.currencyConversionFactor)
          : undefined;
      const origin = sameCurrency
        ? amountFloat
        : formState.amountInOriginCurrency.trim()
          ? Number(formState.amountInOriginCurrency)
          : undefined;
      if (
        (factor === undefined) !== (origin === undefined) ||
        (factor !== undefined && (!Number.isFinite(factor) || factor <= 0)) ||
        (origin !== undefined && (!Number.isFinite(origin) || origin <= 0))
      )
        throw new Error('Enter both conversion values, or leave both empty.');
      submitting.current = true;
      setFormState((previous) => ({ ...previous, loading: true }));
      const data = {
        title,
        description: description || '',
        currency,
        amount: amountFloat,
        currencyConversionFactor: factor,
        amountInOriginCurrency: origin,
        timestampIncurred:
          dateTimeIncurred.toZonedDateTime(timeZoneIncurred).epochMilliseconds,
        timeZoneIncurred,
        ...(includeLedger ? { ledger } : {}),
      };
      if (expenseMode === ExpenseMode.Edit && expense) {
        await dbUpdateExpense({
          ...data,
          id: expense.id,
          ledgerRevision: expectedRevision,
        });
      } else {
        await dbAddExpense(data, { tripId: trip.id, expenseId: creationId });
      }
      setTripLocalState(trip.id, {
        expenseCurrency: currency,
        expenseCurrencyConversionFactor: factor,
        expenseTimestampIncurred: data.timestampIncurred,
      });
      publishToast({
        root: {},
        title: {
          children: `${expense ? 'Updated' : 'Added'} expense: ${title}`,
        },
        close: {},
      });
      setCreationId(newExpenseId());
      setExpenseMode(ExpenseMode.View);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save expense.',
      );
    } finally {
      submitting.current = false;
      setFormState((previous) => ({ ...previous, loading: false }));
    }
  };
  const handleCurrencyChange = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      currency: value,
      currencyConversionFactor: '',
      amountInOriginCurrency: '',
    }));
  }, []);

  const refTimestampIncurred = useRef<HTMLButtonElement>(null);
  const refTitle = useRef<HTMLInputElement>(null);

  const handleTimestampIncurredChange = useCallback(
    (value: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      if (value) {
        setFormState((prev) => ({
          ...prev,
          dateTimeIncurred:
            value instanceof Temporal.PlainDateTime
              ? value.toPlainDate()
              : value,
        }));
      }
    },
    [],
  );

  const calculateAmount = useCallback(() => {
    const currencyConversionFactorFloat = Number.parseFloat(
      formState.currencyConversionFactor,
    );
    const amountInOriginCurrencyFloat = Number.parseFloat(
      formState.amountInOriginCurrency,
    );
    setFormState((prev) =>
      deriveNewState({
        ...prev,
        amount: formatCurrencyAmount(
          undefined,
          amountInOriginCurrencyFloat * currencyConversionFactorFloat,
          false,
        ),
      }),
    );
  }, [
    formState.currencyConversionFactor,
    formState.amountInOriginCurrency,
    deriveNewState,
  ]);

  const handleFocusAmount = useCallback(() => {
    // If the other two values are available & this is empty, then calculate it
    if (
      !formState.amount &&
      formState.currencyConversionFactor &&
      formState.amountInOriginCurrency
    ) {
      calculateAmount();
    }
  }, [
    formState.amount,
    formState.amountInOriginCurrency,
    formState.currencyConversionFactor,
    calculateAmount,
  ]);

  const calculateCurrencyConversionFactor = useCallback(() => {
    const amountFloat = Number.parseFloat(formState.amount);
    const amountInOriginCurrencyFloat = Number.parseFloat(
      formState.amountInOriginCurrency,
    );
    setFormState((prev) =>
      deriveNewState({
        ...prev,
        currencyConversionFactor: formatCurrencyAmount(
          undefined,
          amountFloat / amountInOriginCurrencyFloat,
          false,
        ),
      }),
    );
  }, [formState.amount, formState.amountInOriginCurrency, deriveNewState]);

  const handleFocusCurrencyConversionFactor = useCallback(() => {
    // If the other two values are available & this is empty, then calculate it
    if (
      formState.amount &&
      !formState.currencyConversionFactor &&
      formState.amountInOriginCurrency
    ) {
      calculateCurrencyConversionFactor();
    }
  }, [
    formState.amount,
    formState.amountInOriginCurrency,
    formState.currencyConversionFactor,
    calculateCurrencyConversionFactor,
  ]);

  const calculateAmountInOriginCurrency = useCallback(() => {
    const amountFloat = Number.parseFloat(formState.amount);
    const currencyConversionFactorFloat = Number.parseFloat(
      formState.currencyConversionFactor,
    );
    setFormState((prev) =>
      deriveNewState({
        ...prev,
        amountInOriginCurrency: formatCurrencyAmount(
          undefined,
          amountFloat / currencyConversionFactorFloat,
          false,
        ),
      }),
    );
  }, [formState.amount, formState.currencyConversionFactor, deriveNewState]);

  const handleFocusAmountInOriginCurrency = useCallback(() => {
    // If the other two values are available & this is empty, then calculate it
    if (
      formState.amount &&
      formState.currencyConversionFactor &&
      !formState.amountInOriginCurrency
    ) {
      calculateAmountInOriginCurrency();
    }
  }, [
    formState.amount,
    formState.amountInOriginCurrency,
    formState.currencyConversionFactor,
    calculateAmountInOriginCurrency,
  ]);

  const handleOnBack = useCallback(() => {
    setExpenseMode(ExpenseMode.View);
    resetFormState();
  }, [resetFormState, setExpenseMode]);

  const handleFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  const fieldTimestampIncurred = useMemo(() => {
    return (
      <DateTimePicker
        name="timestampIncurred"
        aria-label="Date incurred"
        mode={DateTimePickerMode.Date}
        value={formState.dateTimeIncurred}
        onChange={handleTimestampIncurredChange}
        required
        ref={refTimestampIncurred}
        placeholder="Select date"
      />
    );
  }, [formState.dateTimeIncurred, handleTimestampIncurredChange]);

  const fieldSelectCurrency = useMemo(() => {
    return (
      <Select.Root
        name="currency"
        value={formState.currency}
        onValueChange={handleCurrencyChange}
        required
        form={idForm}
        disabled={formState.loading}
      >
        <Select.Trigger id={`${idForm}-currency`} aria-label="Currency" />
        <Select.Content>
          {ALL_CURRENCIES.map((currency) => (
            <Select.Item key={currency} value={currency}>
              {currency}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  }, [formState.currency, formState.loading, handleCurrencyChange, idForm]);

  return (
    <form
      className={s.cardForm}
      id={idForm}
      onInput={handleFormInput}
      onSubmit={handleForm}
    >
      {refundOf && (
        <Text size="3" weight="bold">
          Record refund
        </Text>
      )}
      <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Date Incurred * (in {timeZoneIncurred} time zone)
        </Text>
        {fieldTimestampIncurred}
      </div>

      {/* TODO: implement later */}
      {/* <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Time Zone (trip default: {trip.timeZone})
        </Text>
        <TimeZoneSelect
          id="timeZoneIncurred"
          name="timeZoneIncurred"
          value={timeZoneIncurred}
          handleChange={handleTimeZoneChange}
          isFormLoading={formState.loading}
        />
      </div> */}

      <div className={s.formRow}>
        <Text
          as="label"
          htmlFor={`${idForm}-title`}
          color="gray"
          size="1"
          weight="medium"
          className={s.formLabel}
        >
          Title *
        </Text>
        <TextField.Root
          id={`${idForm}-title`}
          name="title"
          type="text"
          value={formState.title}
          onChange={handleInputChange}
          required
          disabled={formState.loading}
          ref={refTitle}
        />
      </div>

      <div className={s.formRow}>
        <Text
          as="label"
          htmlFor={`${idForm}-description`}
          color="gray"
          size="1"
          weight="medium"
          className={s.formLabel}
        >
          Description
        </Text>
        <TextField.Root
          id={`${idForm}-description`}
          name="description"
          type="text"
          value={formState.description}
          onChange={handleInputChange}
          disabled={formState.loading}
        />
      </div>

      <div className={s.formRow}>
        <Text
          as="label"
          htmlFor={`${idForm}-currency`}
          color="gray"
          size="1"
          weight="medium"
          className={s.formLabel}
        >
          Currency *
        </Text>
        {fieldSelectCurrency}
      </div>

      <div className={s.formRow}>
        <Text
          as="label"
          htmlFor={`${idForm}-amount`}
          color="gray"
          size="1"
          weight="medium"
          className={s.formLabel}
        >
          Amount *
        </Text>
        <Flex direction="row" gap="2">
          <Box asChild flexGrow="1">
            <TextField.Root
              id={`${idForm}-amount`}
              name="amount"
              type="text"
              inputMode="decimal"
              value={formState.amount}
              onChange={handleInputChange}
              onFocus={handleFocusAmount}
              disabled={formState.loading}
              required
            />
          </Box>
          <Box asChild flexGrow="0">
            <Tooltip
              content={`Based on "Amount in Origin Currency" and "Currency Conversion Factor", calculate "Amount".`}
            >
              <Button
                type="button"
                variant="outline"
                color="gray"
                onClick={calculateAmount}
                disabled={
                  formState.loading || !formState.amountAbleToBeCalculated
                }
              >
                <MagicWandIcon />
                Calculate
              </Button>
            </Tooltip>
          </Box>
        </Flex>
      </div>

      {formState.currency !== trip.originCurrency && (
        <>
          <div className={s.formRow}>
            <Text
              as="label"
              htmlFor={`${idForm}-currencyConversionFactor`}
              color="gray"
              size="1"
              weight="medium"
              className={s.formLabel}
            >
              Currency Conversion Factor{' '}
              <Text size="2" color="gray">
                <Tooltip
                  content={`How much does 1 unit of origin's currency${trip?.originCurrency ? ` (${trip.originCurrency})` : ''} is worth in the entry's currency ${formState.currency ? ` (${formState.currency})` : ''}. This is equal to "Amount" divided by "Amount in Origin's Currency".`}
                >
                  <QuestionMarkCircledIcon className={s.tooltipIcon} />
                </Tooltip>{' '}
                :
              </Text>
            </Text>
            <Flex direction="row" gap="2">
              <Box asChild flexGrow="1">
                <TextField.Root
                  id={`${idForm}-currencyConversionFactor`}
                  name="currencyConversionFactor"
                  type="text"
                  inputMode="decimal"
                  value={formState.currencyConversionFactor}
                  onChange={handleInputChange}
                  onFocus={handleFocusCurrencyConversionFactor}
                  disabled={formState.loading}
                />
              </Box>
              <Box asChild flexGrow="0">
                <Tooltip
                  content={`Based on "Amount" and "Amount in Origin Currency", calculate "Currency Conversion Factor".`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    color="gray"
                    onClick={calculateCurrencyConversionFactor}
                    disabled={
                      formState.loading ||
                      !formState.currencyConversionFactorAbleToBeCalculated
                    }
                  >
                    <MagicWandIcon />
                    Calculate
                  </Button>
                </Tooltip>
              </Box>
            </Flex>
          </div>

          <div className={s.formRow}>
            <Text
              as="label"
              htmlFor={`${idForm}-amountInOriginCurrency`}
              color="gray"
              size="1"
              weight="medium"
              className={s.formLabel}
            >
              Amount in Origin Currency
              {trip?.originCurrency ? ` (${trip.originCurrency})` : ''}
            </Text>
            <Flex direction="row" gap="2">
              <Box asChild flexGrow="1">
                <TextField.Root
                  id={`${idForm}-amountInOriginCurrency`}
                  name="amountInOriginCurrency"
                  type="text"
                  inputMode="decimal"
                  value={formState.amountInOriginCurrency}
                  onChange={handleInputChange}
                  disabled={formState.loading}
                  onFocus={handleFocusAmountInOriginCurrency}
                />
              </Box>
              <Box asChild flexGrow="0">
                <Tooltip
                  content={`Based on "Amount" and "Currency Conversion Factor", calculate "Amount in Origin Currency".`}
                >
                  <Button
                    type="button"
                    variant="outline"
                    color="gray"
                    onClick={calculateAmountInOriginCurrency}
                    disabled={
                      formState.loading ||
                      !formState.amountInOriginCurrencyAbleToBeCalculated
                    }
                  >
                    <MagicWandIcon />
                    Calculate
                  </Button>
                </Tooltip>
              </Box>
            </Flex>
          </div>
        </>
      )}

      <ExpenseSplitFields
        key={formState.currency}
        trip={trip}
        amount={formState.amount}
        currency={formState.currency}
        value={ledger}
        onChange={(next) => {
          if (
            next.paidBy !== ledger.paidBy ||
            next.contributions !== ledger.contributions
          ) {
            setPayerEdited(true);
          }
          setLedger(next);
        }}
        disabled={formState.loading}
      />

      {errorMessage && (
        <Text
          color={dangerToken}
          size="2"
          className={s.errorMessage}
          role="alert"
        >
          {errorMessage}
        </Text>
      )}

      <div className={s.formActions}>
        <Button type="submit" variant="solid" loading={formState.loading}>
          {expenseMode === ExpenseMode.Edit ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="soft"
          color="gray"
          onClick={handleOnBack}
          disabled={formState.loading}
        >
          Back
        </Button>
      </div>
    </form>
  );
}
