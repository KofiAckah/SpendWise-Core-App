import { useState, useEffect, useCallback } from 'react'
import './App.css'

function App() {
  const [itemName, setItemName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [fetchError, setFetchError] = useState('')
  const [totalSpending, setTotalSpending] = useState(0)
  const [filterCategory, setFilterCategory] = useState('All')

  const categories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Other']

  const fetchExpenses = useCallback(async () => {
    try {
      const url = filterCategory === 'All' 
        ? 'http://localhost:5000/api/expenses'
        : `http://localhost:5000/api/expenses?category=${filterCategory}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch expenses')
      }

      setExpenses(data.expenses)
      setFetchError('')
    } catch (err) {
      setFetchError(err.message || 'Failed to load expenses')
    }
  }, [filterCategory])

  const fetchTotal = useCallback(async () => {
    try {
      const url = filterCategory === 'All'
        ? 'http://localhost:5000/api/expenses/total'
        : `http://localhost:5000/api/expenses/total?category=${filterCategory}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch total')
      }

      setTotalSpending(data.total)
    } catch (err) {
      console.error('Failed to fetch total spending:', err)
    }
  }, [filterCategory])

  // Fetch expenses on component mount and when filter changes
  useEffect(() => {
    fetchExpenses()
    fetchTotal()
  }, [filterCategory, fetchExpenses, fetchTotal])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Client-side validation
    if (!itemName.trim()) {
      setError('Item name cannot be empty')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Amount must be a positive number')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemName: itemName.trim(),
          amount: numAmount,
          category: category,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add expense')
      }

      setSuccess('✓ Expense added successfully!')
      setItemName('')
      setAmount('')
      setCategory('Other')
      
      // Refresh expense list and total
      fetchExpenses()
      fetchTotal()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to add expense')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount) => {
    return parseFloat(amount).toFixed(2)
  }

  const handleDelete = async (id) => {
    // Confirm before deleting
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/expenses/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete expense')
      }

      // Refresh expense list and total after deletion
      fetchExpenses()
      fetchTotal()
      
      setSuccess('✓ Expense deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete expense')
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>💰 SpendWise</h1>
        <p>Track your daily expenses</p>
      </header>

      <main className="main-content">
        <div className="expense-form-container">
          <h2>Log Expense</h2>
          
          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-group">
              <label htmlFor="itemName">Item Name</label>
              <input
                type="text"
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Lunch, Bus fare"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (GHS)</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="category-select"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </form>
        </div>

        <div className="expense-list-container">
          <div className="list-header">
            <h2>Expense History</h2>
            <div className="filter-group">
              <label htmlFor="filter">Filter by:</label>
              <select
                id="filter"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {fetchError && (
            <div className="error-message">{fetchError}</div>
          )}

          {!fetchError && expenses.length === 0 && (
            <div className="empty-state">
              <p>No expenses yet. Start tracking your spending!</p>
            </div>
          )}

          {!fetchError && expenses.length > 0 && (
            <>
              <div className="total-spending">
                <span className="total-label">Total Spending</span>
                <span className="total-amount">GHS {formatAmount(totalSpending)}</span>
              </div>

              <div className="expense-list">
                {expenses.map((expense) => (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-info">
                      <div className="expense-main">
                        <span className="expense-name">{expense.item_name}</span>
                        <span className="expense-category">{expense.category}</span>
                      </div>
                      <span className="expense-date">{formatDate(expense.created_at)}</span>
                    </div>
                    <div className="expense-actions">
                      <span className="expense-amount">
                        GHS {formatAmount(expense.amount)}
                      </span>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(expense.id)}
                        aria-label={`Delete ${expense.item_name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
