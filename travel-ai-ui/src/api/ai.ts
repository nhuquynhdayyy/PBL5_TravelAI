import axiosClient from './axiosClient';

// DTO Interfaces
export interface SpotDto {
  spotId: number;
  destinationId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  avgTimeSpent: number;
  openingHours: string | null;
}

export interface AiSuggestionDto {
  spot: SpotDto;
  totalScore: number;
  styleMatchScore: number;
  budgetMatchScore: number;
  paceMatchScore: number;
  distanceScore: number;
  ratingScore: number;
  averageRating: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// API Functions
export const aiApi = {
  getSuggestions: async (destinationId?: number): Promise<ApiResponse<AiSuggestionDto[]>> => {
    const params = destinationId ? { destinationId } : {};
    const response = await axiosClient.get('/ai/suggestions', { params });
    return response.data;
  }
};
