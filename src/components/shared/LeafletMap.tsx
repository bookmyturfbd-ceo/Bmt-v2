'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default Leaflet marker icons in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function LeafletMap({ lat, lng, name }: { lat: number; lng: number; name?: string }) {
  useEffect(() => {
    // Ensuring global leaflet css doesn't overwrite map z-index over our modals
    const mapElement = document.querySelector('.leaflet-container');
    if (mapElement) {
      (mapElement as HTMLElement).style.zIndex = '10';
      (mapElement as HTMLElement).style.borderRadius = '1.5rem';
    }
  }, []);

  return (
    <MapContainer 
      center={[lat, lng]} 
      zoom={14} 
      scrollWheelZoom={false}
      style={{ height: '250px', width: '100%', borderRadius: '1.5rem', zIndex: 10 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={customIcon}>
        <Popup>
          <div className="font-bold">{name || 'Turf Location'}</div>
          <p className="text-xs text-neutral-500 m-0">Exact mapping data</p>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
