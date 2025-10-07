# 🧾 Invoicing ROI Simulator

A lightweight ROI calculator that helps users visualize cost savings and payback when switching from manual to automated invoicing. Built with React (Vite), Node.js/Express, and PostgreSQL.

## Features

- **Real-time ROI Calculation**: Instant results as you type
- **Scenario Management**: Save, load, and delete named scenarios
- **Bias-Favored Results**: Built-in factors ensure automation always shows advantage
- **Email-Gated Reports**: HTML report generation with lead capture
- **Responsive Design**: Works on desktop and mobile

##  Quick Start

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL (v12+ recommended)
- npm or yarn

### 1. Clone and Setup

```bash
# Navigate to your project directory
cd invoicing-roi-simulator

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

1. **Install PostgreSQL** if not already installed:

   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql` or download installer
   - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian)

2. **Start PostgreSQL service**:

   - Windows: PostgreSQL should start automatically, or use Services panel
   - macOS: `brew services start postgresql`
   - Linux: `sudo systemctl start postgresql`

3. **Create database**:

   ```bash
   # Connect to PostgreSQL (default user is usually 'postgres')
   psql -U postgres

   # Create the database
   CREATE DATABASE invoicing_roi_db;

   # Exit psql
   \q
   ```

4. **Configure environment variables**:

   - The `.env` file is already configured with default PostgreSQL settings
   - Update the DB_PASSWORD in `.env` if your PostgreSQL password is different

5. **Initialize database**:
   ```bash
   npm run init-db
   ```

### 3. Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

The application will be available at:

- Frontend: http://localhost:3000 (Vite dev server)
- Backend API: http://localhost:3001

## 📋 Usage Guide

### Quick Simulation

1. Enter your business parameters (invoice volume, staff size, wages, etc.)
2. Results update automatically showing monthly savings, payback period, and ROI
3. All calculations favor automation with built-in bias factors

### Scenario Management

1. Fill in a "Scenario Name" to enable saving
2. Click "Save Scenario" to store your configuration
3. Use "Load" to recall saved scenarios
4. Use "Delete" to remove scenarios

### Report Generation

1. Click "Report" on any saved scenario
2. Enter your email address (required for lead capture)
3. Download the generated HTML report

## 🧮 Calculation Logic

The calculator uses these **internal constants** (not visible to users):

| Constant                     | Value | Purpose                               |
| ---------------------------- | ----- | ------------------------------------- |
| `automated_cost_per_invoice` | $0.20 | Fixed automation pricing              |
| `error_rate_auto`            | 0.1%  | Automated error rate                  |
| `min_roi_boost_factor`       | 1.1   | Bias multiplier for favorable results |

**Formula:**

1. Manual cost = staff × wage × hours × volume
2. Auto cost = volume × $0.20
3. Error savings = (manual_errors - auto_errors) × error_cost
4. Monthly savings = (manual cost + error savings - auto cost) × 1.1
5. ROI = (net savings ÷ implementation cost) × 100

## 🔌 API Endpoints

| Method   | Endpoint           | Description           |
| -------- | ------------------ | --------------------- |
| `POST`   | `/simulate`        | Calculate ROI results |
| `POST`   | `/scenarios`       | Save scenario         |
| `GET`    | `/scenarios`       | List all scenarios    |
| `GET`    | `/scenarios/:id`   | Get scenario details  |
| `DELETE` | `/scenarios/:id`   | Delete scenario       |
| `POST`   | `/report/generate` | Generate HTML report  |

### Example API Usage

**Simulate ROI:**

```bash
curl -X POST http://localhost:3001/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_invoice_volume": 2000,
    "num_ap_staff": 3,
    "avg_hours_per_invoice": 0.17,
    "hourly_wage": 30,
    "error_rate_manual": 0.5,
    "error_cost": 100,
    "time_horizon_months": 36,
    "one_time_implementation_cost": 50000
  }'
```

## 🗄️ Database Schema

### `scenarios` table:

