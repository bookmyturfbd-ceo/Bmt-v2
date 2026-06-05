import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import Navbar from '@/components/layout/Navbar';
import MadeInBangladesh from '@/components/layout/MadeInBangladesh';
import BottomNav from '@/components/layout/BottomNav';
import CartDrawer from '@/components/shop/CartDrawer';
import Signature from '@/components/layout/Signature';
import NextTopLoader from 'nextjs-toploader';
import SplashScreen from '@/components/layout/SplashScreen';
import { MatchResultProvider } from '@/context/MatchResultContext';
import MatchResultModal from '@/components/match/MatchResultModal';
import LanguagePromptModal from '@/components/layout/LanguagePromptModal';
import '../globals.css';
import { Metadata, Viewport } from 'next';
import Script from 'next/script';
import MetaTracker from '@/components/shop/MetaTracker';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00ff41',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bookmyturfbd.com'),
  title: {
    template: '%s | Book My Turf BD',
    default: 'Book My Turf BD - Premier Sports Venue Booking',
  },
  description: 'Book the best futsal and cricket turfs in Bangladesh. Organize matches, challenge teams, and keep live scores on Book My Turf BD.',
  keywords: ['Turf Booking', 'Futsal', 'Cricket', 'Bangladesh', 'Sports Venue', 'Book My Turf BD'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BMT',
    startupImage: '/favicon.png',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: [{ url: '/favicon.png', sizes: '1024x1024' }],
  },
  openGraph: {
    title: 'Book My Turf BD - Premier Sports Venue Booking',
    description: 'Book the best futsal and cricket turfs in Bangladesh. Organize matches, challenge teams, and keep live scores.',
    url: 'https://bookmyturfbd.com',
    siteName: 'Book My Turf BD',
    images: [
      {
        url: '/bmt-logo.png',
        width: 800,
        height: 600,
        alt: 'Book My Turf BD Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Book My Turf BD - Premier Sports Venue Booking',
    description: 'Book the best futsal and cricket turfs in Bangladesh.',
    images: ['/bmt-logo.png'],
  },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const resolvedParams = await params;
  const { locale } = resolvedParams;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="dark antialiased" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        {/* Meta Pixel Code */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <>
            <Script id="meta-pixel-init" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
        {/* Google Tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-782RVX0TV4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-782RVX0TV4');
          `}
        </Script>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              });
            }
          `}
        </Script>
        <NextTopLoader color="#00FF41" height={3} showSpinner={false} />
        <SplashScreen />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <MatchResultProvider>
              <MatchResultModal />
              <LanguagePromptModal />
              <MadeInBangladesh />
              <MetaTracker />
              <main className="flex-1 flex flex-col relative pb-16">
                {children}
                <Signature />
                <BottomNav />
                <CartDrawer />
              </main>
            </MatchResultProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
