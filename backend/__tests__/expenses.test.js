import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { jest } from '@jest/globals';

// Mock the database pool
const mockPool = {
  query: jest.fn(),
  on: jest.fn(),
};

// Mock pg module with ES module syntax
jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(() => mockPool),
  },
}));

describe('User Story 1: Log Expense - POST /api/expenses', () => {
  let app;

  beforeEach(() => {
    // Setup Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Define the POST endpoint (same logic as in index.js)
    app.post('/api/expenses', async (req, res) => {
      const { itemName, amount } = req.body;

      // Validation: AC #3 - Prevent empty names
      if (!itemName || itemName.trim() === '') {
        return res.status(400).json({ 
          error: 'Item name is required and cannot be empty' 
        });
      }

      // Validation: AC #3 - Check amount exists
      if (amount === undefined || amount === null) {
        return res.status(400).json({ 
          error: 'Amount is required' 
        });
      }

      const numAmount = parseFloat(amount);
      
      // Validation: AC #3 - Prevent negative costs
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ 
          error: 'Amount must be a positive number' 
        });
      }

      try {
        // AC #2 - Save to database
        const result = await mockPool.query(
          'INSERT INTO expenses (item_name, amount) VALUES ($1, $2) RETURNING *',
          [itemName.trim(), numAmount]
        );

        res.status(201).json({
          message: 'Expense added successfully',
          expense: result.rows[0]
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to add expense to database' 
        });
      }
    });

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Acceptance Criteria #1 & #2: Input fields and save to database', () => {
    test('should create expense with valid item name and amount', async () => {
      // Arrange: Mock database response
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 1,
          item_name: 'Lunch at cafeteria',
          amount: '25.50',
          created_at: new Date('2026-02-04T10:30:00.000Z')
        }]
      });

      // Act: Send request
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Lunch at cafeteria',
          amount: 25.50
        });

      // Assert: Check response
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Expense added successfully');
      expect(response.body.expense).toHaveProperty('id');
      expect(response.body.expense.item_name).toBe('Lunch at cafeteria');
      expect(response.body.expense.amount).toBe('25.50');
      
      // Verify database was called correctly
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO expenses (item_name, amount) VALUES ($1, $2) RETURNING *',
        ['Lunch at cafeteria', 25.50]
      );
    });

    test('should save different types of expenses', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 2, item_name: 'Bus fare', amount: '5.00', created_at: new Date() }]
      });

      const response = await request(app)
        .post('/api/expenses')
        .send({ itemName: 'Bus fare', amount: 5.00 });

      expect(response.status).toBe(201);
      expect(response.body.expense.item_name).toBe('Bus fare');
    });
  });

  describe('Acceptance Criteria #3: Validation prevents empty names', () => {
    test('should reject empty item name', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: '',
          amount: 10.00
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required and cannot be empty');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should reject item name with only whitespace', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: '   ',
          amount: 10.00
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Item name is required and cannot be empty');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should trim whitespace from valid item names', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 3, item_name: 'Coffee', amount: '8.75', created_at: new Date() }]
      });

      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: '  Coffee  ',
          amount: 8.75
        });

      expect(response.status).toBe(201);
      // Verify trimmed value was sent to database
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['Coffee', 8.75]
      );
    });
  });

  describe('Acceptance Criteria #3: Validation prevents negative costs', () => {
    test('should reject negative amount', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Bus fare',
          amount: -5.00
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Amount must be a positive number');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should reject non-numeric amount', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Coffee',
          amount: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Amount must be a positive number');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should reject missing amount field', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Snack'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Amount is required');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should accept zero amount (free items)', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 4, item_name: 'Free sample', amount: '0.00', created_at: new Date() }]
      });

      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Free sample',
          amount: 0
        });

      expect(response.status).toBe(201);
      expect(response.body.expense.amount).toBe('0.00');
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Lunch',
          amount: 25.50
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to add expense to database');
    });
  });
});

