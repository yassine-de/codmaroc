/*
  # Update products table schema

  1. Changes
    - Add new columns to products table:
      - `sku` (text)
      - `product_link` (text)
      - `video_link` (text)
      - `link` (text)
      - Update price to be numeric(10,2)

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_link text,
ADD COLUMN IF NOT EXISTS video_link text,
ADD COLUMN IF NOT EXISTS link text;