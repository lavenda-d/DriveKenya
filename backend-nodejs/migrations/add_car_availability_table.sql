-- Calendar-style availability blocks per car
CREATE TABLE IF NOT EXISTS car_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available','booked','maintenance')),
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- Indexes for range queries
CREATE INDEX IF NOT EXISTS idx_car_availability_car ON car_availability(car_id);
CREATE INDEX IF NOT EXISTS idx_car_availability_range ON car_availability(start_date, end_date);