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
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
// import { TimeZoneSelect } from '../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../common/ui';
import { ALL_CURRENCIES } from '../data/intl/currencies';
import { useBoundStore } from '../data/store';
import type { TripSliceExpense, TripSliceTrip } from '../Trip/store/types';
import { formatCurrencyAmount } from './currency';
import { dbAddExpense, dbUpdateExpense } from './db';
import s from './ExpenseCard.module.css';
import { ExpenseMode } from './ExpenseMode';

export function ExpenseInlineCardForm({
  trip,
  expense,
  expenseMode,
  setExpenseMode,
}: {
  trip: TripSliceTrip;
  expense: TripSliceExpense | undefined;
  expenseMode: ExpenseMode;
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
              : '1',
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
              : '1',
          amountInOriginCurrency: '',

          amountAbleToBeCalculated: false,
          currencyConversionFactorAbleToBeCalculated: false,
          amountInOriginCurrencyAbleToBeCalculated: false,
        },
  );
  const [errorMessage, setErrorMessage] = useState('');
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

  const handleForm = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMessage('');
      setFormState((prev) => ({ ...prev, loading: true }));
      const {
        dateTimeIncurred,
        title,
        description,
        currency,
        amount,
        currencyConversionFactor,
        amountInOriginCurrency,
      } = formState;

      const amountFloat = Number.parseFloat(amount);
      const currencyConversionFactorFloat = Number.parseFloat(
        currencyConversionFactor,
      );
      const amountInOriginCurrencyFloat = Number.parseFloat(
        amountInOriginCurrency,
      );

      if (!dateTimeIncurred || !title || !currency) {
        setErrorMessage('Please fill in all required fields.');
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      } else if (Number.isNaN(amountFloat)) {
        setErrorMessage(`Please fill in a valid number for "Amount"`);
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      } else if (Number.isNaN(amountInOriginCurrencyFloat)) {
        setErrorMessage(
          `Please fill in a valid number for "Amount in Origin Currency"`,
        );
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      } else if (Number.isNaN(currencyConversionFactorFloat)) {
        setErrorMessage(
          `Please fill in a valid number for "Currency Conversion Factor"`,
        );
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      } else if (currencyConversionFactorFloat <= 0) {
        setErrorMessage(
          `Please fill in a valid number greater than 0 for "Currency Conversion Factor"`,
        );
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      } else if (amountInOriginCurrencyFloat <= 0) {
        setErrorMessage(
          `Please fill in a valid number greater than 0 for "Amount in Origin Currency"`,
        );
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      } else if (amountFloat <= 0) {
        setErrorMessage(
          `Please fill in a valid number greater than 0 for "Amount"`,
        );
        setFormState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (expenseMode === ExpenseMode.Edit && expense) {
        dbUpdateExpense({
          id: expense.id,
          title,
          description: description || '',
          currency,
          amount: amountFloat,
          currencyConversionFactor: currencyConversionFactorFloat,
          amountInOriginCurrency: amountInOriginCurrencyFloat,
          timestampIncurred:
            dateTimeIncurred.toZonedDateTime(timeZoneIncurred)
              .epochMilliseconds,
          timeZoneIncurred: timeZoneIncurred,
        })
          .then(() => {
            publishToast({
              root: {},
              title: { children: `Updated expense: ${title}` },
              close: {},
            });
            setTripLocalState(trip.id, {
              expenseCurrency: currency,
              expenseCurrencyConversionFactor: currencyConversionFactorFloat,
              expenseTimestampIncurred:
                dateTimeIncurred.toZonedDateTime(timeZoneIncurred)
                  .epochMilliseconds,
            });

            setExpenseMode(ExpenseMode.View);
            resetFormState();
          })
          .catch((error: unknown) => {
            console.error(`Error updating expense "${title}"`, error);
            publishToast({
              root: {},
              title: { children: `Error updating expense: ${title}` },
              close: {},
            });
          });
      } else {
        const backupFormState = { ...formState };
        resetFormState();
        refTitle.current?.focus();

        // Reset form state first, so that user can continue to add more expenses
        dbAddExpense(
          {
            title,
            description,
            currency,
            amount: amountFloat,
            currencyConversionFactor: currencyConversionFactorFloat,
            amountInOriginCurrency: amountInOriginCurrencyFloat,
            timestampIncurred:
              dateTimeIncurred.toZonedDateTime(timeZoneIncurred)
                .epochMilliseconds,
            timeZoneIncurred: timeZoneIncurred,
          },
          { tripId: trip.id },
        )
          .then(() => {
            setTripLocalState(trip.id, {
              expenseCurrency: currency,
              expenseCurrencyConversionFactor: currencyConversionFactorFloat,
              expenseTimestampIncurred:
                dateTimeIncurred.toZonedDateTime(timeZoneIncurred)
                  .epochMilliseconds,
            });
            publishToast({
              root: {},
              title: { children: `Added expense: ${title}` },
              close: {},
            });
          })
          .catch((error: unknown) => {
            console.error(`Error adding expense "${title}"`, error);
            publishToast({
              root: {},
              title: { children: `Error adding expense: ${title}` },
              close: {},
            });
            // If error occurs, restore the form state to the previous state
            setFormState(backupFormState);
          });
      }
    },
    [
      formState,
      timeZoneIncurred,
      trip.id,
      expenseMode,
      expense,
      publishToast,
      resetFormState,
      setExpenseMode,
      setTripLocalState,
    ],
  );

  const handleCurrencyChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, currency: value }));
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
        <Select.Trigger />
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
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Title *
        </Text>
        <TextField.Root
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
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Description
        </Text>
        <TextField.Root
          name="description"
          type="text"
          value={formState.description}
          onChange={handleInputChange}
          disabled={formState.loading}
        />
      </div>

      <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Currency *
        </Text>
        {fieldSelectCurrency}
      </div>

      <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Amount *
        </Text>
        <Flex direction="row" gap="2">
          <Box asChild flexGrow="1">
            <TextField.Root
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

      <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Currency Conversion Factor *{' '}
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
              name="currencyConversionFactor"
              type="text"
              inputMode="decimal"
              value={formState.currencyConversionFactor}
              onChange={handleInputChange}
              onFocus={handleFocusCurrencyConversionFactor}
              disabled={formState.loading}
              required
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
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Amount in Origin Currency
          {trip?.originCurrency ? ` (${trip.originCurrency})` : ''} *
        </Text>
        <Flex direction="row" gap="2">
          <Box asChild flexGrow="1">
            <TextField.Root
              name="amountInOriginCurrency"
              type="text"
              inputMode="decimal"
              value={formState.amountInOriginCurrency}
              onChange={handleInputChange}
              disabled={formState.loading}
              onFocus={handleFocusAmountInOriginCurrency}
              required
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

      {errorMessage && (
        <Text color={dangerToken} size="2" className={s.errorMessage}>
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