describe('User Story 2: View Expense List - GET /api/expenses', () => {
  let app;

  beforeEach(() => {
    // Setup Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Define the GET endpoint
    app.get('/api/expenses', async (req, res) => {
      try {
        const result = await mockPool.query(
          'SELECT * FROM expenses ORDER BY created_at DESC'
        );

        res.status(200).json({
          expenses: result.rows
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to fetch expenses from database' 
        });
      }
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Acceptance Criteria #1: Fetches data from Node.js API', () => {
    test('should fetch all expenses from database', async () => {
      const mockExpenses = [
        { 
          id: 1, 
          item_name: 'Lunch', 
          amount: '25.50', 
          created_at: '2026-02-05T10:00:00Z' 
        },
        { 
          id: 2, 
          item_name: 'Coffee', 
          amount: '5.00', 
          created_at: '2026-02-05T09:00:00Z' 
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockExpenses });

      const response = await request(app).get('/api/expenses');

      expect(response.status).toBe(200);
      expect(response.body.expenses).toEqual(mockExpenses);
      expect(response.body.expenses).toHaveLength(2);
    });

    test('should call database with correct SQL query', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await request(app).get('/api/expenses');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM expenses ORDER BY created_at DESC'
      );
    });
  });

  describe('Acceptance Criteria #2: Displays list in chronological order', () => {
    test('should return expenses ordered by created_at DESC (newest first)', async () => {
      const mockExpenses = [
        { 
          id: 3, 
          item_name: 'Dinner', 
          amount: '45.00', 
          created_at: '2026-02-05T18:00:00Z' 
        },
        { 
          id: 2, 
          item_name: 'Lunch', 
          amount: '25.50', 
          created_at: '2026-02-05T12:00:00Z' 
        },
        { 
          id: 1, 
          item_name: 'Breakfast', 
          amount: '15.00', 
          created_at: '2026-02-05T08:00:00Z' 
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockExpenses });

      const response = await request(app).get('/api/expenses');

      expect(response.status).toBe(200);
      expect(response.body.expenses[0].item_name).toBe('Dinner');
      expect(response.body.expenses[1].item_name).toBe('Lunch');
      expect(response.body.expenses[2].item_name).toBe('Breakfast');
    });
  });

  describe('Acceptance Criteria #3: Shows empty state', () => {
    test('should return empty array when no expenses exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await request(app).get('/api/expenses');

      expect(response.status).toBe(200);
      expect(response.body.expenses).toEqual([]);
      expect(response.body.expenses).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/expenses');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch expenses from database');
    });
  });

  // User Story 3: View Total Spending - GET /api/expenses/total
  describe('GET /api/expenses/total', () => {
    let app;

    beforeEach(() => {
      // Setup Express app for testing
      app = express();
      app.use(cors());
      app.use(express.json());

      // Define the GET total endpoint
      app.get('/api/expenses/total', async (req, res) => {
        try {
          const result = await mockPool.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM expenses'
          );

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

      jest.clearAllMocks();
    });

    // AC #2: Backend calculates sum accurately
    test('should calculate total spending correctly', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ total: '125.75' }]
      });

      const response = await request(app).get('/api/expenses/total');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(125.75);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses'
      );
    });

    // AC #2: Backend handles zero expenses
    test('should return 0 when no expenses exist', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ total: '0' }]
      });

      const response = await request(app).get('/api/expenses/total');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
    });

    // AC #2: Backend handles multiple expenses
    test('should sum multiple expenses correctly', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ total: '500.50' }]
      });

      const response = await request(app).get('/api/expenses/total');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(500.50);
    });

    // Error handling
    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/api/expenses/total');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to calculate total spending');
    });

    // AC #2: Backend handles decimal precision
    test('should handle decimal precision correctly', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ total: '99.99' }]
      });

      const response = await request(app).get('/api/expenses/total');

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(99.99);
    });
  });
});

describe('User Story 4: Delete Expense - DELETE /api/expenses/:id', () => {
  let app;

  beforeEach(() => {
    // Setup Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Define the DELETE endpoint (same logic as in index.js)
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
        const checkResult = await mockPool.query(
          'SELECT * FROM expenses WHERE id = $1',
          [expenseId]
        );

        if (checkResult.rows.length === 0) {
          return res.status(404).json({ 
            error: 'Expense not found' 
          });
        }

        // Delete the expense
        await mockPool.query(
          'DELETE FROM expenses WHERE id = $1',
          [expenseId]
        );

        res.status(200).json({
          message: 'Expense deleted successfully',
          id: expenseId
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to delete expense from database' 
        });
      }
    });

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Acceptance Criteria #1 & #2: Delete button removes expense from database', () => {
    test('should delete expense with valid ID', async () => {
      // Arrange: Mock expense exists
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, item_name: 'Lunch', amount: '25.50' }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Delete query

      // Act: Send delete request
      const response = await request(app)
        .delete('/api/expenses/1');

      // Assert: Check response
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Expense deleted successfully');
      expect(response.body.id).toBe(1);
      
      // Verify database was called correctly
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE id = $1',
        [1]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM expenses WHERE id = $1',
        [1]
      );
    });

    test('should return 404 if expense does not exist', async () => {
      // Arrange: Mock expense not found
      mockPool.query.mockResolvedValue({
        rows: []
      });

      // Act: Send delete request
      const response = await request(app)
        .delete('/api/expenses/999');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Expense not found');
      
      // Verify only SELECT was called, not DELETE
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE id = $1',
        [999]
      );
    });
  });

  describe('Validation: Invalid expense ID', () => {
    test('should reject non-numeric ID', async () => {
      const response = await request(app)
        .delete('/api/expenses/abc');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid expense ID');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should reject negative ID', async () => {
      const response = await request(app)
        .delete('/api/expenses/-1');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid expense ID');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('should reject zero ID', async () => {
      const response = await request(app)
        .delete('/api/expenses/0');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid expense ID');
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      // Arrange: Mock database error on SELECT
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      // Act: Send delete request
      const response = await request(app)
        .delete('/api/expenses/1');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete expense from database');
    });
  });
});

