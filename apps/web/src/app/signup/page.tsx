import Link from 'next/link';

import { SignupForm } from './signup-form';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <SignupForm redirectTo={from ?? '/dashboard/overview'} />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={from ? `/login?from=${encodeURIComponent(from)}` : '/login'}
          className="text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </main>
  );
}
