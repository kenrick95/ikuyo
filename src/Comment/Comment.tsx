import { Button, Card, Flex, Popover, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { memo, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { UserAvatar } from '../Auth/UserAvatar';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import {
  RouteTripExpenses,
  RouteTripTimetableView,
  RouteTripTimetableViewAccommodation,
  RouteTripTimetableViewActivity,
  RouteTripTimetableViewMacroplan,
} from '../Routes/routes';
import { useTripCommentGroup } from '../Trip/hooks';
import type { TripSliceCommentWithUser } from '../Trip/store';
import { dangerToken } from '../ui';
import s from './Comment.module.css';
import { CommentForm } from './CommentForm';
import { CommentMode, type CommentModeType } from './CommentMode';
import { dbDeleteComment } from './db';

function CommentInner({
  comment,
  onFormFocus,
  showCommentObjectTarget,
  showControls,
}: {
  comment: TripSliceCommentWithUser;
  onFormFocus: () => void;
  showCommentObjectTarget: boolean;
  showControls: boolean;
}) {
  const currentUser = useDeepBoundStore((state) => state.currentUser);
  const commentGroup = useTripCommentGroup(comment.commentGroupId);

  const { user } = comment;
  const isCommentOwnedByCurrentUser = useMemo(() => {
    return currentUser && user && currentUser.id === user.id;
  }, [currentUser, user]);
  const formattedDateTimeStringCreated = useMemo(() => {
    return formatTimestampToDateTimeString(comment.createdAt);
  }, [comment.createdAt]);
  const formattedDateTimeStringUpdated = useMemo(() => {
    return formatTimestampToDateTimeString(comment.lastUpdatedAt);
  }, [comment.lastUpdatedAt]);
  const nodes = useParseTextIntoNodes(comment.content || '');
  const publishToast = useBoundStore((state) => state.publishToast);
  const [commentMode, setCommentMode] = useState<CommentModeType>(
    CommentMode.View,
  );
  const [objectTargetName, objectTargetLinkRoutePath] = useMemo(() => {
    if (!showCommentObjectTarget) {
      return ['', ''];
    }
    const objectType = commentGroup?.objectType;
    const objectId = commentGroup?.objectId;
    const objectName = commentGroup?.objectName;
    if (!objectType || !objectId || !objectName) {
      return ['', ''];
    }

    if (objectType === 'activity') {
      return [
        objectName,
        RouteTripTimetableView.asRouteTarget() +
          RouteTripTimetableViewActivity.asRouteTarget(objectId),
      ];
    } else if (objectType === 'macroplan') {
      return [
        objectName,
        RouteTripTimetableView.asRouteTarget() +
          RouteTripTimetableViewMacroplan.asRouteTarget(objectId),
      ];
    } else if (objectType === 'accommodation') {
      return [
        objectName,
        RouteTripTimetableView.asRouteTarget() +
          RouteTripTimetableViewAccommodation.asRouteTarget(objectId),
      ];
    } else if (objectType === 'expense') {
      return [objectName, RouteTripExpenses.asRouteTarget()];
    } else if (objectType === 'trip') {
      return [objectName, '/'];
    }
    return ['', ''];
  }, [commentGroup, showCommentObjectTarget]);
  return (
    <Flex gap="3" align="start">
      <UserAvatar user={user} />
      <Flex direction="column" gap="1" flexGrow="1">
        <Flex gap="1" align="baseline">
          <Text size="2" weight="bold">
            {user?.handle}
          </Text>
          {showCommentObjectTarget &&
          objectTargetName &&
          objectTargetLinkRoutePath ? (
            <Text size="1">
              on <Link to={objectTargetLinkRoutePath}>{objectTargetName}</Link>
            </Text>
          ) : null}
          <Text
            size="1"
            title={`Created ${formattedDateTimeStringCreated}${
              formattedDateTimeStringCreated !== formattedDateTimeStringUpdated
                ? ` (edited ${formattedDateTimeStringUpdated})`
                : ''
            }`}
          >
            {formattedDateTimeStringCreated}
            {formattedDateTimeStringCreated !== formattedDateTimeStringUpdated
              ? ' (edited)'
              : ''}
          </Text>
        </Flex>

        {commentMode === CommentMode.Edit && commentGroup ? (
          <CommentForm
            mode={CommentMode.Edit}
            user={currentUser}
            commentId={comment.id}
            commentGroupId={comment.commentGroupId}
            commentContent={comment.content}
            tripId={commentGroup.tripId}
            objectId={commentGroup.objectId}
            objectType={commentGroup.objectType}
            setCommentMode={setCommentMode}
            onFormFocus={onFormFocus}
          />
        ) : (
          <>
            <Card>
              <Text as="div" size="2" className={s.content}>
                {nodes}
              </Text>
            </Card>
            {showControls && isCommentOwnedByCurrentUser ? (
              <Flex align="baseline" gap="2">
                <Button
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => {
                    setCommentMode(CommentMode.Edit);
                  }}
                >
                  Edit
                </Button>
                <Text size="1">•</Text>

                <Popover.Root>
                  <Popover.Trigger>
                    <Button size="1" variant="ghost" color="gray">
                      Delete
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content size="2">
                    <Text as="p" size="2">
                      Delete comment?
                    </Text>
                    <Text as="p" size="2" color={dangerToken}>
                      This action is irreversible!
                    </Text>
                    <Flex gap="2" mt="4" justify="end">
                      <Popover.Close>
                        <Button size="2" variant="soft" color="gray">
                          Cancel
                        </Button>
                      </Popover.Close>
                      <Button
                        size="2"
                        variant="solid"
                        color={dangerToken}
                        onClick={() => {
                          dbDeleteComment(comment.id, comment.commentGroupId)
                            .then(() => {
                              publishToast({
                                root: {},
                                title: {
                                  children: 'Comment deleted',
                                },
                                close: {},
                              });
                            })
                            .catch((error: unknown) => {
                              console.error(
                                `Error deleting comment "${comment.id}"`,
                                error,
                              );
                              publishToast({
                                root: {},
                                title: {
                                  children: 'Error deleting comment',
                                },
                                close: {},
                              });
                            });
                        }}
                      >
                        Delete
                      </Button>
                    </Flex>
                  </Popover.Content>
                </Popover.Root>
              </Flex>
            ) : null}
          </>
        )}
      </Flex>
    </Flex>
  );
}

function formatTimestampToDateTimeString(timestamp: number): string {
  const dateTime = DateTime.fromMillis(timestamp);
  return dateTime.toFormat('d LLLL yyyy, HH:mm ZZ');
}
export const Comment = memo(CommentInner, (prevProps, nextProps) => {
  return (
    prevProps.comment.id === nextProps.comment.id &&
    prevProps.comment.content === nextProps.comment.content &&
    prevProps.comment.createdAt === nextProps.comment.createdAt &&
    prevProps.comment.lastUpdatedAt === nextProps.comment.lastUpdatedAt &&
    prevProps.showCommentObjectTarget === nextProps.showCommentObjectTarget &&
    prevProps.showControls === nextProps.showControls
  );
});
