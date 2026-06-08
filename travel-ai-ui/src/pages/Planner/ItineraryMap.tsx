import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import type { ItineraryActivity, ItineraryDay } from './itineraryTypes';
import { geocodeLocation } from '../../utils/geocoding';

type LatLngTuple = [number, number];

const DAY_COLORS = ['#0061ff', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isValidCoord = (lat: unknown, lng: unknown): boolean => {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    Number.isFinite(la) && Number.isFinite(lo) &&
    la !== 0 && lo !== 0 &&
    la >= -90 && la <= 90 &&
    lo >= -180 && lo <= 180
  );
};

const hasCoord = (a: { latitude?: number | null; longitude?: number | null }) =>
  isValidCoord(a.latitude, a.longitude);

/** Spiral-offset duplicate coordinates so markers don't stack */
const jitterDuplicates = (points: LatLngTuple[]): LatLngTuple[] => {
  const seen = new Map<string, number>();
  return points.map(([lat, lng]) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n === 0) return [lat, lng];
    const angle = (n * 137.5 * Math.PI) / 180;
    const r = 0.0004 * Math.sqrt(n); // ~44m per step
    return [lat + r * Math.cos(angle), lng + r * Math.sin(angle)];
  });
};

// ─── Marker icon ─────────────────────────────────────────────────────────────

const makeIcon = (label: string | number, color: string, size: number, pulse = false, bounce = false) => {
  // Ripple rings: 3 concentric waves staggered by 0.5s each
  const rippleHtml = pulse ? `
    <div style="position:absolute;inset:-14px;border-radius:50%;border:3px solid ${color};
      opacity:0;animation:itm-ripple 1.6s ease-out infinite 0s;pointer-events:none;"></div>
    <div style="position:absolute;inset:-14px;border-radius:50%;border:3px solid ${color};
      opacity:0;animation:itm-ripple 1.6s ease-out infinite 0.53s;pointer-events:none;"></div>
    <div style="position:absolute;inset:-14px;border-radius:50%;border:3px solid ${color};
      opacity:0;animation:itm-ripple 1.6s ease-out infinite 1.06s;pointer-events:none;"></div>
    <div style="position:absolute;inset:-6px;border-radius:50%;
      background:${color}28;animation:itm-pulse 1.6s ease-out infinite;pointer-events:none;"></div>
  ` : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;${bounce ? 'animation:itm-bounce 0.6s ease-out 2;' : ''}">
      ${rippleHtml}
      <div style="width:${size}px;height:${size}px;display:flex;align-items:center;
        justify-content:center;border-radius:${Math.round(size / 2.6)}px;
        background:${color};color:#fff;font-weight:900;font-size:${Math.round(size * 0.38)}px;
        border:${pulse ? '4px' : '3px'} solid #fff;
        box-shadow:0 4px 16px ${color}66,0 2px 4px rgba(0,0,0,.2);
        transform:${pulse ? 'scale(1.18)' : 'scale(1)'};
        transition:transform 0.25s ease,box-shadow 0.25s ease;">
        ${label}
      </div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
};

// ─── Map controllers (must be children of MapContainer) ──────────────────────

/**
 * Re-fits bounds every time `points` array reference changes.
 * Uses a stable key derived from actual coordinates so it fires
 * even when the count stays the same (e.g. Hà Nội 5 pts → Đà Nẵng 5 pts).
 */
const FitBounds = ({ points }: { points: LatLngTuple[] }) => {
  const map = useMap();
  // Build a string key from actual coordinates — changes whenever coords change
  const coordKey = points.map((p) => p.join(',')).join('|');
  const prevKey = useRef('');

  useEffect(() => {
    if (points.length === 0) return;
    if (coordKey === prevKey.current) return;
    prevKey.current = coordKey;

    const apply = () => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView(points[0], 15);
      } else {
        try {
          const bounds = L.latLngBounds(points);
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [52, 52], maxZoom: 15, animate: true });
          }
        } catch {
          map.setView(points[0], 13);
        }
      }
    };

    // Small delay to let the container finish rendering
    const t = setTimeout(apply, 150);
    return () => clearTimeout(t);
  }, [map, coordKey, points]);

  return null;
};

const FlyTo = ({ target }: { target: LatLngTuple | null }) => {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (!target) return;
    const key = target.join(',');
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo(target, 16, { duration: 1.3, easeLinearity: 0.3 });
  }, [map, target]);
  return null;
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  days: ItineraryDay[];
  activeDay: number;
  focusedActivity?: ItineraryActivity | null;
}

