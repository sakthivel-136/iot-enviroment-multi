-- Create Zone Table (for metadata)
CREATE TABLE IF NOT EXISTS zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id TEXT UNIQUE NOT NULL, -- e.g., 'A', 'B', 'C'
  name TEXT
);

-- Insert initial zones
INSERT INTO zones (zone_id, name) VALUES ('A', 'Kitchen') ON CONFLICT DO NOTHING;
INSERT INTO zones (zone_id, name) VALUES ('B', 'Living Room') ON CONFLICT DO NOTHING;
INSERT INTO zones (zone_id, name) VALUES ('C', 'Bedroom') ON CONFLICT DO NOTHING;

-- Sensor Readings Table
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  gas_ppm FLOAT,
  gas_detected BOOLEAN,
  temperature FLOAT,
  humidity FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  risk_score FLOAT,
  anomaly BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
