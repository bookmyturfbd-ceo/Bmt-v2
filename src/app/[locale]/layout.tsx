import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';
import CartDrawer from '@/components/shop/CartDrawer';
import NextTopLoader from 'nextjs-toploader';
import SplashScreen from '@/components/layout/SplashScreen';
import '../globals.css';

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
        <NextTopLoader color="#00FF41" height={3} showSpinner={false} />
        <SplashScreen />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <main className="flex-1 flex flex-col relative pb-16">
              {children}
              <BottomNav />
              <CartDrawer />
            </main>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
