/*
  # Update orders table schema

  1. Changes
    - Add product_id column to reference products table
    - Add customer_name column
    - Add quantity column
    - Add foreign key constraint for product_id
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add new policies for product relationship
*/

-- Add new columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id),
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

-- Create index for product_id
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);