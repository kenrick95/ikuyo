import { Cross1Icon } from '@radix-ui/react-icons';
import { Box, Button, Dialog, Flex } from '@radix-ui/themes';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { dangerToken } from '../common/ui';
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
  needConfirmToClose: boolean;
  confirmingClose: boolean;
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
  | { type: 'requestDismissDialog' }
  | { type: 'closeDialogFromTitleButton' }
  // TODO: the confirming close flow is specific for editing & duplicating mode; while it works, the naming leave much to be desired
  | { type: 'confirmClose' }
  | { type: 'cancelClose' };

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

const DialogRouteContext = createContext<{
  closeDialogFromTitleButton: () => void;
} | null>(null);

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
              closable:
                action.mode === DialogMode.View ||
                action.mode === DialogMode.Delete,
              needConfirmToClose:
                action.mode === DialogMode.Edit ||
                action.mode === DialogMode.Duplicate,
              mode: action.mode,
              confirmingClose: false,
            };
          case 'closeDialogFromTitleButton':
            if (state.open && state.needConfirmToClose) {
              return {
                ...state,
                confirmingClose: true,
              };
            }
            return {
              ...state,
              open: false,
            };
          case 'confirmClose':
            return {
              ...state,
              confirmingClose: false,
              open: false,
            };
          case 'cancelClose':
            return {
              ...state,
              confirmingClose: false,
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
            } else if (state.open && state.needConfirmToClose) {
              return {
                ...state,
                confirmingClose: true,
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
        closable:
          initialMode === DialogMode.View || initialMode === DialogMode.Delete,
        needConfirmToClose:
          initialMode === DialogMode.Edit ||
          initialMode === DialogMode.Duplicate,
        confirmingClose: false,
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
    const contextValue = useMemo(
      () => ({
        closeDialogFromTitleButton: () =>
          dispatch({ type: 'closeDialogFromTitleButton' }),
      }),
      [],
    );
    const handleCancel = useCallback(() => {
      dispatch({ type: 'cancelClose' });
    }, []);
    const handleConfirmClose = useCallback(() => {
      dispatch({ type: 'confirmClose' });
    }, []);
    return (
      <Dialog.Root open={state.open}>
        <DialogRouteContext.Provider value={contextValue}>
          <Dialog.Root open={state.confirmingClose}>
            <Dialog.Content maxWidth={CommonDialogMaxWidth}>
              <Dialog.Title>Discard unsaved changes?</Dialog.Title>
              <Dialog.Description size="2">
                You have unsaved changes in this form. If you close now, your
                changes will be lost.
              </Dialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <Button
                  variant="soft"
                  color="gray"
                  onClick={handleCancel}
                  autoFocus
                >
                  Keep editing
                </Button>
                <Button
                  variant="solid"
                  color={dangerToken}
                  onClick={handleConfirmClose}
                >
                  Discard changes
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
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
        </DialogRouteContext.Provider>
      </Dialog.Root>
    );
  }
  return DialogRoute;
}

function DialogTitleSection({ title }: { title: React.ReactNode }) {
  const ctx = useContext(DialogRouteContext);
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
        onClick={ctx?.closeDialogFromTitleButton}
      >
        <Cross1Icon />
      </Button>
    </Flex>
  );
}
