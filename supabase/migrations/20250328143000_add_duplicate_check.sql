/*
  # Add duplicate order check function and trigger

  1. Changes
    - Add function to check for duplicate orders on the same day
    - Add trigger to mark orders as duplicates by setting status = 6 (Double)
    
  2. Security
    - Maintain existing RLS policies
*/

-- Create function to check for duplicate orders
CREATE OR REPLACE FUNCTION check_duplicate_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already an order with the same phone and product on the same day
  IF EXISTS (
    SELECT 1
    FROM orders
    WHERE phone = NEW.phone
    AND product_id = NEW.product_id
    AND DATE(created_at) = DATE(NEW.created_at)
    AND id != NEW.id
  ) THEN
    -- Set status to 6 (Double) for duplicate orders
    NEW.status := 6;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate check
CREATE TRIGGER check_duplicate_order_trigger
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_order();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_duplicate_check 
ON orders(phone, product_id, created_at); 