import Link from 'next/link';

import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <SignupForm />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
