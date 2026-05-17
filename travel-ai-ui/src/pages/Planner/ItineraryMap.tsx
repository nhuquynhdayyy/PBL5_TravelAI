import { Fragment, useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ItineraryDay } from './itineraryTypes';

type LatLngTuple = [number, number];

const routeColors = ['#0061ff', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];

const hasCoordinate = (activity: { latitude?: number | null; longitude?: number | null }) =>
  typeof activity.latitude === 'number' &&
  Number.isFinite(activity.latitude) &&
  typeof activity.longitude === 'number' &&
  Number.isFinite(activity.longitude);

const activityIcon = (day: number, active: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:${active ? 38 : 32}px;
      height:${active ? 38 : 32}px;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:14px;
      background:${active ? '#0061ff' : '#0f172a'};
      color:white;
      font-weight:900;
      border:3px solid white;
      box-shadow:0 14px 28px rgba(15,23,42,.25);
    ">${day}</div>`,
    iconSize: active ? [38, 38] : [32, 32],
    iconAnchor: active ? [19, 19] : [16, 16],
  });

const MapBounds = ({ points }: { points: LatLngTuple[] }) => {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 80);

    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }

    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 13 });
    }
  }, [map, points]);

  return null;
};

const ItineraryMap = ({ days, activeDay }: { days: ItineraryDay[]; activeDay: number }) => {
  const daysWithPoints = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        points: day.activities
          .filter(hasCoordinate)
          .map((activity) => ({
            activity,
            position: [activity.latitude as number, activity.longitude as number] as LatLngTuple,
          })),
      })),
    [days],
  );

  const allPoints = daysWithPoints.flatMap((day) => day.points.map((point) => point.position));
  const center: LatLngTuple = allPoints[0] || [16.0471, 108.2068];

  return (
    <aside className="sticky top-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0061ff]">Bản đồ lộ trình</p>
        <h2 className="mt-1 text-2xl font-black text-slate-900">Các điểm trong lịch trình</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Marker hiển thị tất cả điểm có tọa độ; đường màu nối các điểm trong từng ngày.
        </p>
      </div>

      <div className="h-[640px] bg-slate-100">
        {allPoints.length > 0 ? (
          <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBounds points={allPoints} />

            {daysWithPoints.map((day, dayIndex) => (
              <Fragment key={day.day}>
                {day.points.length > 1 && (
                  <Polyline
                    positions={day.points.map((point) => point.position)}
                    pathOptions={{
                      color: routeColors[dayIndex % routeColors.length],
                      weight: activeDay === day.day ? 5 : 3,
                      opacity: activeDay === day.day ? 0.9 : 0.45,
                    }}
                  />
                )}

                {day.points.map(({ activity, position }, index) => (
                  <Marker
                    key={`${activity.id}-${index}`}
                    position={position}
                    icon={activityIcon(day.day, activeDay === day.day)}
                  >
                    <Popup>
                      <div className="min-w-44">
                        <p className="mb-1 text-xs font-bold text-blue-600">Ngày {day.day} · {activity.startTime}</p>
                        <strong>{activity.title}</strong>
                        <p className="mt-1 text-xs text-slate-500">{activity.location}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {day.points.map(({ position }, index) => (
                  <CircleMarker
                    key={`circle-${day.day}-${index}`}
                    center={position}
                    radius={activeDay === day.day ? 8 : 5}
                    pathOptions={{
                      color: routeColors[dayIndex % routeColors.length],
                      fillColor: routeColors[dayIndex % routeColors.length],
                      fillOpacity: 0.2,
                    }}
                  />
                ))}
              </Fragment>
            ))}
          </MapContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-3xl">🗺️</div>
            <h3 className="text-xl font-black text-slate-900">Chưa có tọa độ bản đồ</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Khi backend trả về latitude/longitude cho hoạt động, bản đồ sẽ tự đánh marker và vẽ tuyến đường.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ItineraryMap;
