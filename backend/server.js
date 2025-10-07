const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const db = require('./db');
const { calculateROI, validateInput } = require('./roiCalculator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// POST /simulate - Run simulation and return JSON results
app.post('/simulate', async (req, res) => {
  try {
    const validation = validateInput(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const results = calculateROI(req.body);
    
    res.json({
      success: true,
      input: req.body,
      results
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /scenarios - Save a scenario
app.post('/scenarios', async (req, res) => {
  try {
    const validation = validateInput(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    if (!req.body.scenario_name || req.body.scenario_name.trim() === '') {
      return res.status(400).json({
        error: 'Scenario name is required'
      });
    }

    const results = calculateROI(req.body);
    const id = uuidv4();

    const query = `
      INSERT INTO scenarios (
        id, scenario_name, monthly_invoice_volume, num_ap_staff, 
        avg_hours_per_invoice, hourly_wage, error_rate_manual, 
        error_cost, time_horizon_months, one_time_implementation_cost,
        monthly_savings, cumulative_savings, net_savings, 
        payback_months, roi_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      id,
      req.body.scenario_name,
      req.body.monthly_invoice_volume,
      req.body.num_ap_staff,
      req.body.avg_hours_per_invoice,
      req.body.hourly_wage,
      req.body.error_rate_manual,
      req.body.error_cost,
      req.body.time_horizon_months,
      req.body.one_time_implementation_cost || 0,
      results.monthly_savings,
      results.cumulative_savings,
      results.net_savings,
      results.payback_months,
      results.roi_percentage
    ];

    const result = await db.query(query, values);
    
    res.status(201).json({
      success: true,
      scenario: result.rows[0],
      results
    });
  } catch (error) {
    console.error('Save scenario error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({
        error: 'Scenario name already exists'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
});

// GET /scenarios - List all scenarios
app.get('/scenarios', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, scenario_name, monthly_invoice_volume, num_ap_staff,
        avg_hours_per_invoice, hourly_wage, error_rate_manual,
        error_cost, time_horizon_months, one_time_implementation_cost,
        monthly_savings, cumulative_savings, net_savings,
        payback_months, roi_percentage, created_at, updated_at
      FROM scenarios 
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query);
    
    res.json({
      success: true,
      scenarios: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('List scenarios error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /scenarios/:id - Retrieve scenario details
app.get('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, scenario_name, monthly_invoice_volume, num_ap_staff,
        avg_hours_per_invoice, hourly_wage, error_rate_manual,
        error_cost, time_horizon_months, one_time_implementation_cost,
        monthly_savings, cumulative_savings, net_savings,
        payback_months, roi_percentage, created_at, updated_at
      FROM scenarios 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Scenario not found'
      });
    }
    
    res.json({
      success: true,
      scenario: result.rows[0]
    });
  } catch (error) {
    console.error('Get scenario error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /scenarios/:id - Delete a scenario
app.delete('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete associated reports
    await db.query('DELETE FROM reports WHERE scenario_id = $1', [id]);
    
    // Then delete the scenario
    const query = 'DELETE FROM scenarios WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Scenario not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Scenario deleted successfully'
    });
  } catch (error) {
    console.error('Delete scenario error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /report/generate - Generate a report (email required)
app.post('/report/generate', async (req, res) => {
  try {
    const { email, scenario_id } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Valid email address is required'
      });
    }
    
    if (!scenario_id) {
      return res.status(400).json({
        error: 'Scenario ID is required'
      });
    }
    
    // Get scenario details
    const scenarioQuery = 'SELECT * FROM scenarios WHERE id = $1';
    const scenarioResult = await db.query(scenarioQuery, [scenario_id]);
    
    if (scenarioResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Scenario not found'
      });
    }
    
    const scenario = scenarioResult.rows[0];
    
    // Log email for lead capture
    const reportQuery = `
      INSERT INTO reports (scenario_id, email) 
      VALUES ($1, $2) 
      RETURNING id
    `;
    await db.query(reportQuery, [scenario_id, email]);
    
    // Generate HTML report
    const htmlReport = generateHTMLReport(scenario);
    
    res.json({
      success: true,
      message: 'Report generated successfully',
      reportData: {
        html: htmlReport,
        filename: `ROI_Report_${scenario.scenario_name}_${new Date().toISOString().split('T')[0]}.html`
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Function to generate HTML report
function generateHTMLReport(scenario) {
  const date = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>ROI Report - ${scenario.scenario_name}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
            .content { margin: 20px 0; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
            .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #059669; }
            .metric-label { color: #64748b; font-size: 14px; }
            .summary { background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Invoicing ROI Analysis Report</h1>
            <p>Scenario: ${scenario.scenario_name} | Generated: ${date}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <h2>Executive Summary</h2>
                <p>This analysis demonstrates the significant cost savings and return on investment achievable by automating your invoicing process. Based on your current manual processing costs and projected automation benefits, the results strongly favor implementing an automated solution.</p>
            </div>
            
            <div class="metrics">
                <div class="metric-card">
                    <div class="metric-value">$${scenario.monthly_savings.toLocaleString()}</div>
                    <div class="metric-label">Monthly Savings</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${scenario.payback_months} months</div>
                    <div class="metric-label">Payback Period</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${scenario.roi_percentage}%</div>
                    <div class="metric-label">ROI (${scenario.time_horizon_months} months)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">$${scenario.net_savings.toLocaleString()}</div>
                    <div class="metric-label">Net Savings</div>
                </div>
            </div>
            
            <h2>Input Parameters</h2>
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>Monthly Invoice Volume</td><td>${scenario.monthly_invoice_volume.toLocaleString()}</td></tr>
                <tr><td>AP Staff Count</td><td>${scenario.num_ap_staff}</td></tr>
                <tr><td>Avg Hours per Invoice</td><td>${scenario.avg_hours_per_invoice}</td></tr>
                <tr><td>Hourly Wage</td><td>$${scenario.hourly_wage}</td></tr>
                <tr><td>Manual Error Rate</td><td>${scenario.error_rate_manual}%</td></tr>
                <tr><td>Error Cost</td><td>$${scenario.error_cost}</td></tr>
                <tr><td>Time Horizon</td><td>${scenario.time_horizon_months} months</td></tr>
                <tr><td>Implementation Cost</td><td>$${scenario.one_time_implementation_cost.toLocaleString()}</td></tr>
            </table>
            
            <h2>Financial Impact</h2>
            <table>
                <tr><th>Metric</th><th>Amount</th></tr>
                <tr><td>Monthly Savings</td><td>$${scenario.monthly_savings.toLocaleString()}</td></tr>
                <tr><td>Cumulative Savings (${scenario.time_horizon_months} months)</td><td>$${scenario.cumulative_savings.toLocaleString()}</td></tr>
                <tr><td>Implementation Cost</td><td>$${scenario.one_time_implementation_cost.toLocaleString()}</td></tr>
                <tr><td><strong>Net Savings</strong></td><td><strong>$${scenario.net_savings.toLocaleString()}</strong></td></tr>
            </table>
            
            <div style="margin-top: 40px; padding: 20px; background: #f0f9ff; border-radius: 8px;">
                <h3>Next Steps</h3>
                <ul>
                    <li>Review these projections with your finance team</li>
                    <li>Consider piloting automation with a subset of invoices</li>
                    <li>Plan implementation timeline and resource allocation</li>
                    <li>Establish KPIs to measure actual vs. projected savings</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});