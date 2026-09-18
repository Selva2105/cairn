import Link from 'next/link';

import { CairnMark } from '@cairn/ui';

import { ThemeToggle } from '../../components/theme-toggle';
import { AuthShowcase } from '../../components/auth-showcase';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;
  const signupHref = from
    ? `/signup?from=${encodeURIComponent(from)}`
    : '/signup';

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-12 bg-background">
      {/* Left Column: Brand Editorial Showcase (Desktop) */}
      <div className="hidden lg:col-span-5 lg:block xl:col-span-6">
        <AuthShowcase mode="login" />
      </div>

      {/* Right Column: Authentication Form Container */}
      <section className="relative flex min-h-screen flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:p-12 xl:col-span-6">
        {/* Top bar with quick navigation & theme toggle */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:invisible">
            <CairnMark size={32} />
            <span className="font-bold tracking-tight text-foreground">
              Cairn
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline-block">
              Don't have a household yet?
            </span>
            <Link
              href={signupHref}
              className="text-xs font-medium text-primary transition-colors hover:underline underline-offset-4"
            >
              Sign up
            </Link>
            <div className="h-4 w-px bg-border" />
            <ThemeToggle />
          </div>
        </header>

        {/* Center Content Form */}
        <div className="my-auto mx-auto w-full max-w-md py-8">
          <LoginForm
            redirectTo={from ?? '/dashboard/overview'}
            ssoError={error === 'sso_failed'}
          />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by Cairn encryption. By signing in, you agree to our{' '}
            <Link href="/terms" className="text-foreground/80 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-foreground/80 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Mobile footer fallback */}
        <footer className="text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Cairn Household Systems. All rights
            reserved.
          </p>
        </footer>
      </section>
    </main>
  );
}
