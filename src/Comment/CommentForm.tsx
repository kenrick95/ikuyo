import { Box, Button, Flex, Text, TextArea } from '@radix-ui/themes';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { UserAvatar } from '../Auth/UserAvatar';
import { dangerToken } from '../common/ui';
import { useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { CommentMode, type CommentModeType } from './CommentMode';
import {
  type DbCommentGroupObjectType,
  dbAddComment,
  dbUpdateComment,
} from './db';

export function CommentForm({
  mode,
  user,
  commentGroupId,
  commentId,
  commentContent,
  setCommentMode,
  tripId,
  objectId,
  objectType,
  onFormFocus,
}: {
  mode: CommentModeType;
  user?: DbUser;
  commentGroupId?: string;
  commentId?: string;
  commentContent?: string;
  setCommentMode: (mode: CommentModeType) => void;
  onFormFocus: () => void;

  tripId: string;
  objectId: string;
  objectType: DbCommentGroupObjectType;
}) {
  const refTextArea = useRef<HTMLTextAreaElement>(null);
  const idForm = useId();
  const idContent = useId();
  const [isFormLoading, setIsFormLoading] = useState(false);
  useEffect(() => {
    if (mode === CommentMode.Edit && refTextArea.current) {
      refTextArea.current.focus();
    }
  }, [mode]);
  const handleCancel = useCallback(() => {
    setCommentMode(CommentMode.View);
  }, [setCommentMode]);
  const [errorMessage, setErrorMessage] = useState('');
  const publishToast = useBoundStore((state) => state.publishToast);
  const handleSubmit = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const content = (formData.get('content') as string | null) ?? '';
      console.log('CommentForm', {
        mode,
        content,
        tripId,
        objectId,
        objectType,
        commentGroupId,
      });
      if (!content) {
        return;
      }
      setIsFormLoading(true);
      if (mode === CommentMode.Edit && commentId) {
        await dbUpdateComment({
          content,
          id: commentId,
        });
        setCommentMode(CommentMode.View);
        publishToast({
          root: {},
          title: { children: 'Comment updated' },
          close: {},
        });
        setIsFormLoading(false);
      } else if (mode === CommentMode.Add && user) {
        const { id, result } = await dbAddComment(
          {
            content,
          },
          {
            tripId,
            objectId,
            objectType,
            groupId: commentGroupId,
            userId: user.id,
          },
        );
        console.log('CommentForm: dbAddComment', { id, result });
        publishToast({
          root: {},
          title: { children: 'Comment added' },
          close: {},
        });
        setIsFormLoading(false);
        // Keep the focus on the text area for adding more comments. setTimeout to wait for state to be updated
        setTimeout(() => {
          refTextArea.current?.focus();
        }, 0);
      }

      elForm.reset();
    };
  }, [
    mode,
    publishToast,
    tripId,
    objectType,
    objectId,
    commentGroupId,
    commentId,
    user,
    setCommentMode,
  ]);
  return (
    <form
      id={idForm}
      onFocus={onFormFocus}
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const elForm = e.currentTarget;
        void handleSubmit()(elForm);
      }}
    >
      <Flex gap="3">
        {mode === CommentMode.Add ? <UserAvatar user={user} /> : null}
        <Box flexGrow="1">
          <TextArea
            id={idContent}
            name="content"
            placeholder="Write a comment…"
            defaultValue={commentContent}
            style={{ height: 80 }}
            ref={refTextArea}
            disabled={isFormLoading}
          />
          <Flex gap="3" mt="3" justify="between">
            <Flex align="center" gap="2" asChild>
              <Text color={dangerToken} size="2">
                {errorMessage}
              </Text>
            </Flex>

            <Flex gap="2" align="end">
              {mode === CommentMode.Edit ? (
                <>
                  <Button
                    size="1"
                    type="reset"
                    variant="soft"
                    color="gray"
                    form={idForm}
                    onClick={handleCancel}
                    loading={isFormLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="1"
                    type="submit"
                    formTarget={idForm}
                    loading={isFormLoading}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  size="1"
                  type="submit"
                  formTarget={idForm}
                  loading={isFormLoading}
                >
                  Comment
                </Button>
              )}
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </form>
  );
}
