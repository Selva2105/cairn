import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { ThemeToggle } from '../../components/theme-toggle';
import { AuthShowcase } from '../../components/auth-showcase';
import { ForgotPasswordForm } from './forgot-password-form';

export default function ForgotPasswordPage() {
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground ring-1 ring-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight text-foreground">
              Cairn
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-primary transition-colors hover:underline underline-offset-4"
            >
              Back to log in
            </Link>
            <div className="h-4 w-px bg-border" />
            <ThemeToggle />
          </div>
        </header>

        {/* Center Content Form */}
        <div className="my-auto mx-auto w-full max-w-md py-8">
          <ForgotPasswordForm />
        </div>

        {/* Footer fallback */}
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