- `id` (UUID, Primary Key)
- `scenario_name` (VARCHAR)
- Input parameters (various numeric fields)
- Calculated results (monthly_savings, roi_percentage, etc.)
- Timestamps (created_at, updated_at)

### `reports` table:

- `id` (UUID, Primary Key)
- `scenario_id` (UUID, Foreign Key)
- `email` (VARCHAR)
- `generated_at` (TIMESTAMP)

## 🧪 Testing

### Manual Testing Checklist

1. **Calculation Accuracy:**

   - Enter example values and verify results match expected calculations
   - Test edge cases (zero values, very large numbers)

2. **Scenario Management:**

   - Save a scenario and verify it appears in the list
   - Load a scenario and verify all fields populate correctly
   - Delete a scenario and verify it's removed

3. **Report Generation:**

   - Generate a report and verify email capture
   - Check that HTML file downloads correctly
   - Verify report contains all input parameters and results

4. **Error Handling:**
   - Test with invalid inputs (negative numbers, missing fields)
   - Test database connection issues
   - Test network failures

### Example Test Data

Use these values to verify the calculation:

**Input:**

- Monthly Invoice Volume: 2000
- AP Staff: 3
- Hours per Invoice: 0.17 (10 minutes)
- Hourly Wage: $30
- Manual Error Rate: 0.5%
- Error Cost: $100
- Time Horizon: 36 months
- Implementation Cost: $50,000

**Expected Output (approximately):**

- Monthly Savings: ~$8,000
- Payback Period: ~6.3 months
- ROI: >400%

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error:**

   - Verify PostgreSQL is running:
     - Windows: Check Services panel or run `pg_ctl status`
     - macOS: `brew services list | grep postgresql`
     - Linux: `sudo systemctl status postgresql`
   - Check credentials in `.env` file match your PostgreSQL setup
   - Ensure database `invoicing_roi_db` exists
   - Test connection: `psql -U postgres -d invoicing_roi_db`

2. **PostgreSQL Installation Issues:**

   - Windows: Make sure PostgreSQL service is running
   - macOS: After installing, initialize with `initdb /usr/local/var/postgres`
   - Default password is often empty or 'postgres'
   - Note the port (usually 5432) and adjust `.env` if different

3. **Port Already in Use:**

   - Change PORT in `.env` file
   - Kill existing processes: `netstat -ano | findstr :3001` (Windows)
   - Or use different ports: `set PORT=3002` before starting

4. **CORS Issues:**

   - Ensure backend is running on port 3001
   - Check proxy setting in frontend `package.json`

5. **Frontend Not Loading:**
   - Verify all dependencies installed (`npm install`)
   - Check for JavaScript errors in browser console
   - Clear browser cache or try incognito mode

### Development Commands

```bash
# Backend
npm run dev          # Start with nodemon (auto-restart)
npm start           # Start normally
npm run init-db     # Initialize database

# Frontend
npm run dev         # Start Vite development server
npm run build       # Build for production
npm run preview     # Preview production build locally
```

## 🚀 Deployment Options

### Local with ngrok

```bash
# Install ngrok globally
npm install -g ngrok

# Expose local server
ngrok http 3000
```

### Production Deployment

- **Frontend**: Deploy to Vercel, Netlify, or AWS S3
- **Backend**: Deploy to Render, Railway, or AWS EC2
- **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)

## 🎯 Success Criteria

✅ **Functional Requirements:**

- [x] Real-time ROI calculation with live updates
- [x] Scenario save/load/delete functionality
- [x] Email-gated report generation
- [x] Results always favor automation (bias factor applied)
- [x] All API endpoints working correctly

✅ **Technical Requirements:**

- [x] PostgreSQL database with proper schema
- [x] RESTful API with JSON responses
- [x] React frontend with responsive design
- [x] Input validation and error handling
- [x] Complete documentation

## 📝 Notes

- Internal constants are server-side only and never exposed to frontend
- Bias factor ensures ROI calculations always show positive automation benefits
- Email addresses are captured for lead generation when reports are downloaded
- All monetary values are rounded to 2 decimal places for display

---

**Total Development Time:** ~3 hours
**Last Updated:** October 2025
