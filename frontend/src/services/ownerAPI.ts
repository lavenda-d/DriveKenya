import { api, authStorage } from './api';
import { Car } from '../types/car';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const normalizeResponseData = <T>(response: any): T | undefined => {
  if (!response) return undefined;
  if (response.data !== undefined) return response.data as T;
  if (response.cars !== undefined) return response.cars as T;
  if (response.dashboard !== undefined) return response.dashboard as T;
  if (response.stats !== undefined) return response.stats as T;
  return response as T;
};

export const ownerAPI = {
  getMyCars: async (): Promise<ApiResponse<Car[]>> => {
    try {
      const token = authStorage.getToken();
      const res = await api.get('/owner/cars', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      return { success: true, data: normalizeResponseData<Car[]>(res) };
    } catch (error: any) {
      console.error('Failed to fetch owner cars:', error);
      return { success: false, error: error.message || 'Failed to fetch cars' };
    }
  },

  getDashboardStats: async (): Promise<ApiResponse<any>> => {
    try {
      const token = authStorage.getToken();
      const res = await api.get('/owner/dashboard', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      return { success: true, data: normalizeResponseData<any>(res) };
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
      return { success: false, error: error.message || 'Failed to fetch dashboard stats' };
    }
  },

  updateCarAvailability: async (carId: string, available: boolean): Promise<ApiResponse<Car>> => {
    try {
      const token = authStorage.getToken();
      const res = await api.patch(`/owner/cars/${carId}/availability`, {
        body: JSON.stringify({ available }),
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }
      });
      return { success: true, data: normalizeResponseData<Car>(res) };
    } catch (error: any) {
      console.error('Failed to update car availability:', error);
      return { success: false, error: error.message || 'Failed to update car availability' };
    }
  },

  deleteCar: async (carId: string): Promise<ApiResponse<void>> => {
    try {
      const token = authStorage.getToken();
      await api.delete(`/owner/cars/${carId}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete car:', error);
      return { success: false, error: error.message || 'Failed to delete car' };
    }
  },

  getCarDetails: async (carId: string): Promise<ApiResponse<Car>> => {
    try {
      const token = authStorage.getToken();
      const res = await api.get(`/owner/cars/${carId}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      return { success: true, data: normalizeResponseData<Car>(res) };
    } catch (error: any) {
      console.error('Failed to fetch car details:', error);
      return { success: false, error: error.message || 'Failed to fetch car details' };
    }
  },

  getOwnerBookings: async (filters = {}): Promise<ApiResponse<any[]>> => {
    try {
      const token = authStorage.getToken();
      const qs = Object.keys(filters).length ? `?${new URLSearchParams(filters as any).toString()}` : '';
      const res = await api.get(`/owner/bookings${qs}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      return { success: true, data: normalizeResponseData<any[]>(res) };
    } catch (error: any) {
      console.error('Failed to fetch owner bookings:', error);
      return { success: false, error: error.message || 'Failed to fetch bookings' };
    }
  },

  getEarningsReport: async (startDate?: string, endDate?: string): Promise<ApiResponse<any>> => {
    try {
      const token = authStorage.getToken();
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/owner/earnings${qs}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      return { success: true, data: normalizeResponseData<any>(res) };
    } catch (error: any) {
      console.error('Failed to fetch earnings report:', error);
      return { success: false, error: error.message || 'Failed to fetch earnings report' };
    }
  }
};

export default ownerAPI;
