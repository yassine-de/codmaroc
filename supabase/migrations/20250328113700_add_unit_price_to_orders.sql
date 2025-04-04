/*
  # Add unit_price column to orders table

  1. Changes
    - Add unit_price numeric column to orders table
    - Set default value to null
    - Add comment explaining the field
*/

-- Add unit_price column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS unit_price numeric;

-- Add comment
COMMENT ON COLUMN orders.unit_price IS 'Unit price from Google Sheets import, if different from product price'; 