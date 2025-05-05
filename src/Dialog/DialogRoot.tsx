import { useBoundStore } from '../data/store';

export function DialogRoot() {
  const dialogs = useBoundStore((state) => state.dialogs);
  // Hmm if I want to make dialog to be routable
  // need to change this to be <Router> where each dialog is a <Route>?
  // but in that case, how to handle dialog stack?
  // to go 'back', just need to history.go(-1)
  if (dialogs.length > 0) {
    const DialogComponent = dialogs[dialogs.length - 1].component;
    const dialogProps = dialogs[dialogs.length - 1].props;
    return <DialogComponent {...dialogProps} />;
  }
  return null;
}
