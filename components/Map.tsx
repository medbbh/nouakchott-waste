'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Report, CATEGORY_COLORS, ReportCategory } from '@/types';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

const NOUAKCHOTT_CENTER: [number, number] = [-15.9785, 18.0858];

interface MapProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
  onReportsUpdate: (reports: Report[]) => void;
}

function createPinElement(
  report: Report,
  onClickRef: React.MutableRefObject<(r: Report) => void>,
): HTMLElement {
  const color = CATEGORY_COLORS[report.category as ReportCategory] ?? '#f97316';
  const borderColor = report.status === 'resolved' ? '#9ca3af' : color;

  // Outer element — Mapbox sets `transform` here for positioning; we never touch it
  const outer = document.createElement('div');
  outer.style.cssText = 'cursor: pointer;';

  // Inner wrapper — safe to apply our own transforms here
  const inner = document.createElement('div');
  inner.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.15s ease;
    transform-origin: bottom center;
  `;

  // Photo frame
  const frame = document.createElement('div');
  frame.style.cssText = `
    width: 42px;
    height: 54px;
    border-radius: 9px;
    border: 2.5px solid ${borderColor};
    overflow: hidden;
    background: #d1d5db;
    box-shadow: 0 3px 8px rgba(0,0,0,0.35);
  `;

  const img = document.createElement('img');
  img.src = report.photo_url;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
  img.loading = 'lazy';
  frame.appendChild(img);

  // Pointer tail
  const tail = document.createElement('div');
  tail.style.cssText = `
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 7px solid ${borderColor};
    margin-top: -1px;
  `;

  inner.appendChild(frame);
  inner.appendChild(tail);
  outer.appendChild(inner);

  outer.addEventListener('click', (e) => {
    e.stopPropagation();
    onClickRef.current(report);
  });
  inner.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.1)'; });
  inner.addEventListener('mouseleave', () => { inner.style.transform = ''; });

  return outer;
}

export default function Map({ reports, onReportClick, onReportsUpdate }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const reportsRef = useRef<Report[]>(reports);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const onReportClickRef = useRef(onReportClick);
  const [stackedReports, setStackedReports] = useState<Report[]>([]);
  const tc = useTranslations('categories');
  const t = useTranslations('map');

  useEffect(() => { reportsRef.current = reports; }, [reports]);
  useEffect(() => { onReportClickRef.current = onReportClick; }, [onReportClick]);

  const buildGeoJSON = useCallback(
    (data: Report[]): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: data.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id, category: r.category, status: r.status },
      })),
    }),
    [],
  );

  const syncMarkers = useCallback((data: Report[], m: mapboxgl.Map) => {
    const existing = markersRef.current;
    const incomingIds = new Set(data.map((r) => r.id));

    // Remove stale
    Object.entries(existing).forEach(([id, marker]) => {
      if (!incomingIds.has(id)) { marker.remove(); delete existing[id]; }
    });

    // Add new
    data.forEach((report) => {
      if (!existing[report.id]) {
        const el = createPinElement(report, onReportClickRef);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([report.longitude, report.latitude])
          .addTo(m);
        existing[report.id] = marker;
      }
    });
  }, []);

  const updateMarkerVisibility = useCallback(() => {
    const m = map.current;
    if (!m || !m.isSourceLoaded('reports')) return;
    const unclustered = m.querySourceFeatures('reports', {
      filter: ['!', ['has', 'point_count']],
    });
    const visibleIds = new Set(unclustered.map((f) => f.properties?.id as string));
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.getElement().style.display = visibleIds.has(id) ? 'block' : 'none';
    });
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: NOUAKCHOTT_CENTER,
      zoom: 12,
      attributionControl: false,
    });

    const m = map.current;
    m.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
    m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    m.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'bottom-right',
    );

    m.on('load', () => {
      m.addSource('reports', {
        type: 'geojson',
        data: buildGeoJSON(reportsRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#f97316', 10, '#ea580c', 30, '#c2410c'],
          'circle-radius': ['step', ['get', 'point_count'], 22, 10, 30, 30, 40],
          'circle-opacity': 0.92,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
        },
      });

      // Cluster count
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
        },
        paint: { 'text-color': '#ffffff' },
      });

      // Photo markers for individual pins
      syncMarkers(reportsRef.current, m);
      m.on('render', updateMarkerVisibility);

      // Cluster click
      m.on('click', 'clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (!clusterId) return;
        (m.getSource('reports') as mapboxgl.GeoJSONSource).getClusterLeaves(
          clusterId, 20, 0,
          (err, leaves) => {
            if (err || !leaves) return;
            const ids = leaves.map((f) => f.properties?.id as string);
            setStackedReports(reportsRef.current.filter((r) => ids.includes(r.id)));
          },
        );
      });

      m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
    });

    // Realtime
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const newReport = payload.new as Report;
        const updated = [newReport, ...reportsRef.current];
        reportsRef.current = updated;
        onReportsUpdate(updated);
        (map.current?.getSource('reports') as mapboxgl.GeoJSONSource | undefined)
          ?.setData(buildGeoJSON(updated));
        if (map.current) syncMarkers(updated, map.current);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    (map.current.getSource('reports') as mapboxgl.GeoJSONSource | undefined)
      ?.setData(buildGeoJSON(reports));
    syncMarkers(reports, map.current);
  }, [reports, buildGeoJSON, syncMarkers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {stackedReports.length > 0 && (
        <div className="absolute inset-0 z-20 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setStackedReports([])} />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                {stackedReports.length} {t('reports_at_location')}
              </p>
              <button onClick={() => setStackedReports([])} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {stackedReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setStackedReports([]); onReportClick(r); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <img src={r.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{tc(r.category)}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.neighborhood ?? new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[r.category] }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
