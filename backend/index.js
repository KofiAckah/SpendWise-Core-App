import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import morgan from 'morgan';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// HTTP request logging with Morgan
// Format: :method :url :status :response-time ms - :date[iso]
app.use(morgan(':method :url :status :response-time ms - :date[iso]', {
  skip: (req) => req.url === '/api/health' // Skip health check logs to reduce noise
}));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'spendwise',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test database connection
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SpendWise API is running' });
});

// POST /api/expenses - Add new expense
app.post('/api/expenses', async (req, res) => {
  const { itemName, amount, category } = req.body;

  // Validation
  if (!itemName || itemName.trim() === '') {
    return res.status(400).json({ 
      error: 'Item name is required and cannot be empty' 
    });
  }

  if (amount === undefined || amount === null) {
    return res.status(400).json({ 
      error: 'Amount is required' 
    });
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount) || numAmount < 0) {
    return res.status(400).json({ 
      error: 'Amount must be a positive number' 
    });
  }

  // Validate category (optional, defaults to 'Other')
  const validCategories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Other'];
  const expenseCategory = category && validCategories.includes(category) ? category : 'Other';

  try {
    const result = await pool.query(
      'INSERT INTO expenses (item_name, amount, category) VALUES ($1, $2, $3) RETURNING *',
      [itemName.trim(), numAmount, expenseCategory]
    );

    res.status(201).json({
      message: 'Expense added successfully',
      expense: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ 
      error: 'Failed to add expense to database' 
    });
  }
});

// GET /api/expenses - Get all expenses (with optional category filter)
app.get('/api/expenses', async (req, res) => {
  const { category } = req.query;

  try {
    let query = 'SELECT * FROM expenses';
    const params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      expenses: result.rows
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch expenses from database' 
    });
  }
});

// GET /api/expenses/total - Get total spending (with optional category filter)
app.get('/api/expenses/total', async (req, res) => {
  const { category } = req.query;

  try {
    let query = 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses';
    const params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    const result = await pool.query(query, params);

    const total = parseFloat(result.rows[0].total);

    res.status(200).json({
      total: total
    });
  } catch (error) {
    console.error('Error calculating total spending:', error);
    res.status(500).json({ 
      error: 'Failed to calculate total spending' 
    });
  }
});

// DELETE /api/expenses/:id - Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  // Validation
  const expenseId = parseInt(id);
  if (isNaN(expenseId) || expenseId <= 0) {
    return res.status(400).json({ 
      error: 'Invalid expense ID' 
    });
  }

  try {
    // Check if expense exists
    const checkResult = await pool.query(
      'SELECT * FROM expenses WHERE id = $1',
      [expenseId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Expense not found' 
      });
    }

    // Delete the expense
    await pool.query(
      'DELETE FROM expenses WHERE id = $1',
      [expenseId]
    );

    res.status(200).json({
      message: 'Expense deleted successfully',
      id: expenseId
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ 
      error: 'Failed to delete expense from database' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export { app, pool };
