import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api/transactions';
const CROP_API_URL = 'http://localhost:5000/api/crops';

function App() {
  // Transaction states
  const [cropFinancials, setCropFinancials] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [cropFilter, setCropFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);

  // Crop states
  const [crops, setCrops] = useState([]);
  const [showCropForm, setShowCropForm] = useState(false);
  const [cropLoading, setCropLoading] = useState(true);

  const [editingCropId, setEditingCropId] = useState(null);

  // Error and success states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Transaction form
  const [form, setForm] = useState({
    type: 'Income',
    description: '',
    amount: '',
    date: '',
    crop_id: ''
  });

  // Crop form
  const [cropForm, setCropForm] = useState({
    crop_name: '',
    variety: '',
    season: 'Kharif',
    area: '',
    area_unit: 'Acres',
    sowing_date: '',
    expected_harvest_date: '',
    status: 'Planned'
  });

  // Fetch transactions
  useEffect(() => {
    async function fetchTransactions() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error('Unable to fetch transactions');
        }

        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  // Fetch crops
  useEffect(() => {
    async function fetchCrops() {
      try {
        const response = await fetch(CROP_API_URL);

        if (!response.ok) {
          throw new Error('Unable to fetch crops');
        }

        const data = await response.json();
        setCrops(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCropLoading(false);
      }
    }

    fetchCrops();
  }, []);

  // Fetch crop-wise financial summary
  useEffect(() => {
    async function fetchCropFinancials() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/crops/financial-summary'
        );

        if (!response.ok) {
          throw new Error('Unable to fetch crop financials');
        }

        const data = await response.json();
        setCropFinancials(data);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchCropFinancials();
  }, []);

  // Fetch monthly reports
  useEffect(() => {
    async function fetchMonthlyReports() {
      try {
        const response = await fetch(
          'http://localhost:5000/api/reports/monthly'
        );

        if (!response.ok) {
          throw new Error('Unable to fetch monthly reports');
        }

        const data = await response.json();
        setMonthlyReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setReportLoading(false);
      }
    }

    fetchMonthlyReports();
  }, []);

  // Financial calculations
  const totalIncome = transactions
    .filter(t => t.transaction_type === 'Income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.transaction_type === 'Expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netProfit = totalIncome - totalExpenses;

  const activeCrops = crops.filter(
    crop => crop.status === 'Growing'
  ).length;

  // Crop profitability chart calculations
const maxCropProfit = Math.max(
  ...cropFinancials.map(crop =>
    Math.abs(Number(crop.net_profit))
  ),
  1
);

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'All' ||
      transaction.transaction_type === typeFilter;

    const matchesCrop =
      cropFilter === 'All' ||
      (transaction.crop_name || 'General Farm Transaction') === cropFilter;

    const matchesDate =
      dateFilter === '' ||
      String(transaction.transaction_date).slice(0, 10) === dateFilter;

    return matchesSearch && matchesType && matchesCrop && matchesDate;
  });

  // Refresh transactions and all financial summaries
  async function refreshFinancialData() {
    const [
      transactionResponse,
      cropFinancialResponse,
      reportResponse
    ] = await Promise.all([
      fetch(API_URL),
      fetch('http://localhost:5000/api/crops/financial-summary'),
      fetch('http://localhost:5000/api/reports/monthly')
    ]);

    if (
      !transactionResponse.ok ||
      !cropFinancialResponse.ok ||
      !reportResponse.ok
    ) {
      throw new Error('Unable to refresh dashboard data');
    }

    const [
      transactionData,
      cropFinancialData,
      reportData
    ] = await Promise.all([
      transactionResponse.json(),
      cropFinancialResponse.json(),
      reportResponse.json()
    ]);

    setTransactions(transactionData);
    setCropFinancials(cropFinancialData);
    setMonthlyReports(reportData);
  }

  // Open the transaction form in edit mode
  function handleEditTransaction(transaction) {
    setEditingTransactionId(transaction.id);

    setForm({
      type: transaction.transaction_type,
      description: transaction.description,
      amount: String(transaction.amount),
      date: String(transaction.transaction_date).slice(0, 10),
      crop_id: transaction.crop_id
        ? String(transaction.crop_id)
        : ''
    });

    setError('');
    setSuccessMessage('');
    setShowForm(true);
  }

  // Add a new transaction or update an existing one
async function handleSubmit(e) {
  e.preventDefault();
  setError('');
  setSuccessMessage('');

  if (!form.description.trim()) {
    setError('Please enter a transaction description.');
    return;
  }

  const amount = Number(form.amount);

  if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
    setError('Please enter an amount greater than zero.');
    return;
  }

  if (!form.date) {
    setError('Please select a transaction date.');
    return;
  }

  try {
    const isEditing = editingTransactionId !== null;

    const response = await fetch(
      isEditing ? `${API_URL}/${editingTransactionId}` : API_URL,
      {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_type: form.type,
          description: form.description.trim(),
          amount,
          transaction_date: form.date,
          crop_id: form.crop_id ? Number(form.crop_id) : null
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Unable to save transaction');
    }

    await refreshFinancialData();

    setSuccessMessage(
      isEditing
        ? 'Transaction updated successfully!'
        : 'Transaction added successfully!'
    );

    setTimeout(() => setSuccessMessage(''), 3000);

    setForm({
      type: 'Income',
      description: '',
      amount: '',
      date: '',
      crop_id: ''
    });

    setEditingTransactionId(null);
    setShowForm(false);

  } catch (err) {
    setError(err.message);
  }
}

// Open crop form in edit mode
function handleEditCrop(crop) {
  setEditingCropId(crop.id);

  setCropForm({
    crop_name: crop.crop_name || '',
    variety: crop.variety || '',
    season: crop.season || 'Kharif',
    area: String(crop.area),
    area_unit: crop.area_unit || 'Acres',
    sowing_date: crop.sowing_date
      ? String(crop.sowing_date).slice(0, 10)
      : '',
    expected_harvest_date: crop.expected_harvest_date
      ? String(crop.expected_harvest_date).slice(0, 10)
      : '',
    status: crop.status || 'Planned'
  });

  setError('');
  setSuccessMessage('');
  setShowCropForm(true);
}

// Delete a crop
async function handleDeleteCrop(crop) {
  const confirmed = window.confirm(
    `Are you sure you want to delete ${crop.crop_name}?`
  );

  if (!confirmed) return;

  setError('');

  try {
    const response = await fetch(
      `${CROP_API_URL}/${crop.id}`,
      { method: 'DELETE' }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Unable to delete crop');
    }

    const updatedResponse = await fetch(CROP_API_URL);

    if (!updatedResponse.ok) {
      throw new Error('Unable to refresh crops');
    }

    setCrops(await updatedResponse.json());
    await refreshFinancialData();

    setSuccessMessage('Crop deleted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);

  } catch (err) {
    setError(err.message);
  }
}

  // Add crop
  async function handleCropSubmit(e) {
  e.preventDefault();
  setError('');
  setSuccessMessage('');

  if (!cropForm.crop_name.trim()) {
    setError('Please enter a crop name.');
    return;
  }

  const area = Number(cropForm.area);

  if (!cropForm.area || !Number.isFinite(area) || area <= 0) {
    setError('Please enter a cultivation area greater than zero.');
    return;
  }

  if (
    cropForm.sowing_date &&
    cropForm.expected_harvest_date &&
    cropForm.expected_harvest_date < cropForm.sowing_date
  ) {
    setError('Harvest date cannot be earlier than sowing date.');
    return;
  }

  try {
    const isEditing = editingCropId !== null;

    const response = await fetch(
      isEditing
        ? `${CROP_API_URL}/${editingCropId}`
        : CROP_API_URL,
      {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...cropForm,
          crop_name: cropForm.crop_name.trim(),
          variety: cropForm.variety.trim(),
          area
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || 'Unable to save crop'
      );
    }

    const updatedResponse = await fetch(CROP_API_URL);

    if (!updatedResponse.ok) {
      throw new Error('Unable to refresh crops');
    }

    const updatedCrops = await updatedResponse.json();
    setCrops(updatedCrops);

    setCropForm({
      crop_name: '',
      variety: '',
      season: 'Kharif',
      area: '',
      area_unit: 'Acres',
      sowing_date: '',
      expected_harvest_date: '',
      status: 'Planned'
    });

    setEditingCropId(null);
    setShowCropForm(false);

    setSuccessMessage(
      isEditing
        ? 'Crop updated successfully!'
        : 'Crop added successfully!'
    );

    setTimeout(() => setSuccessMessage(''), 3000);

  } catch (err) {
    setError(err.message);
  }
}

// Delete a transaction
async function handleDeleteTransaction(transaction) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${transaction.description}"?`
  );

  if (!confirmed) return;

  setError('');
  setSuccessMessage('');

  try {
    const response = await fetch(
      `${API_URL}/${transaction.id}`,
      { method: 'DELETE' }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || 'Unable to delete transaction.'
      );
    }

    await refreshFinancialData();

    setSuccessMessage('Transaction deleted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);

  } catch (err) {
    setError(err.message);
  }
}

