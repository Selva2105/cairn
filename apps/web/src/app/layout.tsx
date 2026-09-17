import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { AmbientAurora } from '../components/ambient-aurora';
import { Providers } from '../lib/providers';
import { RegisterServiceWorker } from '../lib/register-service-worker';
import './global.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Cairn',
  description: 'Household operations platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cairn',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#BD5B2C',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans relative min-h-screen overflow-x-hidden">
        <Providers>
          <AmbientAurora />
          {children}
        </Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
