import { Button, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { get, mutate } from '../data/apiClient';
import { assertWritable } from '../data/backendConfig';

const errors: Record<string, string> = {
  expired: 'Google sign-in expired. Please try again.',
  cancelled: 'Google sign-in was cancelled.',
  failed: 'Unable to sign in with Google. Please try again.',
  unverified: 'Google must verify your email before you can sign in.',
  conflict:
    'This Google account is already linked to another Ikuyo account. Your guest account and trips have been kept.',
  unavailable: 'This account is unavailable. Contact support to restore it.',
  link_required:
    'This email already has an Ikuyo account. Sign in with your password or use password recovery.',
};

export function GoogleLogin({ upgrade = false }: { upgrade?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get(
      'google_error',
    );
    return code ? (errors[code] ?? errors.failed) : '';
  });

  useEffect(() => {
    let active = true;
    get<{ enabled: boolean }>('/api/auth/google')
      .then((configuration) => {
        if (active) setEnabled(configuration.enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const start = async () => {
    setLoading(true);
    setError('');
    try {
      if (upgrade) assertWritable('upgrading your guest account');
      const { url } = await mutate<{ url: string }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ upgrade }),
      });
      window.location.assign(url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : errors.failed);
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Text color="red" role="alert">
          {error}
        </Text>
      )}
      {enabled && (
        <Button
          type="button"
          variant="outline"
          loading={loading}
          onClick={start}
        >
          {upgrade ? 'Link Google account' : 'Continue with Google'}
        </Button>
      )}
    </>
  );
}
