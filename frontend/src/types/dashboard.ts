import { Car } from './car';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface OwnerDashboardProps {
  user: User;
  onCarSelect: (car: Car) => void;
}

export interface DashboardStats {
  totalEarnings: number;
  activeBookings: number;
  totalCars: number;
  rating: number;
}
