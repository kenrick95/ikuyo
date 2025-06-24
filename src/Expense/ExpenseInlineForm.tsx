import { Button, Select, Table, Text, TextField } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import type * as React from 'react';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { dangerToken } from '../common/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceExpense, TripSliceTrip } from '../Trip/store/types';
import { dbAddExpense, dbUpdateExpense } from './db';
import { ExpenseMode } from './ExpenseMode';
import { formatToDateInput, getDateTimeFromDateInput } from './time';
export function ExpenseInlineForm({
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

      console.log('ExpenseInlineForm: submit', {
        timestampIncurred,
        title,
        description,
        currency,
        amountFloat,
        currencyConversionFactorFloat,
        amountInOriginCurrencyFloat,
      });

      if (
        !timestampIncurred ||
        !title ||
        !description ||
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
          description,
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
        refTimestampIncurred.current?.focus();

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
  const refTimestampIncurred = useRef<HTMLInputElement>(null);

  const fieldTimestampIncurred = useMemo(
    () => (
      <TextField.Root
        name="timestampIncurred"
        type="date"
        value={formState.timestampIncurred}
        onChange={handleInputChange}
        required
        form={idForm}
        ref={refTimestampIncurred}
      />
    ),
    [formState.timestampIncurred, handleInputChange, idForm],
  );
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
  // TODO: sticky header

  const fieldAmount = useMemo(() => {
    return (
      <TextField.Root
        name="amount"
        type="number"
        value={formState.amount}
        onChange={handleInputChange}
        form={idForm}
        onFocus={handleFocusAmount}
        disabled={formState.loading}
        required
      />
    );
  }, [
    formState.amount,
    formState.loading,
    handleFocusAmount,
    handleInputChange,
    idForm,
  ]);

  const fieldCurrencyConversionFactor = useMemo(() => {
    return (
      <TextField.Root
        name="currencyConversionFactor"
        type="number"
        value={formState.currencyConversionFactor}
        onChange={handleInputChange}
        form={idForm}
        onFocus={handleFocusCurrencyConversionFactor}
        disabled={formState.loading}
        required
      />
    );
  }, [
    formState.currencyConversionFactor,
    formState.loading,
    handleFocusCurrencyConversionFactor,
    handleInputChange,
    idForm,
  ]);

  const fieldAmountInOriginCurrency = useMemo(() => {
    return (
      <TextField.Root
        name="amountInOriginCurrency"
        type="number"
        value={formState.amountInOriginCurrency}
        onChange={handleInputChange}
        form={idForm}
        disabled={formState.loading}
        onFocus={handleFocusAmountInOriginCurrency}
        required
      />
    );
  }, [
    formState.amountInOriginCurrency,
    formState.loading,
    handleFocusAmountInOriginCurrency,
    handleInputChange,
    idForm,
  ]);

  const handleOnBack = useCallback(() => {
    setExpenseMode(ExpenseMode.View);
    resetFormState();
  }, [resetFormState, setExpenseMode]);

  const handleFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  return (
    <>
      <Table.Cell>{fieldTimestampIncurred}</Table.Cell>
      <Table.Cell>
        <TextField.Root
          name="title"
          type="text"
          value={formState.title}
          onChange={handleInputChange}
          required
          form={idForm}
          disabled={formState.loading}
        />
      </Table.Cell>
      <Table.Cell>
        <TextField.Root
          name="description"
          type="text"
          value={formState.description}
          onChange={handleInputChange}
          required
          form={idForm}
          disabled={formState.loading}
        />
      </Table.Cell>
      <Table.Cell>{fieldSelectCurrency}</Table.Cell>
      <Table.Cell>{fieldAmount}</Table.Cell>
      <Table.Cell>{fieldCurrencyConversionFactor}</Table.Cell>
      <Table.Cell>{fieldAmountInOriginCurrency}</Table.Cell>
      <Table.Cell style={{ whiteSpace: 'nowrap' }}>
        <Button
          mr="2"
          mb="2"
          type="submit"
          size="2"
          variant="solid"
          form={idForm}
          loading={formState.loading}
        >
          {expenseMode === ExpenseMode.Edit ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          form={idForm}
          onClick={handleOnBack}
          loading={formState.loading}
        >
          Back
        </Button>
        <form id={idForm} onInput={handleFormInput} onSubmit={handleForm}>
          <Text color={dangerToken} size="2">
            {errorMessage}
          </Text>
        </form>
      </Table.Cell>
    </>
  );
}
