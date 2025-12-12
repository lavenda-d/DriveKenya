// src/types/car.ts
export interface Car {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  category?: string;
  price_per_day: number;
  location: string;
  rating?: number;
  seats?: number | string;
  description?: string;
  specs?: {
    transmission?: string;
    fuelType?: string;
  };
  features?: string[];
  amenities?: string[];
  images?: Array<{ url: string }>;
  owner?: {
    name?: string;
    rating?: number;
    reviewCount?: number;
  };
  reviews?: Array<{
    userName?: string;
    rating: number;
    comment: string;
    date?: Date | string;
  }>;
  [key: string]: any;
}