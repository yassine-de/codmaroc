/*
  # Add product and video links to products table

  1. Changes
    - Add product_link column to products table
    - Add video_link column to products table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to products table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'product_link'
  ) THEN
    ALTER TABLE products ADD COLUMN product_link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'video_link'
  ) THEN
    ALTER TABLE products ADD COLUMN video_link text;
  END IF;
END $$;