/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (serial, primary key) - Auto-incrementing order identifier
      - `user_id` (integer) - Reference to users table
      - `total_amount` (decimal) - Total order amount
      - `status` (integer) - Order status (1: Pending, 2: Confirmed, 3: Shipped, 4: Delivered, 5: Cancelled)
      - `shipping_address` (text) - Delivery address
      - `phone` (text) - Contact phone number
      - `notes` (text) - Additional order notes
      - `created_at` (timestamp) - Order creation timestamp
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `orders` table
    - Add policies for users to:
      - Read their own orders
      - Create new orders
      - Update their own orders
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id integer REFERENCES users(id) NOT NULL,
  total_amount decimal(10,2) NOT NULL DEFAULT 0.00,
  status integer NOT NULL DEFAULT 1,
  shipping_address text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::integer);

CREATE POLICY "Users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::integer);

CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::integer)
  WITH CHECK (user_id = auth.uid()::integer);

-- Create index for faster queries
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();