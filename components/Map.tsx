'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Report, CATEGORY_COLORS } from '@/types';
import { supabase } from '@/lib/supabase';

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

      // Cluster click → zoom in
      m.on('click', 'clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (!clusterId) return;
        (m.getSource('reports') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
            m.easeTo({ center: coords, zoom: zoom ?? 14 });
          },
        );
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

  return <div ref={mapContainer} className="w-full h-full" />;
}
