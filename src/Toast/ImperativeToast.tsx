import React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { ToastConfigContext } from './hooks';

export const ImperativeToastRoot = () => {
  const toastData = React.useContext(ToastConfigContext);

  console.log('toastData', toastData);
  return (
    <ToastPrimitive.Provider>
      {toastData.map((toastConfig, index) => (
        <ToastPrimitive.Root key={index} {...toastConfig.root}>
          {toastConfig.title ? (
            <ToastPrimitive.Title {...toastConfig.title} />
          ) : null}
          {toastConfig.description ? (
            <ToastPrimitive.Description {...toastConfig.description} />
          ) : null}
          {toastConfig.action ? (
            <ToastPrimitive.Action {...toastConfig.action} />
          ) : null}
          {toastConfig.close ? (
            <ToastPrimitive.Close {...toastConfig.close} />
          ) : null}
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
};
