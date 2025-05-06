import { Dialog } from '@radix-ui/themes';

import { useEffect, useState } from 'react';
import type { RouteComponentProps } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { db } from '../data/db';
import { AccommodationDialogContentDelete } from './AccommodationDialogContentDelete';
import { AccommodationDialogContentEdit } from './AccommodationDialogContentEdit';
import { AccommodationDialogContentView } from './AccommodationDialogContentView';
import {
  AccommodationDialogMode,
  type AccommodationDialogModeType,
} from './AccommodationDialogMode';
import type { DbAccommodationWithTrip } from './db';

function AccommodationDialogContent({
  params,
}: RouteComponentProps<{ id: string }>) {
  const [mode, setMode] = useState<AccommodationDialogModeType>(
    history.state?.mode ?? AccommodationDialogMode.View,
  );
  const { id: accommodationId } = params;
  const { data } = db.useQuery({
    accommodation: {
      trip: {},
      $: {
        where: {
          id: accommodationId,
        },
      },
    },
  });
  const accommodation = data?.accommodation[0] as
    | DbAccommodationWithTrip
    | undefined;
  return (
    <>
      {!accommodation ? (
        <Dialog.Content maxWidth={CommonDialogMaxWidth}>
          <Dialog.Title>Accommodation</Dialog.Title>
          <Dialog.Description>Loading details...</Dialog.Description>
        </Dialog.Content>
      ) : mode === AccommodationDialogMode.View ? (
        <AccommodationDialogContentView
          accommodation={accommodation}
          setMode={setMode}
        />
      ) : mode === AccommodationDialogMode.Edit ? (
        <AccommodationDialogContentEdit
          accommodation={accommodation}
          setMode={setMode}
        />
      ) : mode === AccommodationDialogMode.Delete ? (
        <AccommodationDialogContentDelete
          accommodation={accommodation}
          setMode={setMode}
        />
      ) : null}
    </>
  );
}
export function AccommodationDialog({
  params,
}: RouteComponentProps<{ id: string }>) {
  console.log('AccommodationDialogInner', params);
  // TODO: there seems to be some unmount and mount again... causing dialog to be closed and open again, which is very annoying
  useEffect(() => {
    console.log('AccommodationDialogInner useEffect', params);
    return () => {
      console.log('AccommodationDialogInner useEffect cleanup', params);
    };
  }, [params]);

  return (
    <Dialog.Root open>
      <AccommodationDialogContent params={params} />
    </Dialog.Root>
  );
}
