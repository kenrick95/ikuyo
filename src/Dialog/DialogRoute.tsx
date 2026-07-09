import { Cross1Icon } from '@radix-ui/react-icons';
import { Box, Button, Dialog, Flex } from '@radix-ui/themes';
import type React from 'react';
import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { CommonDialogMaxWidth, CommonLargeDialogMaxWidth } from './ui';

export const DialogMode = {
  View: 'view',
  Edit: 'edit',
  Delete: 'delete',
  Duplicate: 'duplicate',
} as const;
export type DialogModeType = (typeof DialogMode)[keyof typeof DialogMode];

type DialogStateType = {
  mode: DialogModeType;
  open: boolean;
  closable: boolean;
};
type DialogActionType =
  | {
      type: 'setMode';
      mode: DialogModeType;
    }
  | {
      type: 'setClosable';
      closable: boolean;
    }
  | { type: 'requestDismissDialog' };

export type DialogContentProps<DataType> = {
  data: DataType | undefined;
  loading: boolean;
  error: string | undefined;

  mode: DialogModeType;
  setMode: (mode: DialogModeType) => void;
  dialogContentProps: Dialog.ContentProps;
  setDialogClosable: (closable: boolean) => void;
  DialogTitleSection: React.ComponentType<{ title: React.ReactNode }>;
};
export function createDialogRoute<DataType>({
  DialogContentView,
  DialogContentEdit,
  DialogContentDelete,
  getData,
  getDataMeta,
}: {
  getData: (id: string) => DataType | undefined;
  getDataMeta: (id: string) => {
    loading: boolean;
    error: string | undefined;
  };
  DialogContentView: React.ComponentType<DialogContentProps<DataType>>;
  DialogContentEdit: React.ComponentType<DialogContentProps<DataType>>;
  DialogContentDelete: React.ComponentType<DialogContentProps<DataType>>;
}) {
  function DialogRoute({ params }: RouteComponentProps<{ id: string }>) {
    const [, setLocation] = useLocation();
    const modeFromState = history.state?.mode;
    const initialMode = modeFromState ?? DialogMode.View;
    const [state, dispatch] = useReducer(
      (state: DialogStateType, action: DialogActionType) => {
        switch (action.type) {
          case 'setMode':
            return {
              ...state,
              closable: action.mode === DialogMode.View,
              mode: action.mode,
            };
          case 'setClosable':
            return {
              ...state,
              closable: action.closable,
            };
          case 'requestDismissDialog': {
            if (state.open && state.closable) {
              return {
                ...state,
                open: false,
              };
            }
            return state;
          }
          default:
            return state;
        }
      },
      {
        mode: initialMode,
        open: true,
        closable: initialMode === DialogMode.View,
      },
    );
    const setMode = useCallback((mode: DialogModeType) => {
      dispatch({ type: 'setMode', mode });
    }, []);
    const setDialogClosable = useCallback((closable: boolean) => {
      dispatch({ type: 'setClosable', closable });
    }, []);
    const mode = state.mode;
    useEffect(() => {
      if (!state.open) {
        setLocation('');
      }
    }, [state.open, setLocation]);

    const data = getData(params.id);
    const { loading, error } = getDataMeta(params.id);

    const dialogContentProps = useMemo(() => {
      return {
        onEscapeKeyDown: (e) => {
          if (e.defaultPrevented) return;
          dispatch({ type: 'requestDismissDialog' });
          e.preventDefault();
        },
        onInteractOutside: (e) => {
          if (e.defaultPrevented) return;
          dispatch({ type: 'requestDismissDialog' });
          e.preventDefault();
        },
        maxWidth:
          mode === DialogMode.Delete
            ? CommonDialogMaxWidth
            : CommonLargeDialogMaxWidth,
      } satisfies Dialog.ContentProps;
    }, [mode]);

    return (
      <Dialog.Root open={state.open}>
        {mode === DialogMode.View ? (
          <DialogContentView
            data={data}
            loading={loading}
            error={error}
            mode={mode}
            setMode={setMode}
            dialogContentProps={dialogContentProps}
            setDialogClosable={setDialogClosable}
            DialogTitleSection={DialogTitleSection}
          />
        ) : mode === DialogMode.Edit || mode === DialogMode.Duplicate ? (
          <DialogContentEdit
            data={data}
            loading={loading}
            error={error}
            mode={mode}
            setMode={setMode}
            dialogContentProps={dialogContentProps}
            setDialogClosable={setDialogClosable}
            DialogTitleSection={DialogTitleSection}
          />
        ) : mode === DialogMode.Delete ? (
          <DialogContentDelete
            data={data}
            loading={loading}
            error={error}
            mode={mode}
            setMode={setMode}
            dialogContentProps={dialogContentProps}
            setDialogClosable={setDialogClosable}
            DialogTitleSection={DialogTitleSection}
          />
        ) : null}
      </Dialog.Root>
    );
  }
  return DialogRoute;
}

function DialogTitleSection({ title }: { title: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const closeDialog = useCallback(() => {
    setLocation('');
  }, [setLocation]);
  return (
    <Flex justify="between" align="center" mt="-3" mx="-3" mb="3">
      <Box mt="3" mx="3">
        <Dialog.Title mb="0">{title}</Dialog.Title>
      </Box>
      <Button
        type="button"
        size="2"
        variant="soft"
        color="gray"
        onClick={closeDialog}
      >
        <Cross1Icon />
      </Button>
    </Flex>
  );
}
