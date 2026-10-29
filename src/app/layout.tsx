import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { PRODUCT } from '@/lib/brand';
import { Providers } from './providers';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['600', '700', '800'] });

export const metadata: Metadata = {
  title: { default: PRODUCT.name, template: `%s · ${PRODUCT.name}` },
  description: `${PRODUCT.name} — ${PRODUCT.tagline}. Attendance, leave and pay monitoring for your team.`,
  applicationName: PRODUCT.name,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F6FB' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0E17' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
