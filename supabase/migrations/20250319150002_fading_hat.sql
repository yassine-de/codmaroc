/*
  # Add version control functionality

  1. New Tables
    - `versions`
      - `id` (uuid, primary key)
      - `user_id` (integer, references users)
      - `name` (text, version name)
      - `description` (text, optional)
      - `created_at` (timestamp)
      - `data` (jsonb, stores snapshot of products and orders)

  2. Security
    - Enable RLS on `versions` table
    - Add policies for authenticated users to manage their versions
*/

CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer REFERENCES users(id) NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  data jsonb NOT NULL
);

ALTER TABLE versions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own versions
CREATE POLICY "Users can read own versions"
  ON versions
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Allow users to create versions
CREATE POLICY "Users can create versions"
  ON versions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));

-- Allow users to delete their own versions
CREATE POLICY "Users can delete own versions"
  ON versions
  FOR DELETE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  ));