const ItineraryMap = ({ days, activeDay, focusedActivity }: Props) => {
  const [enrichedDays, setEnrichedDays] = useState<ItineraryDay[]>(days);
  const [geocoding, setGeocoding] = useState(false);

  // ── Geocode whenever `days` changes ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setGeocoding(false);

    const run = async () => {
      // First pass: use whatever coords backend already gave us
      setEnrichedDays(days);

      console.log('🗺️ Map received days:', days.map(d => ({
        day: d.day,
        activities: d.activities.map(a => ({
          title: a.title,
          hasCoords: hasCoord(a),
          lat: a.latitude,
          lng: a.longitude
        }))
      })));

      // Check if any activity is missing valid coords
      const needsGeo = days.some((d) =>
        d.activities.some((a) => !hasCoord(a) && a.location?.trim()),
      );
      
      if (!needsGeo) {
        console.log('✅ All activities have coordinates');
        return;
      }

      console.log('🔍 Some activities missing coords, starting geocoding...');
      setGeocoding(true);

      // Geocode in parallel batches of 3 to respect Nominatim rate limit
      const enriched = await Promise.all(
        days.map(async (day) => ({
          ...day,
          activities: await Promise.all(
            day.activities.map(async (act) => {
              if (hasCoord(act)) return act;
              if (!act.location?.trim()) return act;
              
              console.log(`🔍 Geocoding: ${act.title} at ${act.location}`);
              try {
                // Try with full location string first, then just the name
                const geo =
                  (await geocodeLocation(act.location, 'vn')) ??
                  (await geocodeLocation(act.title, 'vn'));
                if (geo && isValidCoord(geo.latitude, geo.longitude)) {
                  console.log(`✅ Found coords for ${act.title}: ${geo.latitude}, ${geo.longitude}`);
                  return { ...act, latitude: geo.latitude, longitude: geo.longitude };
                }
                console.log(`❌ No coords found for ${act.title}`);
              } catch (err) {
                console.error(`❌ Geocoding error for ${act.title}:`, err);
              }
              return act;
            }),
          ),
        })),
      );

      if (!cancelled) {
        setEnrichedDays(enriched);
        setGeocoding(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [days]);

  // ── Build point lists ───────────────────────────────────────────────────────
  const daysWithPoints = useMemo(() => {
    return enrichedDays.map((day, dayIdx) => {
      const validActivities = day.activities.filter(hasCoord);
      const rawPositions: LatLngTuple[] = validActivities.map((a) => [
        a.latitude as number,
        a.longitude as number,
      ]);
      const jittered = jitterDuplicates(rawPositions);
      const points = validActivities.map((activity, i) => ({
        activity,
        position: jittered[i],
      }));
      return { day: day.day, dayIdx, points };
    });
  }, [enrichedDays]);

  const allPoints = useMemo(
    () => daysWithPoints.flatMap((d) => d.points.map((p) => p.position)),
    [daysWithPoints],
  );

  // Stable initial center — will be overridden by FitBounds immediately
  const initCenter: LatLngTuple = allPoints[0] ?? [16.0471, 108.2068];

  const focusedPos: LatLngTuple | null = useMemo(() => {
    if (!focusedActivity || !hasCoord(focusedActivity)) return null;
    return [focusedActivity.latitude as number, focusedActivity.longitude as number];
  }, [focusedActivity]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes itm-pulse {
          0%   { transform: scale(1);   opacity: .45 }
          100% { transform: scale(2.4); opacity: 0  }
        }
        @keyframes itm-ripple {
          0%   { transform: scale(0.6); opacity: 0.9 }
          70%  { transform: scale(2.2); opacity: 0.15 }
          100% { transform: scale(2.6); opacity: 0 }
        }
        @keyframes itm-bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-5px); }
        }
        /* Ensure tiles always render above the grey canvas */
        .itm-map .leaflet-tile-pane    { z-index: 2 !important; }
        .itm-map .leaflet-overlay-pane { z-index: 4 !important; }
        .itm-map .leaflet-marker-pane  { z-index: 6 !important; }
        .itm-map .leaflet-popup-pane   { z-index: 8 !important; }
        .itm-map .leaflet-control      { z-index: 10 !important; }
        /* Dark mode: invert tiles */
        .dark .itm-map .leaflet-tile-pane {
          filter: brightness(.72) contrast(1.2) hue-rotate(180deg) invert(1);
        }
        .dark .itm-map .leaflet-container { background: #1e293b; }
        /* Dark mode controls */
        .dark .itm-map .leaflet-control-zoom a {
          background: #1e293b; color: #e2e8f0; border-color: #334155;
        }
        .dark .itm-map .leaflet-popup-content-wrapper {
          background: #1e293b; color: #e2e8f0; border-radius: 10px;
        }
        .dark .itm-map .leaflet-popup-tip { background: #1e293b; }
      `}</style>

      <aside className="h-full overflow-hidden rounded-3xl bg-white dark:bg-slate-800">
        {/* Map */}
        <div className="itm-map h-full">
          {allPoints.length > 0 ? (
            <MapContainer
              center={initCenter}
              zoom={13}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />

              {/* Re-fits every time coordinates actually change */}
              <FitBounds points={allPoints} />
              <FlyTo target={focusedPos} />

              {daysWithPoints.map(({ day, dayIdx, points }) => {
                const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
                const isActive = day === activeDay;

                return (
                  <Fragment key={day}>
                    {points.length > 1 && (
                      <Polyline
                        positions={points.map((p) => p.position)}
                        pathOptions={{
                          color,
                          weight: isActive ? 5 : 2.5,
                          opacity: isActive ? 1 : 0.4,
                          dashArray: isActive ? undefined : '7 5',
                        }}
                      />
                    )}

                    {points.map(({ activity, position }, idx) => {
                      const isFocused = focusedActivity?.id === activity.id;
                      const active = isActive || isFocused;
                      const size = active ? 40 : 32;

                      return (
                        <Marker
                          key={`${activity.id}-${idx}`}
                          position={position}
                          icon={makeIcon(idx + 1, active ? color : '#64748b', size, isFocused, isFocused)}
                          zIndexOffset={active ? 1000 : 0}
                        >
                          <Popup minWidth={200} maxWidth={280}>
                            <div style={{ fontFamily: 'system-ui, sans-serif' }}>
                              {activity.imageUrl && (
                                <img
                                  src={activity.imageUrl}
                                  alt={activity.title}
                                  style={{
                                    width: '100%', height: 96,
                                    objectFit: 'cover', borderRadius: 8, marginBottom: 8,
                                  }}
                                />
                              )}
                              <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 3 }}>
                                Ngày {day} · {activity.startTime}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                                {activity.title}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 5 }}>
                                📍 {activity.location}
                              </div>
                              {activity.description && (
                                <div style={{ fontSize: 12, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                                  {activity.description.slice(0, 110)}
                                  {activity.description.length > 110 ? '…' : ''}
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
            /* Beautiful mock map / skeleton loading placeholder */
            <div className="relative h-full w-full bg-slate-50 dark:bg-slate-900/40 overflow-hidden flex flex-col items-center justify-center">
              {/* Map Grid / Grid Lines as background */}
              <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
              
              {/* Abstract Map Roads / Paths */}
              <svg className="absolute inset-0 w-full h-full text-slate-200 dark:text-slate-800 opacity-60 dark:opacity-40" xmlns="http://www.w3.org/2000/svg">
                <path d="M-50,150 Q100,50 250,200 T600,100" fill="none" stroke="currentColor" strokeWidth="4" />
                <path d="M50,-50 Q200,300 150,500 T300,700" fill="none" stroke="currentColor" strokeWidth="3" />
                <path d="M-10,350 C300,350 400,200 700,450" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                <circle cx="250" cy="200" r="6" fill="#3b82f6" className="animate-pulse" />
                <circle cx="150" cy="380" r="6" fill="#10b981" />
              </svg>

              {geocoding ? (
                <div className="z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-[280px] text-center animate-pulse">
                  <div className="mx-auto w-12 h-12 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-3">
                    <MapPin className="animate-bounce" size={24} />
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto mb-3"></div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Đang định vị tọa độ...</p>
                </div>
              ) : (
                <div className="z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-[320px] text-center mx-4">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3.5">
                    <MapPin size={28} />
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-1.5">Chưa có tọa độ bản đồ</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Bản đồ tương tác sẽ tự động hiển thị lộ trình ngay khi các địa điểm được định vị thành công.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default ItineraryMap;
