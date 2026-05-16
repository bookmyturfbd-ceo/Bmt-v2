// Root layout — required by Next.js App Router.
// The [locale]/layout.tsx handles the full <html> shell.
// This file must exist for Next.js to resolve the app route tree correctly.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
