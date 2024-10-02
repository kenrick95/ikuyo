import { Portal, Theme } from '@radix-ui/themes';
import s from './DialogLoading.module.css';

export function DialogLoading() {
  return (
    <Portal className={s.dialogLoadingContainer} asChild>
      <Theme accentColor="plum">
        <div className={s.dialogLoading} >Loading...</div>
      </Theme>
    </Portal>
  );
}
