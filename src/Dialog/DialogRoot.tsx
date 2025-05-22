import { useDeepBoundStore } from '../data/store';

export function DialogRoot() {
  const dialogs = useDeepBoundStore((state) => state.dialogs);

  if (dialogs.length > 0) {
    const DialogComponent = dialogs[dialogs.length - 1].component;
    const dialogProps = dialogs[dialogs.length - 1].props;
    return <DialogComponent {...dialogProps} />;
  }
  return null;
}
