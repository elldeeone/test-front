// Test file for kaspa-utils.js module
// Verifies that all functions import and are callable

import { 
  initialiseKaspaFramework, 
  createTransactionWithIdPattern, 
  signWithKastle, 
  checkTxIdPattern,
  isFrameworkInitialized,
  config 
} from './kaspa-utils.js';

console.log('🧪 Testing kaspa-utils.js module import and function callability...');

// Test 1: Verify all functions are imported and callable
console.log('✅ Test 1: Function imports');
console.log('- initialiseKaspaFramework:', typeof initialiseKaspaFramework);
console.log('- createTransactionWithIdPattern:', typeof createTransactionWithIdPattern);
console.log('- signWithKastle:', typeof signWithKastle);
console.log('- checkTxIdPattern:', typeof checkTxIdPattern);
console.log('- isFrameworkInitialized:', typeof isFrameworkInitialized);
console.log('- config:', typeof config);

// Test 2: Verify config object
console.log('✅ Test 2: Config object');
console.log('Config:', config);

// Test 3: Basic function callability test
console.log('✅ Test 3: Function callability');

// Test checkTxIdPattern with sample data
const testTxId1 = '1234567890abcdef000000'; // Should match 8-bit pattern (24 zero bits)
const testTxId2 = '1234567890abcdef123456'; // Should not match pattern
console.log('- checkTxIdPattern test 1 (should match 8 bits):', checkTxIdPattern(testTxId1, 8));
console.log('- checkTxIdPattern test 2 (should not match 8 bits):', checkTxIdPattern(testTxId2, 8));

// Test isFrameworkInitialized (should be false initially)
console.log('- isFrameworkInitialized (should be false):', isFrameworkInitialized());

// Export test function for App.js to use
export async function runKaspaUtilsTest() {
  console.log('🚀 Running comprehensive kaspa-utils test...');
  
  try {
    // Test framework initialization
    console.log('Testing initialiseKaspaFramework...');
    const initResult = await initialiseKaspaFramework();
    console.log('Initialization result:', initResult);
    console.log('Framework initialized:', isFrameworkInitialized());
    
    // Test pattern creation with low bit count for quick verification
    console.log('Testing createTransactionWithIdPattern...');
    const patternResult = await createTransactionWithIdPattern({
      zeroBits: 4, // Low bit count for quick testing
      maxIterations: 100, // Limited iterations for testing
      payloadData: 'Test transaction'
    });
    console.log('Pattern creation result:', patternResult);
    
    // Test signing function (placeholder)
    console.log('Testing signWithKastle...');
    const signingResult = await signWithKastle({ test: 'data' });
    console.log('Signing result:', signingResult);
    
    return {
      success: true,
      tests: {
        initialization: initResult,
        patternCreation: patternResult,
        signing: signingResult
      }
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

console.log('🎯 kaspa-utils test module ready'); 