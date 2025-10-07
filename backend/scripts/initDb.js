const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // Connect to default postgres db first
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    // Create database if it doesn't exist
    await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created successfully`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`Database ${process.env.DB_NAME} already exists`);
    } else {
      console.error('Error creating database:', error);
      throw error;
    }
  } finally {
    client.release();
  }

  // Connect to the new database
  const appPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const appClient = await appPool.connect();

  try {
    // Create scenarios table
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_name VARCHAR(255) NOT NULL,
        monthly_invoice_volume INTEGER NOT NULL,
        num_ap_staff INTEGER NOT NULL,
        avg_hours_per_invoice DECIMAL(4,2) NOT NULL,
        hourly_wage DECIMAL(8,2) NOT NULL,
        error_rate_manual DECIMAL(5,2) NOT NULL,
        error_cost DECIMAL(8,2) NOT NULL,
        time_horizon_months INTEGER NOT NULL,
        one_time_implementation_cost DECIMAL(10,2) DEFAULT 0,
        monthly_savings DECIMAL(10,2),
        cumulative_savings DECIMAL(12,2),
        net_savings DECIMAL(12,2),
        payback_months DECIMAL(6,2),
        roi_percentage DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create reports table for email capture
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scenario_id UUID REFERENCES scenarios(id),
        email VARCHAR(255) NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    appClient.release();
    await appPool.end();
  }

  await pool.end();
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };