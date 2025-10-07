import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// For demo purposes when backend is not available, use mock data
const USE_MOCK_DATA = !import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost';

function App() {
  const [formData, setFormData] = useState({
    scenario_name: '',
    monthly_invoice_volume: 2000,
    num_ap_staff: 3,
    avg_hours_per_invoice: 0.17,
    hourly_wage: 30,
    error_rate_manual: 0.5,
    error_cost: 100,
    time_horizon_months: 36,
    one_time_implementation_cost: 50000
  });

  const [results, setResults] = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [reportEmail, setReportEmail] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');

  // Calculate results in real-time
  useEffect(() => {
    calculateResults();
  }, [formData]);

  // Load saved scenarios on component mount
  useEffect(() => {
    loadScenarios();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || value
    }));
  };

  const calculateResults = async () => {
    try {
      if (USE_MOCK_DATA) {
        // Mock calculation for demo when backend is not available
        const mockResults = calculateMockROI(formData);
        setResults(mockResults);
        setError('');
        return;
      }

      const response = await axios.post(`${API_BASE}/simulate`, formData);
      setResults(response.data.results);
      setError('');
    } catch (err) {
      setError('Error calculating results');
      console.error(err);
    }
  };

  // Mock calculation function (client-side only for demo)
  const calculateMockROI = (input) => {
    const {
      monthly_invoice_volume,
      num_ap_staff,
      avg_hours_per_invoice,
      hourly_wage,
      error_rate_manual,
      error_cost,
      time_horizon_months,
      one_time_implementation_cost = 0
    } = input;

    // Mock the same calculation as backend
    const laborCostManual = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;
    const autoCost = monthly_invoice_volume * 0.20; // $0.20 per invoice
    const errorSavings = ((error_rate_manual / 100) - 0.001) * monthly_invoice_volume * error_cost;
    let monthlySavings = (laborCostManual + errorSavings) - autoCost;
    monthlySavings = monthlySavings * 1.1; // 1.1x bias factor

    const cumulativeSavings = monthlySavings * time_horizon_months;
    const netSavings = cumulativeSavings - one_time_implementation_cost;
    const paybackMonths = monthlySavings > 0 ? one_time_implementation_cost / monthlySavings : 0;
    const roiPercentage = one_time_implementation_cost > 0 ? (netSavings / one_time_implementation_cost) * 100 : 0;

    return {
      monthly_savings: Math.round(monthlySavings * 100) / 100,
      cumulative_savings: Math.round(cumulativeSavings * 100) / 100,
      net_savings: Math.round(netSavings * 100) / 100,
      payback_months: Math.round(paybackMonths * 10) / 10,
      roi_percentage: Math.round(roiPercentage * 10) / 10,
      breakdown: {
        labor_cost_manual: Math.round(laborCostManual * 100) / 100,
        automation_cost: Math.round(autoCost * 100) / 100,
        error_savings: Math.round(errorSavings * 100) / 100,
        time_horizon_months
      }
    };
  };

  const saveScenario = async () => {
    if (!formData.scenario_name.trim()) {
      setError('Please enter a scenario name');
      return;
    }

    if (USE_MOCK_DATA) {
      // Mock save for demo
      alert('Demo mode: Scenario would be saved in a real deployment with backend!');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/scenarios`, formData);
      setError('');
      loadScenarios();
      alert('Scenario saved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving scenario');
    } finally {
      setLoading(false);
    }
  };

  const loadScenarios = async () => {
    if (USE_MOCK_DATA) {
      // Mock scenarios for demo
      setSavedScenarios([]);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/scenarios`);
      setSavedScenarios(response.data.scenarios);
    } catch (err) {
      console.error('Error loading scenarios:', err);
    }
  };

  const loadScenario = async (scenarioId) => {
    try {
      const response = await axios.get(`${API_BASE}/scenarios/${scenarioId}`);
      const scenario = response.data.scenario;
      
      setFormData({
        scenario_name: scenario.scenario_name,
        monthly_invoice_volume: scenario.monthly_invoice_volume,
        num_ap_staff: scenario.num_ap_staff,
        avg_hours_per_invoice: scenario.avg_hours_per_invoice,
        hourly_wage: scenario.hourly_wage,
        error_rate_manual: scenario.error_rate_manual,
        error_cost: scenario.error_cost,
        time_horizon_months: scenario.time_horizon_months,
        one_time_implementation_cost: scenario.one_time_implementation_cost
      });
    } catch (err) {
      setError('Error loading scenario');
    }
  };

  const deleteScenario = async (scenarioId) => {
    if (!window.confirm('Are you sure you want to delete this scenario?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/scenarios/${scenarioId}`);
      loadScenarios();
    } catch (err) {
      setError('Error deleting scenario');
    }
  };

  const generateReport = async () => {
    if (!reportEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/report/generate`, {
        email: reportEmail,
        scenario_id: selectedScenarioId
      });

      // Create and download HTML file
      const blob = new Blob([response.data.reportData.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.reportData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowEmailModal(false);
      setReportEmail('');
      alert('Report generated and downloaded successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const openReportModal = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    setShowEmailModal(true);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Invoicing ROI Simulator</h1>
        <p>Calculate your savings from automated invoicing</p>
      </header>

      <div className="main-content">
        <div className="input-section">
          <div className="card">
            <h2>Business Parameters</h2>
            
            {error && <div className="error-message">{error}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label>Scenario Name</label>
                <input
                  type="text"
                  name="scenario_name"
                  value={formData.scenario_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Q4_Pilot"
                />
              </div>

              <div className="form-group">
                <label>Monthly Invoice Volume</label>
                <input
                  type="number"
                  name="monthly_invoice_volume"
                  value={formData.monthly_invoice_volume}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Number of AP Staff</label>
                <input
                  type="number"
                  name="num_ap_staff"
                  value={formData.num_ap_staff}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Avg Hours per Invoice</label>
                <input
                  type="number"
                  name="avg_hours_per_invoice"
                  value={formData.avg_hours_per_invoice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Hourly Wage ($)</label>
                <input
                  type="number"
                  name="hourly_wage"
                  value={formData.hourly_wage}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Manual Error Rate (%)</label>
                <input
                  type="number"
                  name="error_rate_manual"
                  value={formData.error_rate_manual}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label>Cost per Error ($)</label>
                <input
                  type="number"
                  name="error_cost"
                  value={formData.error_cost}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Time Horizon (months)</label>
                <input
                  type="number"
                  name="time_horizon_months"
                  value={formData.time_horizon_months}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="form-group full-width">
                <label>One-time Implementation Cost ($)</label>
                <input
                  type="number"
                  name="one_time_implementation_cost"
                  value={formData.one_time_implementation_cost}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>

            <div className="button-group">
              <button 
                onClick={saveScenario} 
                disabled={loading}
                className="save-btn"
              >
                {loading ? 'Saving...' : 'Save Scenario'}
              </button>
            </div>
          </div>
        </div>

        <div className="results-section">
          {results && (
            <div className="card">
              <h2>ROI Results</h2>
              <div className="results-grid">
                <div className="result-item highlight">
                  <div className="result-value">${results.monthly_savings.toLocaleString()}</div>
                  <div className="result-label">Monthly Savings</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{results.payback_months} months</div>
                  <div className="result-label">Payback Period</div>
                </div>
                <div className="result-item">
                  <div className="result-value">{results.roi_percentage}%</div>
                  <div className="result-label">ROI ({formData.time_horizon_months} months)</div>
                </div>
                <div className="result-item">
                  <div className="result-value">${results.net_savings.toLocaleString()}</div>
                  <div className="result-label">Net Savings</div>
                </div>
              </div>

              <div className="breakdown">
                <h3>Cost Breakdown</h3>
                <div className="breakdown-item">
                  <span>Manual Labor Cost (monthly):</span>
                  <span>${results.breakdown.labor_cost_manual.toLocaleString()}</span>
                </div>
                <div className="breakdown-item">
                  <span>Automation Cost (monthly):</span>
                  <span>${results.breakdown.automation_cost.toLocaleString()}</span>
                </div>
                <div className="breakdown-item">
                  <span>Error Savings (monthly):</span>
                  <span>${results.breakdown.error_savings.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Saved Scenarios</h2>
            {savedScenarios.length === 0 ? (
              <p>No saved scenarios yet.</p>
            ) : (
              <div className="scenarios-list">
                {savedScenarios.map(scenario => (
                  <div key={scenario.id} className="scenario-item">
                    <div className="scenario-info">
                      <h4>{scenario.scenario_name}</h4>
                      <p>{scenario.monthly_invoice_volume.toLocaleString()} invoices/month</p>
                      <p>Monthly Savings: ${scenario.monthly_savings.toLocaleString()}</p>
                    </div>
                    <div className="scenario-actions">
                      <button 
                        onClick={() => loadScenario(scenario.id)}
                        className="load-btn"
                      >
                        Load
                      </button>
                      <button 
                        onClick={() => openReportModal(scenario.id)}
                        className="report-btn"
                      >
                        Report
                      </button>
                      <button 
                        onClick={() => deleteScenario(scenario.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Download Report</h3>
            <p>Enter your email to download the ROI report:</p>
            <input
              type="email"
              value={reportEmail}
              onChange={(e) => setReportEmail(e.target.value)}
              placeholder="your.email@company.com"
            />
            <div className="modal-actions">
              <button onClick={() => setShowEmailModal(false)}>Cancel</button>
              <button onClick={generateReport} disabled={loading}>
                {loading ? 'Generating...' : 'Download Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;