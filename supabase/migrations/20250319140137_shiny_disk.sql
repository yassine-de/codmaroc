/*
  # Add auto-sync column to integrations table

  1. Changes
    - Add auto_sync boolean column to integrations table
    - Set default value to false
    - Add index for better query performance
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add auto_sync column
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS auto_sync boolean DEFAULT false;

-- Create index for auto_sync column
CREATE INDEX IF NOT EXISTS idx_integrations_auto_sync ON integrations(auto_sync);