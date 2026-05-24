export type ActivityKind = 'hotel' | 'transport' | 'food' | 'sightseeing' | 'service';

export type ItineraryActivity = {
  id: string;
  title: string;
  location: string;
  description: string;
  day: number;
  startTime: string;
  endTime: string;
  duration: string;
  imageUrl?: string;
  estimatedCost: number;
  serviceId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  kind: ActivityKind;
};

export type ItineraryDay = {
  day: number;
  dateLabel?: string;
  activities: ItineraryActivity[];
};

export type ItineraryViewModel = {
  itineraryId?: number | null;
  tripTitle: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  totalEstimatedCost: number;
  days: ItineraryDay[];
  raw: unknown;
};
