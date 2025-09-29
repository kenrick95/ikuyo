import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button, Select, Text, TextField, Tooltip } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import type * as React from 'react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
import { dangerToken } from '../common/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceExpense, TripSliceTrip } from '../Trip/store/types';
import { dbAddExpense, dbUpdateExpense } from './db';
import s from './ExpenseCard.module.css';
import { ExpenseMode } from './ExpenseMode';
import { formatToDateInput, getDateTimeFromDateInput } from './time';

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
  const timestampIncurredStr = useMemo(
    () =>
      formatToDateInput(
        DateTime.fromMillis(
          expenseMode === ExpenseMode.Edit && expense
            ? expense.timestampIncurred
            : trip.timestampStart,
        ).setZone(trip.timeZone),
      ),
    [trip.timestampStart, trip.timeZone, expense, expenseMode],
  );
  const publishToast = useBoundStore((state) => state.publishToast);
  const idForm = useId();
  const [formState, setFormState] = useState(
    expenseMode === ExpenseMode.Edit && expense
      ? {
          loading: false,
          timestampIncurred: timestampIncurredStr,
          title: expense.title,
          description: expense.description,
          currency: expense.currency,
          amount: expense.amount.toFixed(2),
          currencyConversionFactor:
            expense.currencyConversionFactor != null
              ? expense.currencyConversionFactor.toFixed(2)
              : '1',
          amountInOriginCurrency:
            expense.amountInOriginCurrency != null
              ? expense.amountInOriginCurrency.toFixed(2)
              : '',
        }
      : {
          loading: false,
          timestampIncurred: timestampIncurredStr,
          title: '',
          description: '',
          currency: trip.currency,
          amount: '',
          currencyConversionFactor: '1',
          amountInOriginCurrency: '',
        },
  );
  const [errorMessage, setErrorMessage] = useState('');
  const currencies = useMemo(() => Intl.supportedValuesOf('currency'), []);

  const resetFormState = useCallback(() => {
    setFormState({
      loading: false,
      timestampIncurred: timestampIncurredStr,
      title: '',
      description: '',
      currency: trip.currency,
      amount: '',
      currencyConversionFactor: '1',
      amountInOriginCurrency: '',
    });
  }, [trip.currency, timestampIncurredStr]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    },
    [],
  );

  const handleForm = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrorMessage('');
      setFormState((prev) => ({ ...prev, loading: true }));
      const {
        timestampIncurred,
        title,
        description,
        currency,
        amount,
        currencyConversionFactor,
        amountInOriginCurrency,
      } = formState;

      const dateTimestampIncurred = getDateTimeFromDateInput(
        timestampIncurred,
        trip.timeZone,
      );
      const amountFloat = Number.parseFloat(amount);
      const currencyConversionFactorFloat = Number.parseFloat(
        currencyConversionFactor,
      );
      const amountInOriginCurrencyFloat = Number.parseFloat(
        amountInOriginCurrency,
      );

      if (
        !timestampIncurred ||
        !title ||
        !currency ||
        Number.isNaN(amountFloat)
      ) {
        setErrorMessage('Please fill in all required fields.');
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
          timestampIncurred: dateTimestampIncurred.toMillis(),
        })
          .then(() => {
            publishToast({
              root: {},
              title: { children: `Updated expense: ${title}` },
              close: {},
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
            timestampIncurred: dateTimestampIncurred.toMillis(),
          },
          { tripId: trip.id },
        )
          .then(() => {
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
      trip.timeZone,
      trip.id,
      expenseMode,
      expense,
      publishToast,
      resetFormState,
      setExpenseMode,
    ],
  );

  const handleCurrencyChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, currency: value }));
  }, []);

  const refTimestampIncurred = useRef<HTMLButtonElement>(null);
  const refTitle = useRef<HTMLInputElement>(null);

  const handleTimestampIncurredChange = useCallback(
    (value: DateTime | undefined) => {
      if (value) {
        setFormState((prev) => ({
          ...prev,
          timestampIncurred: formatToDateInput(value),
        }));
      }
    },
    [],
  );

  const handleFocusAmount = useCallback(() => {
    // If the other two values are available & this is empty, then calculate it
    if (
      !formState.amount &&
      formState.currencyConversionFactor &&
      formState.amountInOriginCurrency
    ) {
      const amountInOriginCurrencyFloat = Number.parseFloat(
        formState.amountInOriginCurrency,
      );
      const currencyConversionFactorFloat = Number.parseFloat(
        formState.currencyConversionFactor,
      );
      setFormState((prev) => ({
        ...prev,
        amount: (
          amountInOriginCurrencyFloat * currencyConversionFactorFloat
        ).toFixed(2),
      }));
    }
  }, [
    formState.amount,
    formState.amountInOriginCurrency,
    formState.currencyConversionFactor,
  ]);

  const handleFocusCurrencyConversionFactor = useCallback(() => {
    // If the other two values are available & this is empty, then calculate it
    if (
      formState.amount &&
      !formState.currencyConversionFactor &&
      formState.amountInOriginCurrency
    ) {
      const amountFloat = Number.parseFloat(formState.amount);
      const amountInOriginCurrencyFloat = Number.parseFloat(
        formState.amountInOriginCurrency,
      );
      setFormState((prev) => ({
        ...prev,
        currencyConversionFactor: (
          amountFloat / amountInOriginCurrencyFloat
        ).toFixed(2),
      }));
    }
  }, [
    formState.amount,
    formState.amountInOriginCurrency,
    formState.currencyConversionFactor,
  ]);

  const handleFocusAmountInOriginCurrency = useCallback(() => {
    // If the other two values are available & this is empty, then calculate it
    if (
      formState.amount &&
      formState.currencyConversionFactor &&
      !formState.amountInOriginCurrency
    ) {
      const amountFloat = Number.parseFloat(formState.amount);
      const currencyConversionFactorFloat = Number.parseFloat(
        formState.currencyConversionFactor,
      );
      setFormState((prev) => ({
        ...prev,
        amountInOriginCurrency: (
          amountFloat / currencyConversionFactorFloat
        ).toFixed(2),
      }));
    }
  }, [
    formState.amount,
    formState.amountInOriginCurrency,
    formState.currencyConversionFactor,
  ]);

  const handleOnBack = useCallback(() => {
    setExpenseMode(ExpenseMode.View);
    resetFormState();
  }, [resetFormState, setExpenseMode]);

  const handleFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  const fieldTimestampIncurred = useMemo(() => {
    const currentValue = formState.timestampIncurred
      ? getDateTimeFromDateInput(formState.timestampIncurred, trip.timeZone)
      : undefined;

    return (
      <DateTimePicker
        name="timestampIncurred"
        mode={DateTimePickerMode.Date}
        value={currentValue}
        onChange={handleTimestampIncurredChange}
        required
        ref={refTimestampIncurred}
        placeholder="Select date"
      />
    );
  }, [
    formState.timestampIncurred,
    trip.timeZone,
    handleTimestampIncurredChange,
  ]);

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
          {currencies.map((currency) => (
            <Select.Item key={currency} value={currency}>
              {currency}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    );
  }, [
    currencies,
    formState.currency,
    formState.loading,
    handleCurrencyChange,
    idForm,
  ]);

  return (
    <form
      className={s.cardForm}
      id={idForm}
      onInput={handleFormInput}
      onSubmit={handleForm}
    >
      <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Date Incurred *
        </Text>
        {fieldTimestampIncurred}
      </div>

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
        <TextField.Root
          name="amount"
          type="number"
          value={formState.amount}
          onChange={handleInputChange}
          onFocus={handleFocusAmount}
          disabled={formState.loading}
          required
        />
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
        <TextField.Root
          name="currencyConversionFactor"
          type="number"
          value={formState.currencyConversionFactor}
          onChange={handleInputChange}
          onFocus={handleFocusCurrencyConversionFactor}
          disabled={formState.loading}
          required
        />
      </div>

      <div className={s.formRow}>
        <Text color="gray" size="1" weight="medium" className={s.formLabel}>
          Amount in Origin Currency
          {trip?.originCurrency ? ` (${trip.originCurrency})` : ''} *
        </Text>
        <TextField.Root
          name="amountInOriginCurrency"
          type="number"
          value={formState.amountInOriginCurrency}
          onChange={handleInputChange}
          disabled={formState.loading}
          onFocus={handleFocusAmountInOriginCurrency}
          required
        />
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
