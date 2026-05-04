'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface NurseryMapProps {
  address?: string;
  town?: string;
  city?: string;
  postcode?: string;
  name: string;
}

interface Coords {
  lat: number;
  lng: number;
}

export default function NurseryMap({ address, town, city, postcode, name }: NurseryMapProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Build the most complete address string possible
  const fullAddress = [address, town, city, postcode].filter(Boolean).join(', ');

  useEffect(() => {
    if (!fullAddress) {
      setFailed(true);
      setLoading(false);
      return;
    }

    const geocode = async () => {
      try {
        const query = encodeURIComponent(fullAddress);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=gb`,
          { headers: { 'User-Agent': 'MyNursery/1.0 (help@my-nursery.co.uk)' } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          // Fall back to city/postcode only
          const fallbackQuery = encodeURIComponent([city, postcode].filter(Boolean).join(', ') || city || postcode || '');
          if (!fallbackQuery) { setFailed(true); return; }
          const res2 = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${fallbackQuery}&format=json&limit=1&countrycodes=gb`,
            { headers: { 'User-Agent': 'MyNursery/1.0 (help@my-nursery.co.uk)' } }
          );
          const data2 = await res2.json();
          if (Array.isArray(data2) && data2.length > 0) {
            setCoords({ lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) });
          } else {
            setFailed(true);
          }
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };

    geocode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress]);

  if (loading) {
    return (
      <div className="w-full h-64 rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-secondary rounded-full animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    );
  }

  if (failed || !coords) {
    return (
      <div className="w-full h-64 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
        <MapPin className="w-8 h-8" />
        <p className="text-sm">Map unavailable for this location</p>
        {fullAddress && (
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-secondary hover:underline"
          >
            Search on OpenStreetMap →
          </a>
        )}
      </div>
    );
  }

  // Bounding box: ±0.008 degrees (~800m) around the pin
  const delta = 0.008;
  const bbox = `${coords.lng - delta},${coords.lat - delta},${coords.lng + delta},${coords.lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat},${coords.lng}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <iframe
        title={`Map for ${name}`}
        src={src}
        width="100%"
        height="320"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="bg-white px-3 py-2 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 text-secondary" />
          <span className="truncate max-w-xs">{fullAddress}</span>
        </div>
        <a
          href={osmLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-secondary hover:underline whitespace-nowrap ml-2"
        >
          View larger map
        </a>
      </div>
    </div>
  );
}