return (
  <div className="app-container">
    {/* Sidebar */}
      <aside className="sidebar">
        <h2>🌾 FarmFinance</h2>

        <nav>
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#crop-management">Crop Management</a>
          <a href="#transactions">Transactions</a>
          <a href="#income">Income</a>
          <a href="#expenses">Expenses</a>
          <a href="#reports">Reports</a>
          <a href="#settings">Settings</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" id="dashboard">
        <header className="top-header">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to your farm financial overview.</p>
          </div>

          <button
            className="add-button"
            onClick={() => {
              setEditingTransactionId(null);
              setForm({
                type: 'Income',
                description: '',
                amount: '',
                date: '',
                crop_id: ''
              });
              setError('');
              setShowForm(true);
            }}
          >
            + Add Transaction
          </button>
        </header>

        {error && (
          <p className="error-message">{error}</p>
        )}

        {successMessage && (
          <p className="success-message">
            {successMessage}
          </p>
        )}

        {/* Financial Cards */}
        <section className="stats-container">
          <div className="stat-card">
            <p>Total Income</p>
            <h2>₹{totalIncome.toLocaleString('en-IN')}</h2>
            <span>Farm revenue</span>
          </div>

          <div className="stat-card">
            <p>Total Expenses</p>
            <h2>₹{totalExpenses.toLocaleString('en-IN')}</h2>
            <span>Farm expenditure</span>
          </div>

          <div className="stat-card">
            <p>Net Profit</p>
            <h2>₹{netProfit.toLocaleString('en-IN')}</h2>
            <span>Income - Expenses</span>
          </div>

          <div className="stat-card">
            <p>Active Crops</p>
            <h2>{activeCrops}</h2>
            <span>Crops currently growing</span>
          </div>
        </section>

        {/* Dashboard Charts */}
        <section className="dashboard-grid">
          <div className="content-card">
            <h3>Income vs Expenses</h3>
            <p>Financial performance overview</p>

            <div className="financial-chart">
              {(() => {
                const maxValue = Math.max(totalIncome, totalExpenses, 1);
                const incomeWidth = (totalIncome / maxValue) * 100;
                const expenseWidth = (totalExpenses / maxValue) * 100;

                return (
                  <>
                    <div className="chart-item">
                      <div className="chart-label">
                        <span>Income</span>
                        <strong>₹{totalIncome.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="chart-track">
                        <div
                          className="chart-bar income-bar"
                          style={{ width: `${incomeWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="chart-item">
                      <div className="chart-label">
                        <span>Expenses</span>
                        <strong>₹{totalExpenses.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="chart-track">
                        <div
                          className="chart-bar expense-bar"
                          style={{ width: `${expenseWidth}%` }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="chart-legend">
              <span><i className="legend-income" /> Income</span>
              <span><i className="legend-expense" /> Expenses</span>
            </div>
          </div>

          <div className="content-card">
            <h3>Crop Performance</h3>
            <p>Crop-wise financial analysis</p>

            

            {cropFinancials.length === 0 ? (
              <div className="empty-state">
                No crop financial data available
              </div>
            ) : (
              <div className="crop-financial-list">
                {cropFinancials.map(crop => {
                  const income = Number(crop.total_income);
                  const expenses = Number(crop.total_expenses);
                  const profit = Number(crop.net_profit);
                  const cropDetails = crops.find(
                    item => Number(item.id) === Number(crop.id)
                  );
                  const profitMargin = income > 0
                    ? (profit / income) * 100
                    : 0;

                  return (
                    <div
                      className="crop-financial-card"
                      key={crop.id}
                    >
                      <h3>{crop.crop_name}</h3>

                      <p>
                        Variety: {cropDetails?.variety || 'Not specified'}
                      </p>

                      <p>
                        Crop Status: {cropDetails?.status || 'Not available'}
                      </p>

                      <p>
                        Total Income: ₹{income.toLocaleString('en-IN')}
                      </p>

                      <p>
                        Total Expenses: ₹{expenses.toLocaleString('en-IN')}
                      </p>

                      <p className={profit >= 0 ? 'income' : 'expense'}>
                        Net Profit/Loss: ₹{profit.toLocaleString('en-IN')}
                      </p>

                      <p>
                        Profit Margin: {profitMargin.toFixed(2)}%
                      </p>

                      <span className={`crop-status ${profit >= 0 ? 'profitable' : 'loss'}`}>
                        {profit >= 0 ? 'Profitable' : 'Loss'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>


        {/* Crop Profitability Comparison */}
        <div className="content-card crop-profit-chart">
          <h3>Crop Profitability Comparison</h3>
          <p>Compare net profit or loss across crops</p>

          {cropFinancials.length === 0 ? (
            <p>No crop data available.</p>
          ) : (
            cropFinancials.map(crop => {
              const profit = Number(crop.net_profit);
              const barWidth =
                (Math.abs(profit) / maxCropProfit) * 100;

              return (
                <div className="chart-item" key={crop.id}>
                  <div className="chart-label">
                    <span>{crop.crop_name}</span>
                    <strong>
                      ₹{profit.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="chart-track">
                    <div
                      className={`chart-bar ${
                        profit >= 0 ? 'income-bar' : 'expense-bar'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>


        {/* Recent Transactions */}
        <section
          className="content-card transactions"
          id="transactions"
        >
          <h3>Recent Transactions</h3>

          {/* Transaction Filters */}
          <div className="transaction-filters">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>

            <select
              value={cropFilter}
              onChange={e => setCropFilter(e.target.value)}
            >
              <option value="All">All Crops</option>
              {crops.map(crop => (
                <option key={crop.id} value={crop.crop_name}>
                  {crop.crop_name}
                </option>
              ))}
              <option value="General Farm Transaction">
                General Transactions
              </option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />

            <button
              className="cancel-button"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('All');
                setCropFilter('All');
                setDateFilter('');
              }}
            >
              Clear Filters
            </button>
          </div>

          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p>No transactions recorded yet.</p>
          ) : (
            <div className="transaction-list">
                            {filteredTransactions.length === 0 ? (
                <p>No matching transactions found.</p>
              ) : (
                filteredTransactions.map(t => (
                  <div
                    className="transaction-row"
                    key={t.id}
                  >
                    <div>
                      <strong>{t.description}</strong>

                      <p>
                        {String(t.transaction_date).slice(0, 10)}
                      </p>

                      <p>
                        {t.crop_name || 'General Farm Transaction'}
                      </p>
                    </div>

                    <span className={
                      t.transaction_type === 'Income'
                        ? 'income'
                        : 'expense'
                    }>
                      {t.transaction_type === 'Income' ? '+' : '-'}
                      ₹{Number(t.amount).toLocaleString('en-IN')}
                    </span>

                    <div className="transaction-actions">
                      <button
                        type="button"
                        className="add-button"
                        onClick={() => handleEditTransaction(t)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => handleDeleteTransaction(t)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}

            </div>
          )}
        </section>

        {/* Crop Management */}
        <section
          className="content-card crop-section"
          id="crop-management"
        >
          <div className="crop-header">
            <div>
              <h3>Crop Management</h3>
              <p>Manage your agricultural activities</p>
            </div>

            <button
              className="add-button"
              onClick={() => {
  setEditingCropId(null);
  setCropForm({
    crop_name: '',
    variety: '',
    season: 'Kharif',
    area: '',
    area_unit: 'Acres',
    sowing_date: '',
    expected_harvest_date: '',
    status: 'Planned'
  });
  setError('');
  setShowCropForm(!showCropForm);
}}
            >
              + Add Crop
            </button>
          </div>

          {/* Add Crop Form */}
          {showCropForm && (
            <form
              className="crop-form"
              onSubmit={handleCropSubmit}
            >
              <label>Crop Name</label>

              <input
                type="text"
                placeholder="e.g. Rice"
                value={cropForm.crop_name}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    crop_name: e.target.value
                  })
                }
                required
              />

              <label>Crop Variety</label>

              <input
                type="text"
                placeholder="e.g. Basmati"
                value={cropForm.variety}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    variety: e.target.value
                  })
                }
              />

              <label>Season</label>

              <select
                value={cropForm.season}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    season: e.target.value
                  })
                }
              >
                <option>Kharif</option>
                <option>Rabi</option>
                <option>Zaid</option>
              </select>

              <label>Cultivation Area</label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter area"
                value={cropForm.area}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    area: e.target.value
                  })
                }
                required
              />

              <label>Area Unit</label>

              <select
                value={cropForm.area_unit}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    area_unit: e.target.value
                  })
                }
              >
                <option>Acres</option>
                <option>Hectares</option>
              </select>

              <label>Sowing Date</label>

              <input
                type="date"
                value={cropForm.sowing_date}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    sowing_date: e.target.value
                  })
                }
              />

              <label>Expected Harvest Date</label>

              <input
                type="date"
                value={cropForm.expected_harvest_date}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    expected_harvest_date: e.target.value
                  })
                }
              />

              <label>Crop Status</label>

              <select
                value={cropForm.status}
                onChange={e =>
                  setCropForm({
                    ...cropForm,
                    status: e.target.value
                  })
                }
              >
                <option>Planned</option>
                <option>Growing</option>
                <option>Harvested</option>
              </select>

              <button
                type="submit"
                className="add-button"
              >
                {editingCropId !== null ? 'Update Crop' : 'Save Crop'}
              </button>
            </form>
          )}

          {/* Saved Crops */}
          <div className="crop-list">
            {cropLoading ? (
              <p>Loading crops...</p>
            ) : crops.length === 0 ? (
              <p>
                No crops added yet. Start by registering
                your first crop!
              </p>
            ) : (
              crops.map(crop => (
                <div
                  className="crop-card"
                  key={crop.id}
                >
                  <div>
                    <h3>{crop.crop_name}</h3>

                    <p>
                      {crop.variety || 'Variety not specified'}
                    </p>
                  </div>

                  <p>
                    Area: {crop.area} {crop.area_unit}
                  </p>

                  <p>
                    Season: {crop.season || 'Not specified'}
                  </p>

                  <p>
                    Sowing Date: {crop.sowing_date
                      ? String(crop.sowing_date).slice(0, 10)
                      : 'Not specified'}
                  </p>

                  <p>
                    Expected Harvest: {crop.expected_harvest_date
                      ? String(crop.expected_harvest_date).slice(0, 10)
                      : 'Not specified'}
                  </p>

                  <span className="crop-status">
                    {crop.status}
                  </span>
                  <div className="crop-actions">
  <button
    type="button"
    className="add-button"
    onClick={() => handleEditCrop(crop)}
  >
    Edit
  </button>

  <button
    type="button"
    className="cancel-button"
    onClick={() => handleDeleteCrop(crop)}
  >
    Delete
  </button>
</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Monthly Financial Reports */}
        <section
          className="content-card reports-section"
          id="reports"
        >
          <h3>Monthly Financial Reports</h3>
          <p>Track your monthly income, expenses and profit.</p>

          {reportLoading ? (
            <p>Loading monthly reports...</p>
          ) : monthlyReports.length === 0 ? (
            <p>No monthly financial data available.</p>
          ) : (
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total Income</th>
                    <th>Total Expenses</th>
                    <th>Net Profit/Loss</th>
                  </tr>
                </thead>

                <tbody>
                  {monthlyReports.map(report => {
                    const profit = Number(report.net_profit);

                    return (
                      <tr key={report.month}>
                        <td>
                          {new Date(`${report.month}-02T00:00:00`)
                            .toLocaleDateString('en-IN', {
                              month: 'long',
                              year: 'numeric'
                            })}
                        </td>

                        <td className="income">
                          ₹{Number(report.total_income).toLocaleString('en-IN')}
                        </td>

                        <td className="expense">
                          ₹{Number(report.total_expenses).toLocaleString('en-IN')}
                        </td>

                        <td className={profit >= 0 ? 'income' : 'expense'}>
                          ₹{profit.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Transaction Modal */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>
                {editingTransactionId !== null
                  ? 'Edit Transaction'
                  : 'Add Transaction'}
              </h2>

              <form onSubmit={handleSubmit}>
                <label>Transaction Type</label>

                <select
                  value={form.type}
                  onChange={e =>
                    setForm({
                      ...form,
                      type: e.target.value
                    })
                  }
                >
                  <option>Income</option>
                  <option>Expense</option>
                </select>

                <label>Description</label>

                <input
                  type="text"
                  placeholder="e.g. Wheat sales"
                  value={form.description}
                  onChange={e =>
                    setForm({
                      ...form,
                      description: e.target.value
                    })
                  }
                  required
                />

                <label>Amount (₹)</label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={e =>
                    setForm({
                      ...form,
                      amount: e.target.value
                    })
                  }
                  required
                />

                <label>Select Crop</label>

                <select
                  value={form.crop_id}
                  onChange={e =>
                    setForm({
                      ...form,
                      crop_id: e.target.value
                    })
                  }
                  disabled={cropLoading}
                >
                  <option value="">
                    General Farm Transaction
                  </option>

                  {crops.map(crop => (
                    <option
                      key={crop.id}
                      value={crop.id}
                    >
                      {crop.crop_name}
                    </option>
                  ))}
                </select>

                <label>Date</label>

                <input
                  type="date"
                  value={form.date}
                  onChange={e =>
                    setForm({
                      ...form,
                      date: e.target.value
                    })
                  }
                  required
                />

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingTransactionId(null);
                      setForm({
                        type: 'Income',
                        description: '',
                        amount: '',
                        date: '',
                        crop_id: ''
                      });
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="add-button"
                  >
                    {editingTransactionId !== null
                      ? 'Update Transaction'
                      : 'Save Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;