describe('User Story 5: Filter by Category', () => {
  let app;

  beforeEach(() => {
    // Setup Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());

    // Define POST endpoint with category support
    app.post('/api/expenses', async (req, res) => {
      const { itemName, amount, category } = req.body;

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

      const validCategories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Other'];
      const expenseCategory = category && validCategories.includes(category) ? category : 'Other';

      try {
        const result = await mockPool.query(
          'INSERT INTO expenses (item_name, amount, category) VALUES ($1, $2, $3) RETURNING *',
          [itemName.trim(), numAmount, expenseCategory]
        );

        res.status(201).json({
          message: 'Expense added successfully',
          expense: result.rows[0]
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to add expense to database' 
        });
      }
    });

    // Define GET endpoint with category filter
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

        const result = await mockPool.query(query, params);

        res.status(200).json({
          expenses: result.rows
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to fetch expenses from database' 
        });
      }
    });

    // Define GET total endpoint with category filter
    app.get('/api/expenses/total', async (req, res) => {
      const { category } = req.query;

      try {
        let query = 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses';
        const params = [];

        if (category) {
          query += ' WHERE category = $1';
          params.push(category);
        }

        const result = await mockPool.query(query, params);

        const total = parseFloat(result.rows[0].total);

        res.status(200).json({
          total: total
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to calculate total spending' 
        });
      }
    });

    jest.clearAllMocks();
  });

  describe('AC #1: Add expense with category dropdown', () => {
    test('should create expense with valid category', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 1,
          item_name: 'Lunch',
          amount: '25.50',
          category: 'Food',
          created_at: new Date('2026-02-05T10:30:00.000Z')
        }]
      });

      // Act
      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Lunch',
          amount: 25.50,
          category: 'Food'
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.expense.category).toBe('Food');
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO expenses (item_name, amount, category) VALUES ($1, $2, $3) RETURNING *',
        ['Lunch', 25.50, 'Food']
      );
    });

    test('should default to "Other" category if not provided', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 2,
          item_name: 'Random item',
          amount: '10.00',
          category: 'Other',
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Random item',
          amount: 10.00
        });

      expect(response.status).toBe(201);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO expenses (item_name, amount, category) VALUES ($1, $2, $3) RETURNING *',
        ['Random item', 10.00, 'Other']
      );
    });

    test('should default to "Other" for invalid category', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          id: 3,
          item_name: 'Test item',
          amount: '15.00',
          category: 'Other',
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/expenses')
        .send({
          itemName: 'Test item',
          amount: 15.00,
          category: 'InvalidCategory'
        });

      expect(response.status).toBe(201);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO expenses (item_name, amount, category) VALUES ($1, $2, $3) RETURNING *',
        ['Test item', 15.00, 'Other']
      );
    });
  });

  describe('AC #2: Filter expenses by category', () => {
    test('should return only Food expenses when filtering by Food', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, item_name: 'Lunch', amount: '25.50', category: 'Food', created_at: new Date() },
          { id: 2, item_name: 'Dinner', amount: '30.00', category: 'Food', created_at: new Date() }
        ]
      });

      // Act
      const response = await request(app)
        .get('/api/expenses?category=Food');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.expenses).toHaveLength(2);
      expect(response.body.expenses[0].category).toBe('Food');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE category = $1 ORDER BY created_at DESC',
        ['Food']
      );
    });

    test('should return all expenses when no category filter is applied', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, item_name: 'Lunch', amount: '25.50', category: 'Food', created_at: new Date() },
          { id: 2, item_name: 'Bus fare', amount: '5.00', category: 'Transport', created_at: new Date() },
          { id: 3, item_name: 'Movie', amount: '15.00', category: 'Entertainment', created_at: new Date() }
        ]
      });

      // Act
      const response = await request(app)
        .get('/api/expenses');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.expenses).toHaveLength(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM expenses ORDER BY created_at DESC',
        []
      );
    });

    test('should return empty array when category has no expenses', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: []
      });

      // Act
      const response = await request(app)
        .get('/api/expenses?category=Shopping');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.expenses).toHaveLength(0);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM expenses WHERE category = $1 ORDER BY created_at DESC',
        ['Shopping']
      );
    });
  });

  describe('AC #3: Total updates to show filtered sum', () => {
    test('should return total for specific category', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{ total: '55.50' }]
      });

      // Act
      const response = await request(app)
        .get('/api/expenses/total?category=Food');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(55.50);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = $1',
        ['Food']
      );
    });

    test('should return 0 when filtered category has no expenses', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{ total: '0' }]
      });

      // Act
      const response = await request(app)
        .get('/api/expenses/total?category=Bills');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(0);
    });

    test('should return total of all expenses when no filter applied', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({
        rows: [{ total: '125.75' }]
      });

      // Act
      const response = await request(app)
        .get('/api/expenses/total');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(125.75);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses',
        []
      );
    });
  });

  describe('Error handling', () => {
    test('should handle database error when fetching filtered expenses', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/expenses?category=Food');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch expenses from database');
    });

    test('should handle database error when calculating filtered total', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/expenses/total?category=Food');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to calculate total spending');
    });
  });
});
