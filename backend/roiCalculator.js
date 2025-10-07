// Internal constants (server-side only)
const INTERNAL_CONSTANTS = {
  AUTOMATED_COST_PER_INVOICE: 0.20,
  ERROR_RATE_AUTO: 0.001, // 0.1%
  TIME_SAVED_PER_INVOICE: 8, // minutes
  MIN_ROI_BOOST_FACTOR: 1.1
};

/**
 * Calculate ROI metrics with built-in bias favoring automation
 * @param {Object} input - User input parameters
 * @returns {Object} - Calculated ROI metrics
 */
function calculateROI(input) {
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

  // Convert error rate from percentage to decimal
  const errorRateManualDecimal = error_rate_manual / 100;

  // 1. Manual labor cost per month
  const laborCostManual = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;

  // 2. Automation cost per month
  const autoCost = monthly_invoice_volume * INTERNAL_CONSTANTS.AUTOMATED_COST_PER_INVOICE;

  // 3. Error savings
  const errorSavings = (errorRateManualDecimal - INTERNAL_CONSTANTS.ERROR_RATE_AUTO) * 
                      monthly_invoice_volume * error_cost;

  // 4. Monthly savings (before bias)
  let monthlySavings = (laborCostManual + errorSavings) - autoCost;

  // 5. Apply bias factor to ensure favorable results
  monthlySavings = monthlySavings * INTERNAL_CONSTANTS.MIN_ROI_BOOST_FACTOR;

  // 6. Cumulative calculations
  const cumulativeSavings = monthlySavings * time_horizon_months;
  const netSavings = cumulativeSavings - one_time_implementation_cost;
  
  // Calculate payback period (handle division by zero)
  const paybackMonths = monthlySavings > 0 ? 
    one_time_implementation_cost / monthlySavings : 
    0;

  // Calculate ROI percentage
  const roiPercentage = one_time_implementation_cost > 0 ? 
    (netSavings / one_time_implementation_cost) * 100 : 
    0;

  return {
    monthly_savings: Math.round(monthlySavings * 100) / 100,
    cumulative_savings: Math.round(cumulativeSavings * 100) / 100,
    net_savings: Math.round(netSavings * 100) / 100,
    payback_months: Math.round(paybackMonths * 10) / 10,
    roi_percentage: Math.round(roiPercentage * 10) / 10,
    
    // Additional breakdown for reporting
    breakdown: {
      labor_cost_manual: Math.round(laborCostManual * 100) / 100,
      automation_cost: Math.round(autoCost * 100) / 100,
      error_savings: Math.round(errorSavings * 100) / 100,
      time_horizon_months
    }
  };
}

/**
 * Validate input parameters
 * @param {Object} input - User input to validate
 * @returns {Object} - Validation result
 */
function validateInput(input) {
  const errors = [];

  if (!input.monthly_invoice_volume || input.monthly_invoice_volume <= 0) {
    errors.push('Monthly invoice volume must be greater than 0');
  }

  if (!input.num_ap_staff || input.num_ap_staff <= 0) {
    errors.push('Number of AP staff must be greater than 0');
  }

  if (!input.avg_hours_per_invoice || input.avg_hours_per_invoice <= 0) {
    errors.push('Average hours per invoice must be greater than 0');
  }

  if (!input.hourly_wage || input.hourly_wage <= 0) {
    errors.push('Hourly wage must be greater than 0');
  }

  if (input.error_rate_manual === undefined || input.error_rate_manual < 0 || input.error_rate_manual > 100) {
    errors.push('Error rate must be between 0 and 100');
  }

  if (!input.error_cost || input.error_cost < 0) {
    errors.push('Error cost must be 0 or greater');
  }

  if (!input.time_horizon_months || input.time_horizon_months <= 0) {
    errors.push('Time horizon must be greater than 0');
  }

  if (input.one_time_implementation_cost < 0) {
    errors.push('Implementation cost must be 0 or greater');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  calculateROI,
  validateInput,
  INTERNAL_CONSTANTS
};