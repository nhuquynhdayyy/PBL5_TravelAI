import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ItineraryActivity, ItineraryDay } from './itineraryTypes';
import { geocodeLocation } from '../../utils/geocoding';

type LatLngTuple = [number, number];

const DAY_COLORS = ['#0061ff', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const hasCoord = (a: { latitude?: number | null; longitude?: number | null }) =>
  typeof a.latitude === 'number' &&
  Number.isFinite(a.latitude) &&
  typeof a.longitude === 'number' &&
  Number.isFinite(a.longitude);

/** Offset duplicate coordinates slightly so markers don't stack */
const jitterDuplicates = (points: LatLngTuple[]): LatLngTuple[] => {
  const seen = new Map<string, number>();
  return points.map(([lat, lng]) => {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return [lat, lng];
    // Spiral offset: ~30m per step
    const angle = (count * 137.5 * Math.PI) / 180;
    const r = 0.0003 * Math.sqrt(count);
    return [lat + r * Math.cos(angle), lng + r * Math.sin(angle)];
  });
};

// ─── Custom marker icon ──────────────────────────────────────────────────────

const makeIcon = (label: string | number, color: string, size: number, pulse = false) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${pulse ? `<div style="
          position:absolute;inset:-6px;border-radius:50%;
          background:${color}22;animation:pulse 1.8s infinite;
        "></div>` : ''}
        <div style="
          width:${size}px;height:${size}px;
          display:flex;align-items:center;justify-content:center;
          border-radius:${size / 2.5}px;
          background:${color};
          color:#fff;font-weight:900;font-size:${size * 0.38}px;
          border:3px solid #fff;
          box-shadow:0 4px 14px ${color}66,0 2px 6px rgba(0,0,0,.25);
        ">${label}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });

// ─── Inner map controllers ───────────────────────────────────────────────────

const FitBounds = ({ points }: { points: LatLngTuple[] }) => {
  const map = useMap();
  const prevLen = useRef(0);

  useEffect(() => {
    if (points.length === 0) return;
    // Only re-fit when point count changes (new itinerary loaded)
    if (points.length === prevLen.current) return;
    prevLen.current = points.length;

    setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView(points[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
      }
    }, 120);
  }, [map, points]);

  return null;
};

const FlyTo = ({ target }: { target: LatLngTuple | null }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 1.4, easeLinearity: 0.3 });
  }, [map, target]);
  return null;
};

// ─── Main component ──────────────────────────────────────────────────────────

interface ItineraryMapProps {
  days: ItineraryDay[];
  activeDay: number;
  focusedActivity?: ItineraryActivity | null;
}

