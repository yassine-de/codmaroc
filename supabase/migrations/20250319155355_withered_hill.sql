/*
  # Add sourcing requests table

  1. New Tables
    - `sourcing_requests`
      - `id` (uuid, primary key) - Unique identifier for each request
      - `user_id` (integer) - References users table
      - `product_name` (text) - Name of the product
      - `product_code` (text) - Product code/SKU
      - `product_link` (text) - Link to product
      - `video_link` (text) - Link to product video
      - `quantity` (integer) - Requested quantity
      - `status` (text) - Request status (Pending/Approved/Processing/Completed/Canceled)
      - `note` (text) - Additional notes
      - `created_at` (timestamp) - Creation timestamp

  2. Security
    - Enable RLS on `sourcing_requests` table
    - Add policies for:
      - Users can read their own requests
      - Users can create new requests
      - Users can update their own requests
      - Users can delete their own requests

  3. Changes
    - Creates new table for managing sourcing requests
    - Implements row-level security
    - Sets up appropriate foreign key constraints
*/

-- Create sourcing requests table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS sourcing_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id integer REFERENCES users(id) NOT NULL,
    product_name text NOT NULL,
    product_code text NOT NULL,
    product_link text NOT NULL,
    video_link text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    status text NOT NULL DEFAULT 'Pending',
    note text,
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS
DO $$ BEGIN
  ALTER TABLE sourcing_requests ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create policies
DO $$ BEGIN
  CREATE POLICY "Users can read own sourcing requests"
    ON sourcing_requests
    FOR SELECT
    TO authenticated
    USING (user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create sourcing requests"
    ON sourcing_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own sourcing requests"
    ON sourcing_requests
    FOR UPDATE
    TO authenticated
    USING (user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ))
    WITH CHECK (user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own sourcing requests"
    ON sourcing_requests
    FOR DELETE
    TO authenticated
    USING (user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    ));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;