'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@cairn/ui';

import { browserApiFetch } from '../../lib/api-client-browser';

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await browserApiFetch('/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      Log out
    </Button>
  );
}
