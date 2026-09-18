import Link from 'next/link';

import { CairnMark } from '@cairn/ui';

export const metadata = {
  title: 'Terms of Service — Cairn',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <CairnMark size={28} />
          <span className="font-bold tracking-tight text-foreground">
            Cairn
          </span>
        </Link>

        <h1 className="mt-10 text-3xl font-bold tracking-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: September 18, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            By creating an account or using Cairn, you agree to these Terms of
            Service. If you do not agree, please do not use Cairn.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Using Cairn
            </h2>
            <p className="mt-2">
              You must provide accurate information when creating an account and
              are responsible for maintaining the security of your account
              credentials. You agree to use Cairn only for lawful purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Your content
            </h2>
            <p className="mt-2">
              You retain ownership of the content you add to Cairn (tasks,
              notes, household data). You grant us a limited license to store
              and process that content solely to provide the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Termination
            </h2>
            <p className="mt-2">
              You may stop using Cairn and delete your account at any time. We
              may suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Disclaimer
            </h2>
            <p className="mt-2">
              Cairn is provided "as is" without warranties of any kind. We are
              not liable for any indirect or consequential damages arising from
              your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Contact us
            </h2>
            <p className="mt-2">
              Questions about these terms can be sent to{' '}
              <a
                href="mailto:selvaganapathikanakaraj2105@gmail.com"
                className="text-primary hover:underline"
              >
                selvaganapathikanakaraj2105@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
