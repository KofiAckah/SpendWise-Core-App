-- Create expenses table for SpendWise application
-- User Story 1: Log Expense

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  category VARCHAR(50) DEFAULT 'Other',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);

-- Insert sample data for testing (optional)
-- INSERT INTO expenses (item_name, amount) VALUES 
-- ('Lunch at cafeteria', 25.50),
-- ('Bus fare', 5.00),
-- ('Coffee', 8.75);
