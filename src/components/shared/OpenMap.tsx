'use client';

import dynamic from 'next/dynamic';

// Dynamically import the actual map component to avoid SSR 'window is not defined' errors
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[250px] bg-neutral-900 rounded-3xl animate-pulse flex items-center justify-center">
      <p className="text-xs text-neutral-500 font-bold tracking-widest uppercase">Loading Map Graphics...</p>
    </div>
  ),
});

export default function OpenMap({
  lat = 23.8103,
  lng = 90.4125,
  name,
}: {
  lat?: number;
  lng?: number;
  name?: string;
}) {
  return <LeafletMap lat={lat} lng={lng} name={name} />;
}
