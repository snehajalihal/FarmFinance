
CREATE DATABASE IF NOT EXISTS farm_financial_management;

USE farm_financial_management;

-- Crops table
CREATE TABLE IF NOT EXISTS crops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    season VARCHAR(50),
    area DECIMAL(10,2),
    area_unit VARCHAR(20) DEFAULT 'Acres',
    sowing_date DATE,
    expected_harvest_date DATE,
    status ENUM('Planned', 'Growing', 'Harvested') DEFAULT 'Planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('Income', 'Expense') NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    crop_id INT NULL,
    CONSTRAINT fk_transaction_crop
        FOREIGN KEY (crop_id)
        REFERENCES crops(id)
        ON DELETE SET NULL
);
