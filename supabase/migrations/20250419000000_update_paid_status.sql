-- Update the trigger function to set status to PAID when invoice is marked as paid
CREATE OR REPLACE FUNCTION update_orders_on_invoice_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Paid' AND OLD.status = 'Unpaid' THEN
    UPDATE orders
    SET 
      paid = true,
      status = 18  -- Set status to PAID
    WHERE invoice_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_orders_on_invoice_paid ON invoices;
CREATE TRIGGER trigger_update_orders_on_invoice_paid
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_on_invoice_paid(); 