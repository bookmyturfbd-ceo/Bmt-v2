import { notFound } from 'next/navigation';
import TurfHero from '@/components/turf/TurfHero';
import TurfInfo from '@/components/turf/TurfInfo';
import TurfBookingClient from '@/components/turf/TurfBookingClient';
import TurfLocationReviews from '@/components/turf/TurfLocationReviews';
import CoachProfileView from '@/components/turf/CoachProfileView';
import prisma from '@/lib/prisma';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ groupId?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const turf = await prisma.turf.findFirst({
    where: { id: resolvedParams.id, status: 'published' },
    include: { city: true }
  });

  if (!turf) {
    return { title: 'Turf Not Found' };
  }

  const title = turf.name;
  const description = `Book ${turf.name} located in ${turf.area ? turf.area + ', ' : ''}${turf.city?.name || 'Bangladesh'}. Play futsal and cricket on the best fields.`;
  const images = turf.imageUrls && turf.imageUrls.length > 0 ? turf.imageUrls : ['/bmt-logo.png'];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: images.map((url: string) => ({ url })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    }
  };
}

export default async function TurfDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const { groupId } = await searchParams;
  
  const rawTurf = await prisma.turf.findFirst({
    where: { id: resolvedParams.id, status: 'published' },
    include: {
      city: true,
      sports: { include: { sport: true } },
      amenities: { include: { amenity: true } },
      grounds: { include: { slots: true } },
    }
  });
  
  if (!rawTurf) notFound();

  const [turfSlots, turfReviews] = await Promise.all([
    prisma.slot.findMany({ where: { turfId: rawTurf.id } }),
    prisma.review.findMany({ where: { turfId: rawTurf.id } })
  ]);

  const city = rawTurf.city;
  const grounds = rawTurf.grounds;
  const amenitiesList = rawTurf.amenities.map((ta: any) => ta.amenity.name);

  // Sports: 1st from TurfSport join table (admin set), 2nd auto-derive from slot sports names
  let uniqueSports: string[] = rawTurf.sports.map((ts: any) => ts.sport.name);
  if (uniqueSports.length === 0) {
    const slotSportNames = new Set<string>();
    rawTurf.grounds.forEach((g: any) =>
      g.slots?.forEach((s: any) =>
        s.sports?.forEach((n: string) => slotSportNames.add(n))
      )
    );
    uniqueSports = [...slotSportNames];
  }

  const averageRating = turfReviews.length > 0 
      ? (turfReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / turfReviews.length).toFixed(1)
      : '5.0';

  const bookings = await prisma.booking.findMany({
    where: { slotId: { in: turfSlots.map((s: any) => s.id) } }
  });

  // Render Coach View if it is a Coach Profile
  if (rawTurf.isCoachProfile) {
    const pro = {
      id: rawTurf.id,
      name: rawTurf.name,
      sportsList: uniqueSports,
      address: `${city?.name || 'Local Area'}${rawTurf.area ? `, ${rawTurf.area}` : ''}`,
      rating: Number(averageRating),
      reviewCount: turfReviews.length,
      images: rawTurf.imageUrls && rawTurf.imageUrls.length > 0 ? rawTurf.imageUrls : [],
      logoUrl: rawTurf.logoUrl || undefined,
      amenities: amenitiesList,
      rules: rawTurf.rules || '',
      lat: rawTurf.lat || undefined,
      lng: rawTurf.lng || undefined,
      mapLink: rawTurf.mapLink || undefined,
      coachType: rawTurf.coachType || 'Professional',
    };

    return (
      <CoachProfileView
        pro={pro}
        slots={turfSlots}
        bookings={bookings}
        grounds={grounds}
        reviews={turfReviews}
      />
    );
  }

  const turf = {
    id: rawTurf.id,
    name: rawTurf.name,
    sportsList: uniqueSports,   // show actual connected sports; empty = no badge shown
    address: `${city?.name || 'Local Area'}${rawTurf.area ? `, ${rawTurf.area}` : ''}`,
    price: 0, 
    rating: Number(averageRating),
    reviewCount: turfReviews.length,
    images: rawTurf.imageUrls && rawTurf.imageUrls.length > 0 ? rawTurf.imageUrls : [],
    logoUrl: rawTurf.logoUrl,
    amenities: amenitiesList,
    rules: '',
    lat: rawTurf.lat || 23.8103, // default map fallback
    lng: rawTurf.lng || 90.4125,
    mapLink: rawTurf.mapLink
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-36 selection:bg-accent/30 selection:text-accent">
      <div className="w-full max-w-md mx-auto relative flex flex-col">
        <TurfHero turf={turf} />
        <div className="w-full h-8 bg-background -mt-7 rounded-t-[32px] relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]" />
        <div className="relative z-20 bg-background -mt-4">
            <TurfInfo turf={turf} />
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />
            <TurfBookingClient
              turfId={rawTurf.id}
              turfName={rawTurf.name}
              area={rawTurf.area ?? undefined}
              cityName={city?.name ?? undefined}
              slots={turfSlots}
              bookings={bookings}
              grounds={grounds}
              sports={uniqueSports}
              groupId={groupId}
            />
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />
            <TurfLocationReviews turf={turf} reviews={turfReviews} />
        </div>
      </div>
    </div>
  );
}
