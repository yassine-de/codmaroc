/*
  # Add sourcing_id to sourcing requests table

  1. Changes
    - Add sourcing_id column with auto-incrementing sequence
    - Create unique index on sourcing_id
    - Update order by clause to use sourcing_id

  2. Notes
    - sourcing_id will be used as a display ID for sourcing requests
    - The sequence ensures unique, incrementing numbers
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS sourcing_requests_sourcing_id_seq;

-- Add sourcing_id column if it doesn't exist
ALTER TABLE sourcing_requests 
  ADD COLUMN IF NOT EXISTS sourcing_id integer DEFAULT nextval('sourcing_requests_sourcing_id_seq') NOT NULL;

-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS sourcing_requests_sourcing_id_idx ON sourcing_requests(sourcing_id);