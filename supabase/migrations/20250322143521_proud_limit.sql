/*
  # Add Invoice Creation Function

  1. Changes
    - Add function to create invoices for delivered orders
    - Add trigger to automatically mark orders as paid when invoice is paid
    - Add function to calculate invoice totals
    
  2. Security
    - Only admin can execute invoice creation function
    - Maintain existing RLS policies
*/

-- Function to create invoices for delivered orders
CREATE OR REPLACE FUNCTION create_seller_invoices()
RETURNS TABLE (
  seller_id integer,
  invoice_id uuid,
  order_count integer
) AS $$
DECLARE
  v_seller RECORD;
  v_invoice_id uuid;
  v_order_count integer;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 1
  ) THEN
    RAISE EXCEPTION 'Only administrators can create invoices';
  END IF;

  -- Loop through sellers with delivered orders
  FOR v_seller IN (
    SELECT DISTINCT o.user_id
    FROM orders o
    WHERE o.status = 17  -- DELIVERED status
    AND o.invoice_id IS NULL  -- Not yet invoiced
    AND o.paid = false  -- Not yet paid
  ) LOOP
    -- Calculate totals
    WITH order_totals AS (
      SELECT 
        COUNT(*) as order_count,
        SUM(crbt) as total_crbt,
        COUNT(*) * 8.5 as shipping_fees,  -- Fixed shipping fee per order
        SUM(crbt * 0.05) as cod_fees      -- 5% COD fee
      FROM orders
      WHERE user_id = v_seller.user_id
      AND status = 17
      AND invoice_id IS NULL
      AND paid = false
    )
    -- Create invoice
    INSERT INTO invoices (
      user_id,
      invoice_number,
      total_amount,
      shipping_fees,
      cod_fees,
      status
    )
    SELECT 
      v_seller.user_id,
      'FCT-' || v_seller.user_id || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
      total_crbt + shipping_fees + cod_fees,
      shipping_fees,
      cod_fees,
      'Unpaid'
    FROM order_totals
    WHERE order_count > 0
    RETURNING id INTO v_invoice_id;

    -- If invoice was created, update orders
    IF v_invoice_id IS NOT NULL THEN
      UPDATE orders
      SET invoice_id = v_invoice_id
      WHERE user_id = v_seller.user_id
      AND status = 17
      AND invoice_id IS NULL
      AND paid = false;

      -- Get order count
      SELECT COUNT(*)
      INTO v_order_count
      FROM orders
      WHERE invoice_id = v_invoice_id;

      -- Return result row
      seller_id := v_seller.user_id;
      invoice_id := v_invoice_id;
      order_count := v_order_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update orders when invoice is marked as paid
CREATE OR REPLACE FUNCTION update_orders_on_invoice_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Paid' AND OLD.status = 'Unpaid' THEN
    UPDATE orders
    SET paid = true
    WHERE invoice_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_orders_on_invoice_paid'
  ) THEN
    CREATE TRIGGER trigger_update_orders_on_invoice_paid
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_on_invoice_paid();
  END IF;
END $$;