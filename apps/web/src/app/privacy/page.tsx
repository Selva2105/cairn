import Link from 'next/link';

import { CairnMark } from '@cairn/ui';

export const metadata = {
  title: 'Privacy Policy — Cairn',
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: September 18, 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            Cairn ("we", "our", "us") provides household management software.
            This policy explains what information we collect, how we use it, and
            the choices you have.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Information we collect
            </h2>
            <p className="mt-2">
              When you create an account, we collect your name, email address,
              and any information you choose to add to your household (such as
              tasks, notes, or shared items). If you sign in with Google, we
              receive your name, email address, and profile picture from Google
              as permitted by your consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              How we use your information
            </h2>
            <p className="mt-2">
              We use your information to operate your account, provide the
              features of Cairn, and communicate with you about your account. We
              do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Data sharing
            </h2>
            <p className="mt-2">
              We share information only with service providers who help us
              operate Cairn (such as hosting and authentication providers), and
              only to the extent necessary to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Data retention and deletion
            </h2>
            <p className="mt-2">
              We retain your information for as long as your account is active.
              You may request deletion of your account and associated data at
              any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Contact us
            </h2>
            <p className="mt-2">
              If you have questions about this policy, contact us at{' '}
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
