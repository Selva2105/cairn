import Link from 'next/link';

import { CairnMark } from '@cairn/ui';

import { RELEASES } from './releases';

export const metadata = {
  title: 'Changelog — Cairn',
};

export default function ChangelogPage() {
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
          Changelog
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          What's new in Cairn, release by release.
        </p>

        <div className="mt-10 space-y-12">
          {RELEASES.map((release) => (
            <article
              key={release.version}
              className="border-l-2 border-border pl-6"
            >
              <header className="flex items-baseline gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  v{release.version}
                </h2>
                <time
                  dateTime={release.date}
                  className="text-xs text-muted-foreground"
                >
                  {new Date(release.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </header>

              <div className="mt-4 space-y-4">
                {release.sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
