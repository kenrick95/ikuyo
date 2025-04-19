import { Button, Select, Table, Text, TextField } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useId, useMemo, useState } from 'react';
import type { DbTripWithActivityAccommodation } from '../Trip/db';
import { useBoundStore } from '../data/store';
import { dangerToken } from '../ui';
import { ExpenseMode } from './ExpenseMode';
import { type DbExpense, dbAddExpense, dbUpdateExpense } from './db';
import { formatToDateInput, getDateTimeFromDateInput } from './time';
export function ExpenseInlineForm({
  trip,
  expense,
  expenseMode,
  setExpenseMode,
}: {
  trip: DbTripWithActivityAccommodation;
  expense: DbExpense | undefined;
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

      console.log({
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

            resetFormState();
          })
          .catch((error: unknown) => {
            console.error(`Error adding expense "${title}"`, error);
            publishToast({
              root: {},
              title: { children: `Error adding expense: ${title}` },
              close: {},
            });
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
    ],
  );

  const handleCurrencyChange = useCallback((value: string) => {
    setFormState((prev) => ({ ...prev, currency: value }));
  }, []);

  const fieldTimestampIncurred = useMemo(
    () => (
      <TextField.Root
        name="timestampIncurred"
        type="date"
        value={formState.timestampIncurred}
        onChange={handleInputChange}
        required
        form={idForm}
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
  }, [currencies, formState.currency, handleCurrencyChange, idForm]);

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
  // TODO: the UX for new entry is not good, there is a "blank" phase before user sees it... maybe need our own zustand store to make it optimistic

  const fieldAmount = useMemo(() => {
    return (
      <TextField.Root
        name="amount"
        type="number"
        value={formState.amount}
        onChange={handleInputChange}
        form={idForm}
        onFocus={handleFocusAmount}
        required
      />
    );
  }, [formState.amount, handleFocusAmount, handleInputChange, idForm]);

  const fieldCurrencyConversionFactor = useMemo(() => {
    return (
      <TextField.Root
        name="currencyConversionFactor"
        type="number"
        value={formState.currencyConversionFactor}
        onChange={handleInputChange}
        form={idForm}
        onFocus={handleFocusCurrencyConversionFactor}
        required
      />
    );
  }, [
    formState.currencyConversionFactor,
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
        onFocus={handleFocusAmountInOriginCurrency}
        required
      />
    );
  }, [
    formState.amountInOriginCurrency,
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
