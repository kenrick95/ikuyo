import { IconButton, Popover, TextField } from '@radix-ui/themes';
import { useCallback, useRef, useState } from 'react';
import { EmojiPickerGrid } from './EmojiPickerGrid';
import s from './EmojiTextField.module.css';

export function EmojiTextField({
  id,
  name,
  defaultValue,
  placeholder,
  required,
  iconName,
  defaultIcon,
  clearable,
}: {
  id: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  iconName: string;
  defaultIcon?: string | null | undefined;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(defaultIcon ?? '');
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const listboxId = `${id}-emoji-listbox`;

  const selectEmoji = useCallback((selectedIcon: string) => {
    setIcon(selectedIcon);
    setOpen(false);
  }, []);

  const clearIcon = useCallback(() => {
    setIcon('');
  }, []);

  const onFocusOutside = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  const onEscapeKeyDown = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  return (
    <>
      <TextField.Root
        defaultValue={defaultValue}
        placeholder={placeholder}
        name={name}
        type="text"
        id={id}
        required={required}
      >
        <TextField.Slot>
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger>
              <IconButton
                ref={triggerRef}
                type="button"
                variant="ghost"
                color="gray"
                size="1"
                aria-label="Choose emoji icon"
              >
                <span className={icon ? undefined : s.emojiPlaceholder}>
                  {icon || '🙂'}
                </span>
              </IconButton>
            </Popover.Trigger>
            <Popover.Content
              width={{ md: '420px', initial: '100%' }}
              onFocusOutside={onFocusOutside}
              onEscapeKeyDown={onEscapeKeyDown}
            >
              {open ? (
                <EmojiPickerGrid
                  icon={icon}
                  listboxId={listboxId}
                  clearable={clearable}
                  onSelect={selectEmoji}
                  onClear={clearIcon}
                />
              ) : null}
            </Popover.Content>
          </Popover.Root>
        </TextField.Slot>
      </TextField.Root>
      <input type="hidden" name={iconName} value={icon} />
    </>
  );
}
