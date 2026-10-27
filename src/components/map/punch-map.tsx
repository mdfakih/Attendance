'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';

export interface MapSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  direction: string;
  at: string | null;
}

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; OpenStreetMap contributors';
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

function FitBounds({ sites, points }: { sites: MapSite[]; points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = [...sites.map((s) => [s.lat, s.lng] as [number, number]), ...points.map((p) => [p.lat, p.lng] as [number, number])];
    if (coords.length === 0) return;
    map.fitBounds(L.latLngBounds(coords).pad(0.3), { maxZoom: 16 });
  }, [map, sites, points]);
  return null;
}

interface PunchMapProps {
  readonly sites: MapSite[];
  readonly points?: MapPoint[];
  readonly height?: number | string;
  readonly onClick?: (lat: number, lng: number) => void;
}

function ClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onClick(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, onClick]);
  return null;
}

/** Leaflet map with geofence circles and punch points. Must be loaded with `next/dynamic` (no SSR). */
export default function PunchMap({ sites, points = [], height = 520, onClick }: PunchMapProps) {
  return (
    <div style={{ height }}>
      <MapContainer center={sites[0] ? [sites[0].lat, sites[0].lng] : INDIA_CENTER} zoom={sites[0] ? 15 : 5} scrollWheelZoom style={{ height: '100%' }}>
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <FitBounds sites={sites} points={points} />
        {onClick && <ClickCapture onClick={onClick} />}
        {sites.map((s) => (
          <Circle key={s.id} center={[s.lat, s.lng]} radius={s.radiusM} pathOptions={{ color: '#1f5eff', fillOpacity: 0.08 }}>
            <Tooltip permanent direction="top">{s.name}</Tooltip>
          </Circle>
        ))}
        {points.map((p) => (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: p.direction === 'IN' ? '#0f9d8a' : '#e8590c', fillOpacity: 0.9 }}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {p.direction} · {p.at ? new Date(p.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