const ItineraryMap = ({ days, activeDay, focusedActivity }: ItineraryMapProps) => {
  const [enrichedDays, setEnrichedDays] = useState<ItineraryDay[]>(days);
  const [geocoding, setGeocoding] = useState(false);

  // ── Geocode activities that lack coordinates ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const needsGeo = days.some((d) =>
        d.activities.some((a) => !hasCoord(a) && a.location?.trim()),
      );

      if (!needsGeo) {
        setEnrichedDays(days);
        return;
      }

      setGeocoding(true);

      const result = await Promise.all(
        days.map(async (day) => ({
          ...day,
          activities: await Promise.all(
            day.activities.map(async (act) => {
              if (hasCoord(act) || !act.location?.trim()) return act;
              try {
                const geo = await geocodeLocation(act.location, 'vn');
                if (geo) return { ...act, latitude: geo.latitude, longitude: geo.longitude };
              } catch {
                // silently skip
              }
              return act;
            }),
          ),
        })),
      );

      if (!cancelled) {
        setEnrichedDays(result);
        setGeocoding(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [days]);

  // ── Build per-day point lists (with jitter for duplicates) ────────────────
  const daysWithPoints = useMemo(() => {
    return enrichedDays.map((day, dayIdx) => {
      const raw: LatLngTuple[] = day.activities
        .filter(hasCoord)
        .map((a) => [a.latitude as number, a.longitude as number]);

      const jittered = jitterDuplicates(raw);

      const points = day.activities
        .filter(hasCoord)
        .map((activity, i) => ({ activity, position: jittered[i] }));

      return { ...day, dayIdx, points };
    });
  }, [enrichedDays]);

  const allPoints = daysWithPoints.flatMap((d) => d.points.map((p) => p.position));

  // Default center: first point or Đà Nẵng
  const defaultCenter: LatLngTuple = allPoints[0] ?? [16.0471, 108.2068];

  const focusedPos: LatLngTuple | null = useMemo(() => {
    if (!focusedActivity || !hasCoord(focusedActivity)) return null;
    return [focusedActivity.latitude as number, focusedActivity.longitude as number];
  }, [focusedActivity]);

  return (
    <>
      {/* Pulse animation keyframe injected once */}
      <style>{`
        @keyframes pulse {
          0%,100%{transform:scale(1);opacity:.6}
          50%{transform:scale(1.5);opacity:0}
        }
        /* Fix: ensure tiles render above the grey background */
        .leaflet-tile-pane { z-index: 2 !important; }
        .leaflet-overlay-pane { z-index: 4 !important; }
        .leaflet-marker-pane { z-index: 6 !important; }
        .leaflet-popup-pane { z-index: 8 !important; }
        .leaflet-control { z-index: 10 !important; }
        /* Prevent map from overlapping navbar */
        .itinerary-map-container .leaflet-container { z-index: 1; }
        /* Dark mode tile inversion */
        .dark .leaflet-tile-pane {
          filter: brightness(0.72) contrast(1.2) hue-rotate(180deg) invert(1);
        }
        .dark .leaflet-container { background: #1e293b; }
      `}</style>

      <aside className="itinerary-map-container sticky top-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* Header */}
        <div className="border-b border-slate-100 p-5 dark:border-slate-700">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0061ff] dark:text-blue-400">
            Bản đồ lộ trình
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            Các điểm trong lịch trình
          </h2>
          <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            Marker hiển thị tất cả điểm có tọa độ; đường màu nối các điểm trong từng ngày.
          </p>
          {geocoding && (
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Đang tìm tọa độ cho các địa điểm…
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="h-[600px]">
          {allPoints.length > 0 ? (
            <MapContainer
              center={defaultCenter}
              zoom={13}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
              // Do NOT use className here — it breaks tile rendering in some setups
            >
              {/* CartoDB Positron — clean, modern, works without API key */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
                maxZoom={19}
                subdomains="abcd"
              />

              <FitBounds points={allPoints} />
              <FlyTo target={focusedPos} />

              {daysWithPoints.map(({ day, dayIdx, points }) => {
                const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
                const isActive = day === activeDay;

                return (
                  <Fragment key={day}>
                    {/* Route line */}
                    {points.length > 1 && (
                      <Polyline
                        positions={points.map((p) => p.position)}
                        pathOptions={{
                          color,
                          weight: isActive ? 5 : 2.5,
                          opacity: isActive ? 1 : 0.4,
                          dashArray: isActive ? undefined : '6 4',
                        }}
                      />
                    )}

                    {/* Markers */}
                    {points.map(({ activity, position }, idx) => {
                      const isFocused = focusedActivity?.id === activity.id;
                      const active = isActive || isFocused;
                      const size = active ? 40 : 32;

                      return (
                        <Marker
                          key={`${activity.id}-${idx}`}
                          position={position}
                          icon={makeIcon(idx + 1, active ? color : '#475569', size, isFocused)}
                          zIndexOffset={active ? 1000 : 0}
                        >
                          <Popup minWidth={200} maxWidth={280}>
                            <div style={{ fontFamily: 'inherit' }}>
                              {activity.imageUrl && (
                                <img
                                  src={activity.imageUrl}
                                  alt={activity.title}
                                  style={{
                                    width: '100%',
                                    height: 100,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    marginBottom: 8,
                                  }}
                                />
                              )}
                              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>
                                Ngày {day} · {activity.startTime}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                                {activity.title}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                                📍 {activity.location}
                              </div>
                              {activity.description && (
                                <div style={{ fontSize: 12, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                                  {activity.description.slice(0, 120)}
                                  {activity.description.length > 120 ? '…' : ''}
                                </div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </Fragment>
                );
              })}
            </MapContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-3xl dark:bg-blue-900/30">
                🗺️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {geocoding ? 'Đang tìm tọa độ…' : 'Chưa có tọa độ bản đồ'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {geocoding
                    ? 'Vui lòng chờ trong giây lát'
                    : 'Bản đồ sẽ hiện khi có dữ liệu tọa độ'}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default ItineraryMap;
