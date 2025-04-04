/*
  # Add auto-incrementing sourcing ID

  1. Changes
    - Adds `sourcing_id` column to sourcing_requests table
    - Creates sequence for auto-incrementing IDs
    - Adds unique index on sourcing_id

  2. Purpose
    - Provides a human-readable, sequential identifier for sourcing requests
    - Ensures uniqueness of sourcing IDs
    - Makes it easier to reference specific requests
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS sourcing_requests_sourcing_id_seq;

-- Add sourcing_id column if it doesn't exist
ALTER TABLE sourcing_requests 
  ADD COLUMN IF NOT EXISTS sourcing_id integer DEFAULT nextval('sourcing_requests_sourcing_id_seq') NOT NULL;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS sourcing_requests_sourcing_id_idx ON sourcing_requests(sourcing_id);