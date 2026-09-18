export type Release = {
  version: string;
  date: string;
  sections: {
    title: string;
    items: string[];
  }[];
};

// Kept in sync with the root CHANGELOG.md by hand -- see that file for the
// full Conventional-Commits-derived history.
export const RELEASES: Release[] = [
  {
    version: '0.1.0',
    date: '2026-09-18',
    sections: [
      {
        title: 'Added',
        items: [
          'Household management: tasks, documents, and automation rules dashboards.',
          'Email and Google Calendar connectors that detect bills and maintenance events automatically.',
          'WhatsApp channel for notifications and manual entry commands.',
          'OCR receipt scanning for on-demand bill capture.',
          'Native email/password auth plus Google sign-in, with household invites.',
          'Public privacy policy, terms of service, and changelog pages.',
        ],
      },
      {
        title: 'Fixed',
        items: [
          'Household invite and task permissions now check actual per-household membership instead of a stale role claim.',
          'Production Docker images for the API, worker, and bot now build correctly.',
          'Google sign-in no longer loses the session after redirecting back from Google.',
          'Production cookies are now configured correctly for cross-site sign-in.',
        ],
      },
    ],
  },
];
