// lib/toast.ts
'use client';

import { toast as toastPrimitive } from '@/components/ui/use-toast';
import { type ToastActionElement, type ToastProps } from '@/components/ui/toast';

type ToastOptions = {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  action?: ToastActionElement;
  duration?: number;
};

const toast = {
  default: (options: ToastOptions) => toastPrimitive({ ...options }),
  success: (options: Omit<ToastOptions, 'variant'>) =>
    toastPrimitive({ ...options, variant: 'success' }),
  error: (options: Omit<ToastOptions, 'variant'>) =>
    toastPrimitive({ ...options, variant: 'destructive' }),
  warning: (options: Omit<ToastOptions, 'variant'>) =>
    toastPrimitive({ ...options, variant: 'warning' }),
  info: (options: Omit<ToastOptions, 'variant'>) =>
    toastPrimitive({ ...options, variant: 'info' }),
  promise: async <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ): Promise<T> => {
    const toastId = toastPrimitive({
      title: loading,
      variant: 'default',
    }).id;

    try {
      const data = await promise;
      const successMessage = typeof success === 'function' ? success(data) : success;
      toastPrimitive.update(toastId, {
        title: successMessage,
        variant: 'success',
      });
      return data;
    } catch (err) {
      const errorMessage = typeof error === 'function' ? error(err) : error;
      toastPrimitive.update(toastId, {
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  },
};

export { toast };