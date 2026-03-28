'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Report, CATEGORY_COLORS } from '@/types';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

const NOUAKCHOTT_CENTER: [number, number] = [-15.9785, 18.0858];
const DOT_SIZE = 80;

interface MapProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
  onReportsUpdate: (reports: Report[]) => void;
}

/** Creates a pulsing hotspot image for a given hex color */
function createPulsingDot(map: mapboxgl.Map, color: string, imageId: string) {
  const size = DOT_SIZE;

  const dot = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    context: null as CanvasRenderingContext2D | null,

    onAdd() {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      this.context = canvas.getContext('2d');
    },

    render() {
      const duration = 1800;
      const t = (performance.now() % duration) / duration;
      const ctx = this.context!;
      const cx = size / 2;
      const cy = size / 2;
      const innerR = size * 0.15;
      const maxOuter = size * 0.42;

      // Parse hex to rgb
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      ctx.clearRect(0, 0, size, size);

      // Outer pulse ring
      const outerR = innerR + (maxOuter - innerR) * t;
      const alpha = (1 - t) * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();

      // Mid ring
      const midR = innerR + (maxOuter - innerR) * t * 0.5;
      const midAlpha = (1 - t) * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, midR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${midAlpha})`;
      ctx.fill();

      // Inner solid dot
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},1)`;
      ctx.fill();

      // White border
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      this.data = new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer);
      map.triggerRepaint();
      return true;
    },
  };

  map.addImage(imageId, dot as unknown as mapboxgl.StyleImageInterface, { pixelRatio: 2 });
}

export default function Map({ reports, onReportClick, onReportsUpdate }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const reportsRef = useRef<Report[]>(reports);
  const [stackedReports, setStackedReports] = useState<Report[]>([]);
  const tc = useTranslations('categories');
  const t = useTranslations('map');

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  const buildGeoJSON = useCallback(
    (data: Report[]): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: data.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        properties: {
          id: r.id,
          category: r.category,
          status: r.status,
          upvotes: r.upvotes,
          icon: `hotspot-${r.category}`,
        },
      })),
    }),
    [],
  );

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

    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

    const m = map.current;

    m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    m.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'bottom-right',
    );

    m.on('load', () => {
      // Register one pulsing dot image per category
      Object.entries(CATEGORY_COLORS).forEach(([category, color]) => {
        createPulsingDot(m, color, `hotspot-${category}`);
      });

      // GeoJSON source with clustering
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
          'circle-color': [
            'step', ['get', 'point_count'],
            '#f97316', 10, '#ea580c', 30, '#c2410c',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 22, 10, 30, 30, 40],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.6)',
        },
      });

      // Cluster count labels
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

      // Individual pulsing hotspot pins
      m.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1,
          'icon-allow-overlap': true,
        },
      });

      // Cluster click → zoom in, or show picker if already at max zoom
      m.on('click', 'clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const feature = features[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id;
        const source = m.getSource('reports') as mapboxgl.GeoJSONSource;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        // Always show picker — no zoom confusion on mobile
        source.getClusterLeaves(clusterId, 20, 0, (err, leaves) => {
          if (err || !leaves) return;
          const ids = leaves.map((f) => f.properties?.id as string);
          const stacked = reportsRef.current.filter((r) => ids.includes(r.id));
          setStackedReports(stacked);
        });
      });

      // Pin click → open detail modal
      m.on('click', 'unclustered-point', (e) => {
        const props = e.features?.[0]?.properties;
        if (!props?.id) return;
        const report = reportsRef.current.find((r) => r.id === props.id);
        if (report) onReportClick(report);
      });

      m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseenter', 'unclustered-point', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'unclustered-point', () => { m.getCanvas().style.cursor = ''; });
    });

    // Realtime subscription
    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          const newReport = payload.new as Report;
          const updated = [newReport, ...reportsRef.current];
          reportsRef.current = updated;
          onReportsUpdate(updated);
          const source = map.current?.getSource('reports') as mapboxgl.GeoJSONSource | undefined;
          source?.setData(buildGeoJSON(updated));
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    const source = map.current.getSource('reports') as mapboxgl.GeoJSONSource | undefined;
    source?.setData(buildGeoJSON(reports));
  }, [reports, buildGeoJSON]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {stackedReports.length > 0 && (
        <div className="absolute inset-0 z-20 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setStackedReports([])}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                {stackedReports.length} {t('reports_at_location')}
              </p>
              <button
                onClick={() => setStackedReports([])}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {stackedReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setStackedReports([]); onReportClick(r); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <img
                    src={r.photo_url}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{tc(r.category)}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.neighborhood ?? new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[r.category] }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
