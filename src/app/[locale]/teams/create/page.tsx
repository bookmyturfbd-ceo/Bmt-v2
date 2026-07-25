import { redirect } from 'next/navigation';

export default async function CreateTeamRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/teams?create=true`);
}
