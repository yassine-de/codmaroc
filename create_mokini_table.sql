DROP TABLE IF EXISTS mokini_shipments;

CREATE TABLE wakilni_orders (
    "Order #" VARCHAR(50) PRIMARY KEY,
    "Waybill #" VARCHAR(50),
    "Created On" TIMESTAMP,
    "Completed On" TIMESTAMP,
    "Trip Type" VARCHAR(50),
    "Pickup" VARCHAR(255),
    "Pickup Location" VARCHAR(255),
    "Pickup Recipient Phone Number" VARCHAR(20),
    "Pickup Recipient Secondary Phone Number" VARCHAR(20),
    "Delivery" VARCHAR(255),
    "Delivery Location" VARCHAR(255),
    "Delivery Recipient Phone Number" VARCHAR(20),
    "Delivery Recipient Secondary Phone Number" VARCHAR(20),
    "Status" VARCHAR(50),
    "Notes" TEXT,
    "Car (yes,no)" BOOLEAN,
    "Amount to be Collected in USD" DECIMAL(10,2),
    "Amount to be Collected in LBP" DECIMAL(10,2),
    "Amount to be Collected in AED" DECIMAL(10,2),
    "Amount to be Collected in EUR" DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 