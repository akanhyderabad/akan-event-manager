import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { PWAInit } from '@/components/PWAInit';
import { RefCapture } from '@/components/RefCapture';
import { MetaPixelCapture } from '@/components/MetaPixelCapture';

const GTM_ID = 'GTM-KMBTTWVT';
const GTM_INLINE = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

export const metadata: Metadata = {
  title: {
    default: 'Akan Events',
    template: '%s · Akan Events',
  },
  description:
    'Live event reservations, bookings, and guest access for Akan Hyderabad.',
  applicationName: 'Akan Events',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EventCover',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#C1551A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-ec-path') || '';
  const shouldInjectGtm = !pathname.startsWith('/admin');

  return (
    <html lang="en">
      <head>
        {shouldInjectGtm ? (
          <script dangerouslySetInnerHTML={{ __html: GTM_INLINE }} />
        ) : null}
      </head>
      <body>
        {shouldInjectGtm ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}
        {children}
        <PWAInit />
        <RefCapture />
        <MetaPixelCapture />
      </body>
    </html>
  );
}
