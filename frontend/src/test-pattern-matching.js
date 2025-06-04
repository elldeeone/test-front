// Test Pattern Matching - Task 2.2 Validation
// Comprehensive test suite for checkTxIdPattern function

import { checkTxIdPattern } from './kaspa-utils.js';

/**
 * Test suite for Transaction ID Pattern Matching validation
 * Covers edge cases, performance testing, and specific bit patterns
 */
export class PatternMatchingTestSuite {
  constructor() {
    this.testResults = [];
    this.performanceResults = [];
  }

  /**
   * Run all pattern matching tests
   * @returns {Object} Complete test results
   */
  async runAllTests() {
    console.log('🧪 Starting Pattern Matching Test Suite for Task 2.2...');
    
    const results = {
      basicValidation: await this.testBasicValidation(),
      edgeCases: await this.testEdgeCases(),
      fourBitPattern: await this.testFourBitPattern(),
      eightBitPattern: await this.testEightBitPattern(),
      performanceOptimization: await this.testPerformanceOptimization(),
      summary: {}
    };
    
    // Calculate summary
    const allTests = Object.values(results).flat().filter(r => r && r.passed !== undefined);
    const passed = allTests.filter(t => t.passed).length;
    const total = allTests.length;
    
    results.summary = {
      totalTests: total,
      passed,
      failed: total - passed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`
    };
    
    console.log('📊 Test Suite Complete:', results.summary);
    return results;
  }

  /**
   * Test basic input validation and error handling
   */
  async testBasicValidation() {
    console.log('🔍 Testing basic validation...');
    const tests = [];

    // Test invalid TxID inputs
    tests.push(this.createTest(
      'Null TxID',
      () => checkTxIdPattern(null, 4),
      false
    ));

    tests.push(this.createTest(
      'Empty string TxID',
      () => checkTxIdPattern('', 4),
      false
    ));

    tests.push(this.createTest(
      'Non-string TxID',
      () => checkTxIdPattern(12345, 4),
      false
    ));

    tests.push(this.createTest(
      'Invalid hex TxID',
      () => checkTxIdPattern('xyz123', 4),
      false
    ));

    // Test invalid zeroBits inputs
    tests.push(this.createTest(
      'Zero bits',
      () => checkTxIdPattern('abcd1234', 0),
      false
    ));

    tests.push(this.createTest(
      'Negative bits',
      () => checkTxIdPattern('abcd1234', -1),
      false
    ));

    tests.push(this.createTest(
      'Non-integer bits',
      () => checkTxIdPattern('abcd1234', 4.5),
      false
    ));

    tests.push(this.createTest(
      'Too many bits',
      () => checkTxIdPattern('abcd1234', 65),
      false
    ));

    // Test valid inputs
    tests.push(this.createTest(
      'Valid input with 0x prefix',
      () => checkTxIdPattern('0xabcd1230', 4),
      true
    ));

    tests.push(this.createTest(
      'Valid input without prefix',
      () => checkTxIdPattern('abcd1230', 4),
      true
    ));

    return tests;
  }

  /**
   * Test edge cases and boundary conditions
   */
  async testEdgeCases() {
    console.log('🔍 Testing edge cases...');
    const tests = [];

    // Test minimum TxID length scenarios
    tests.push(this.createTest(
      'Single hex char - 1 bit',
      () => checkTxIdPattern('0', 1),
      true
    ));

    tests.push(this.createTest(
      'Single hex char - 4 bits',
      () => checkTxIdPattern('0', 4),
      true
    ));

    tests.push(this.createTest(
      'Two hex chars - 8 bits',
      () => checkTxIdPattern('00', 8),
      true
    ));

    // Test boundary bit counts
    tests.push(this.createTest(
      'Boundary: 16 bits (optimization threshold)',
      () => checkTxIdPattern('abcd0000', 16),
      true
    ));

    tests.push(this.createTest(
      'Boundary: 17 bits (buffer method)',
      () => checkTxIdPattern('abcd00000', 17),
      true
    ));

    // Test partial bit matching
    tests.push(this.createTest(
      'Partial bits: 3 bits in hex 8 (1000)',
      () => checkTxIdPattern('12348', 3),
      true
    ));

    tests.push(this.createTest(
      'Partial bits: 2 bits in hex 4 (0100)',
      () => checkTxIdPattern('12344', 2),
      true
    ));

    tests.push(this.createTest(
      'Partial bits: 1 bit in hex 2 (0010)',
      () => checkTxIdPattern('12342', 1),
      true
    ));

    // Test uppercase/lowercase hex
    tests.push(this.createTest(
      'Uppercase hex',
      () => checkTxIdPattern('ABCD0000', 16),
      true
    ));

    tests.push(this.createTest(
      'Mixed case hex',
      () => checkTxIdPattern('AbCd0000', 16),
      true
    ));

    return tests;
  }

  /**
   * Test 4-bit pattern matching (16 combinations average)
   * Task 2.2 specific requirement
   */
  async testFourBitPattern() {
    console.log('🎯 Testing 4-bit pattern matching...');
    const tests = [];

    // Known good 4-bit patterns (ending in 0000)
    const goodFourBit = [
      'a1b2c3d40000',
      '123456780000', 
      'deadbeef0000',
      'cafe000000000',
      '00000'
    ];

    goodFourBit.forEach((txId, index) => {
      tests.push(this.createTest(
        `4-bit pattern match ${index + 1}: ${txId}`,
        () => checkTxIdPattern(txId, 4),
        true
      ));
    });

    // Known bad 4-bit patterns (last 4 bits are NOT all zero)
    const badFourBit = [
      'a1b2c3d40001', // ends in 0001 - last 4 bits: 0001
      'a1b2c3d40002', // ends in 0002 - last 4 bits: 0010  
      'a1b2c3d4000f', // ends in 000f - last 4 bits: 1111
      'a1b2c3d40011', // ends in 0011 - last 4 bits: 0001
      'a1b2c3d4ffff'  // ends in ffff - last 4 bits: 1111
    ];

    badFourBit.forEach((txId, index) => {
      tests.push(this.createTest(
        `4-bit pattern fail ${index + 1}: ${txId}`,
        () => checkTxIdPattern(txId, 4),
        false
      ));
    });

    // Test performance expectation for 4-bit pattern
    const performanceTest = await this.measurePerformance(4, 100);
    tests.push(this.createTest(
      '4-bit pattern performance',
      () => performanceTest.averageTime < 1000, // Should be under 1 second
      true,
      `Average time: ${performanceTest.averageTime}ms for ${performanceTest.iterations} tests`
    ));

    return tests;
  }

  /**
   * Test 8-bit pattern matching (256 combinations average)
   * Task 2.2 specific requirement  
   */
  async testEightBitPattern() {
    console.log('🎯 Testing 8-bit pattern matching...');
    const tests = [];

    // Known good 8-bit patterns (ending in 00000000)
    const goodEightBit = [
      'a1b2c3d400000000',
      '12345678fedcba9800000000',
      'deadbeefcafe000000000000',
      '000000000000'
    ];

    goodEightBit.forEach((txId, index) => {
      tests.push(this.createTest(
        `8-bit pattern match ${index + 1}: ${txId}`,
        () => checkTxIdPattern(txId, 8),
        true
      ));
    });

    // Known bad 8-bit patterns (last 8 bits are NOT all zero)
    const badEightBit = [
      'a1b2c3d400000001', // ends in 00000001 - last 8 bits: 00000001
      'a1b2c3d400000010', // ends in 00000010 - last 8 bits: 00010000
      'a1b2c3d4000000ff', // ends in 000000ff - last 8 bits: 11111111
      'a1b2c3d400000101', // ends in 00000101 - last 8 bits: 00000001
      'a1b2c3d4ffffffff'  // ends in ffffffff - last 8 bits: 11111111
    ];

    badEightBit.forEach((txId, index) => {
      tests.push(this.createTest(
        `8-bit pattern fail ${index + 1}: ${txId}`,
        () => checkTxIdPattern(txId, 8),
        false
      ));
    });

    // Test performance expectation for 8-bit pattern
    const performanceTest = await this.measurePerformance(8, 50);
    tests.push(this.createTest(
      '8-bit pattern performance',
      () => performanceTest.averageTime < 5000, // Should be under 5 seconds  
      true,
      `Average time: ${performanceTest.averageTime}ms for ${performanceTest.iterations} tests`
    ));

    return tests;
  }

  /**
   * Test performance optimization between string and buffer methods
   */
  async testPerformanceOptimization() {
    console.log('⚡ Testing performance optimization...');
    const tests = [];

    // Test that small patterns use optimized method
    const smallPatternTime = await this.measurePatternCheckTime('abcd1230', 4, 1000);
    const largePatternTime = await this.measurePatternCheckTime('abcd123000000000', 20, 1000);

    tests.push(this.createTest(
      'Small pattern optimization (≤16 bits faster)',
      () => smallPatternTime.averageTime < largePatternTime.averageTime,
      true,
      `Small: ${smallPatternTime.averageTime}ms, Large: ${largePatternTime.averageTime}ms`
    ));

    // Test verbose mode doesn't significantly impact performance
    const verboseTime = await this.measurePatternCheckTime('abcd1230', 4, 1000, true);
    const silentTime = await this.measurePatternCheckTime('abcd1230', 4, 1000, false);
    
    // Handle case where times might be 0 (very fast execution)
    const verboseOverhead = silentTime.averageTime === 0 ? 0 : 
      (verboseTime.averageTime / silentTime.averageTime) - 1;

    tests.push(this.createTest(
      'Verbose mode overhead acceptable',
      () => verboseOverhead < 10.0 || silentTime.averageTime === 0, // Less than 1000% overhead, or both very fast
      true,
      `Verbose overhead: ${verboseOverhead === 0 ? 'N/A (too fast)' : (verboseOverhead * 100).toFixed(1) + '%'}`
    ));

    return tests;
  }

  /**
   * Helper method to create standardized test objects
   */
  createTest(name, testFn, expectedResult, details = '') {
    try {
      const result = testFn();
      const passed = result === expectedResult;
      
      if (!passed) {
        console.log(`❌ ${name}: Expected ${expectedResult}, got ${result}`);
      } else {
        console.log(`✅ ${name}${details ? ` (${details})` : ''}`);
      }
      
      return {
        name,
        passed,
        expected: expectedResult,
        actual: result,
        details
      };
    } catch (error) {
      console.log(`💥 ${name}: Error - ${error.message}`);
      return {
        name,
        passed: false,
        expected: expectedResult,
        actual: 'ERROR',
        error: error.message,
        details
      };
    }
  }

  /**
   * Measure performance of pattern checking
   */
  async measurePatternCheckTime(txId, bitCount, iterations, verbose = false) {
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      checkTxIdPattern(txId, bitCount, verbose);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    
    return {
      totalTime,
      averageTime,
      iterations
    };
  }

  /**
   * Measure realistic performance for pattern search simulation
   */
  async measurePerformance(bitCount, testIterations) {
    console.log(`⏱️ Measuring performance for ${bitCount}-bit pattern...`);
    
    const times = [];
    
    for (let i = 0; i < testIterations; i++) {
      // Generate a random TxID
      const randomTxId = this.generateRandomTxId(64);
      
      const startTime = Date.now();
      checkTxIdPattern(randomTxId, bitCount);
      const endTime = Date.now();
      
      times.push(endTime - startTime);
    }
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    
    return {
      averageTime,
      maxTime,
      minTime,
      iterations: testIterations
    };
  }

  /**
   * Generate random hex TxID for testing
   */
  generateRandomTxId(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Export convenience function to run tests
export async function runPatternMatchingTests() {
  const testSuite = new PatternMatchingTestSuite();
  return await testSuite.runAllTests();
}

console.log('🧪 Pattern Matching Test Suite loaded successfully'); 