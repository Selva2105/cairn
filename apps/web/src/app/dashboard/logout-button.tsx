'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@cairn/ui';
import { LogOut } from 'lucide-react';

import { browserApiFetch } from '../../lib/api-client-browser';

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      onClick={async () => {
        await browserApiFetch('/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
      }}
    >
      <LogOut className="mr-2 h-4 w-4 shrink-0" />
      Log out
    </Button>
  );
}
