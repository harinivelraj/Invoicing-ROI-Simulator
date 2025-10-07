const { calculateROI, validateInput } = require('./roiCalculator');

// Test data from the PRD example
const testInput = {
  monthly_invoice_volume: 2000,
  num_ap_staff: 3,
  avg_hours_per_invoice: 0.17, // 10 minutes
  hourly_wage: 30,
  error_rate_manual: 0.5,
  error_cost: 100,
  time_horizon_months: 36,
  one_time_implementation_cost: 50000
};

console.log('🧪 Testing ROI Calculator');
console.log('========================');

// Test validation
console.log('\n1. Testing Input Validation:');
const validation = validateInput(testInput);
console.log('Validation result:', validation);

// Test calculation
console.log('\n2. Testing ROI Calculation:');
console.log('Input:', testInput);

const results = calculateROI(testInput);
console.log('\nResults:');
console.log(`Monthly Savings: $${results.monthly_savings.toLocaleString()}`);
console.log(`Payback Period: ${results.payback_months} months`);
console.log(`ROI (${testInput.time_horizon_months} months): ${results.roi_percentage}%`);
console.log(`Net Savings: $${results.net_savings.toLocaleString()}`);

console.log('\nBreakdown:');
console.log(`Manual Labor Cost: $${results.breakdown.labor_cost_manual.toLocaleString()}/month`);
console.log(`Automation Cost: $${results.breakdown.automation_cost.toLocaleString()}/month`);
console.log(`Error Savings: $${results.breakdown.error_savings.toLocaleString()}/month`);

// Test edge cases
console.log('\n3. Testing Edge Cases:');

// Test with zero implementation cost
const noImplementationCost = { ...testInput, one_time_implementation_cost: 0 };
const noImplResults = calculateROI(noImplementationCost);
console.log(`No implementation cost ROI: ${noImplResults.roi_percentage}%`);

// Test with invalid input
const invalidInput = { ...testInput, monthly_invoice_volume: -100 };
const invalidValidation = validateInput(invalidInput);
console.log('Invalid input validation:', invalidValidation);

console.log('\n✅ Testing completed!');
console.log('\nExpected ranges (with bias factor):');
console.log('- Monthly Savings: ~$8,000+');
console.log('- Payback Period: ~6-7 months');
console.log('- ROI: >400%');