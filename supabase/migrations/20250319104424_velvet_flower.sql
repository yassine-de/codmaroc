/*
  # Add integrations table for Google Sheets

  1. New Tables
    - `integrations`
      - `id` (serial, primary key)
      - `user_id` (integer, foreign key to users)
      - `spreadsheet_id` (text)
      - `spreadsheet_name` (text)
      - `sheet_name` (text)
      - `last_sync_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can read their own integrations
      - Admins can read all integrations
      - Users can create their own integrations
      - Users can update their own integrations
*/

-- Create integrations table
CREATE TABLE integrations (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES users(id) NOT NULL,
  spreadsheet_id text NOT NULL,
  spreadsheet_name text NOT NULL,
  sheet_name text NOT NULL,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create trigger for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "integrations_self_access"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "integrations_admin_access"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE auth_id = auth.uid() 
      AND role = 1
    )
  );

CREATE POLICY "integrations_insert_own"
  ON integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "integrations_update_own"
  ON integrations
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM users 
      WHERE auth_id = auth.uid()
    )
  );