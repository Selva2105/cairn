import Link from 'next/link';

import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <LoginForm redirectTo={from ?? '/dashboard/overview'} />
      <p className="text-sm text-muted-foreground">
        No account?{' '}
        <Link
          href={from ? `/signup?from=${encodeURIComponent(from)}` : '/signup'}
          className="text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}
