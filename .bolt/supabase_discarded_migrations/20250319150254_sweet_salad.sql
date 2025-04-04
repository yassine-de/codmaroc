/*
  # Add webhook functionality for integrations

  1. New Tables
    - `webhooks`
      - `id` (uuid, primary key)
      - `integration_id` (integer, references integrations)
      - `secret_key` (text, for webhook authentication)
      - `enabled` (boolean)
      - `last_triggered_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `webhooks` table
    - Add policies for authenticated users to manage their webhooks
*/

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id integer REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  secret_key text NOT NULL,
  enabled boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own webhooks
CREATE POLICY "Users can read own webhooks"
  ON webhooks
  FOR SELECT
  TO authenticated
  USING (integration_id IN (
    SELECT id FROM integrations WHERE user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Allow users to create webhooks for their integrations
CREATE POLICY "Users can create webhooks"
  ON webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (integration_id IN (
    SELECT id FROM integrations WHERE user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Allow users to update their own webhooks
CREATE POLICY "Users can update own webhooks"
  ON webhooks
  FOR UPDATE
  TO authenticated
  USING (integration_id IN (
    SELECT id FROM integrations WHERE user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Allow users to delete their own webhooks
CREATE POLICY "Users can delete own webhooks"
  ON webhooks
  FOR DELETE
  TO authenticated
  USING (integration_id IN (
    SELECT id FROM integrations WHERE user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  ));