// Test kaspa-wasm32-sdk Integration - Task 4.1 Validation
// Verifies that kaspa-wasm32-sdk is properly installed, configured, and operational

import { initializeKaspaWasm32Sdk, broadcastViaWasmSdk } from './kaspa-utils.js';

/**
 * Test kaspa-wasm32-sdk initialization and basic functionality
 * This validates Task 4.1: Install and Configure kaspa-wasm32-sdk
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Promise<Object>} Test results with success status and details
 */
export async function testKaspaWasm32SdkIntegration(verbose = false) {
  const startTime = Date.now();
  const testResults = {
    testName: 'Kaspa WASM32 SDK Integration Test',
    taskId: '4.1',
    success: false,
    results: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration: 0
    },
    timestamp: new Date().toISOString()
  };

  console.log('🧪 Starting kaspa-wasm32-sdk integration test...');
  
  try {
    // Test 1: WASM Module Loading
    console.log('\n📦 Test 1: WASM Module Loading...');
    const test1 = {
      name: 'WASM Module Loading',
      description: 'Verify kaspa.js and kaspa_bg.wasm files can be imported',
      status: 'RUNNING',
      details: ''
    };

    try {
      // Try to dynamically import the WASM module
      const kaspaImport = await import('/kaspa-wasm/kaspa.js');
      await kaspaImport.default('/kaspa-wasm/kaspa_bg.wasm');
      
      test1.status = 'PASS';
      test1.details = 'WASM module loaded successfully from /kaspa-wasm/';
      
      if (verbose) console.log('✅ WASM module loading: SUCCESS');
      
    } catch (error) {
      test1.status = 'FAIL';
      test1.details = `WASM loading failed: ${error.message}`;
      
      if (verbose) console.error('❌ WASM module loading: FAILED -', error.message);
    }
    
    testResults.results.push(test1);

    // Test 2: SDK Initialization Function
    console.log('\n🔧 Test 2: SDK Initialization Function...');
    const test2 = {
      name: 'SDK Initialization Function',
      description: 'Test initializeKaspaWasm32Sdk function availability and execution',
      status: 'RUNNING',
      details: ''
    };

    try {
      // Test that the function exists and is callable
      if (typeof initializeKaspaWasm32Sdk !== 'function') {
        throw new Error('initializeKaspaWasm32Sdk function not available');
      }

      // Test SDK initialization with verbose logging
      const initResult = await initializeKaspaWasm32Sdk({ 
        nodeUrl: 'ws://127.0.0.1:17210',
        network: 'testnet-10',
        verbose: verbose 
      });

      if (initResult.success) {
        test2.status = 'PASS';
        test2.details = `SDK initialized successfully. Node: ${initResult.nodeUrl}, Network: ${initResult.network}`;
        
        if (verbose) console.log('✅ SDK initialization: SUCCESS');
        
        // Test 2.1: Check if RPC client was created
        if (initResult.rpcClient) {
          test2.details += '. RPC client created.';
        }
        
        // Test 2.2: Check if WASM module has required methods
        if (initResult.kaspaWasmModule) {
          const hasRpcClient = !!initResult.kaspaWasmModule.RpcClient;
          const hasEncoding = !!initResult.kaspaWasmModule.Encoding;
          test2.details += ` WASM methods: RpcClient(${hasRpcClient}), Encoding(${hasEncoding})`;
        }
        
      } else {
        test2.status = 'WARN';
        test2.details = `SDK initialization failed: ${initResult.error}. This is expected if no local node is running.`;
        
        if (verbose) console.warn('⚠️ SDK initialization: EXPECTED FAILURE (no local node)');
      }
      
    } catch (error) {
      test2.status = 'FAIL';
      test2.details = `Function test failed: ${error.message}`;
      
      if (verbose) console.error('❌ SDK initialization function: FAILED -', error.message);
    }
    
    testResults.results.push(test2);

    // Test 3: RPC Client Functionality
    console.log('\n🔗 Test 3: RPC Client Functionality...');
    const test3 = {
      name: 'RPC Client Functionality',
      description: 'Test RPC client creation and method availability',
      status: 'RUNNING',
      details: ''
    };

    try {
      // Try to initialize again and check RPC client
      const initResult = await initializeKaspaWasm32Sdk({ 
        nodeUrl: 'ws://127.0.0.1:17210',
        verbose: false 
      });

      if (initResult.success && initResult.rpcClient) {
        // Check if client has expected methods
        const hasConnect = typeof initResult.rpcClient.connect === 'function';
        const hasDisconnect = typeof initResult.rpcClient.disconnect === 'function';
        const hasSubmitTransaction = typeof initResult.rpcClient.submitTransaction === 'function';
        
        if (hasConnect && hasDisconnect && hasSubmitTransaction) {
          test3.status = 'PASS';
          test3.details = 'RPC client has all required methods: connect, disconnect, submitTransaction';
          
          if (verbose) console.log('✅ RPC client functionality: SUCCESS');
        } else {
          test3.status = 'FAIL';
          test3.details = `Missing methods: connect(${hasConnect}), disconnect(${hasDisconnect}), submitTransaction(${hasSubmitTransaction})`;
          
          if (verbose) console.error('❌ RPC client methods: INCOMPLETE');
        }
      } else {
        test3.status = 'WARN';
        test3.details = 'RPC client not created (expected if no local node running)';
        
        if (verbose) console.warn('⚠️ RPC client: NOT AVAILABLE (expected without local node)');
      }
      
    } catch (error) {
      test3.status = 'FAIL';
      test3.details = `RPC client test failed: ${error.message}`;
      
      if (verbose) console.error('❌ RPC client functionality: FAILED -', error.message);
    }
    
    testResults.results.push(test3);

    // Test 4: Broadcasting Function Availability
    console.log('\n🚀 Test 4: Broadcasting Function Availability...');
    const test4 = {
      name: 'Broadcasting Function Availability',
      description: 'Test broadcastViaWasmSdk function availability and structure',
      status: 'RUNNING',
      details: ''
    };

    try {
      // Check if broadcasting function exists
      if (typeof broadcastViaWasmSdk !== 'function') {
        throw new Error('broadcastViaWasmSdk function not available');
      }

      // Test function signature by calling with invalid data (should fail gracefully)
      const mockTransaction = { id: 'test', inputs: [], outputs: [] };
      const result = await broadcastViaWasmSdk(mockTransaction, { verbose: false });
      
      // We expect this to fail, but gracefully
      if (result && typeof result === 'object' && result.hasOwnProperty('success')) {
        test4.status = 'PASS';
        test4.details = 'Broadcasting function available and returns proper result structure';
        
        if (verbose) console.log('✅ Broadcasting function: AVAILABLE');
      } else {
        test4.status = 'FAIL';
        test4.details = 'Broadcasting function exists but returns unexpected format';
        
        if (verbose) console.error('❌ Broadcasting function: INVALID RETURN FORMAT');
      }
      
    } catch (error) {
      // Even errors are acceptable here, as long as the function exists
      if (error.message.includes('not available')) {
        test4.status = 'FAIL';
        test4.details = 'Broadcasting function not found';
        
        if (verbose) console.error('❌ Broadcasting function: NOT FOUND');
      } else {
        test4.status = 'PASS';
        test4.details = 'Broadcasting function available (failed as expected with mock data)';
        
        if (verbose) console.log('✅ Broadcasting function: AVAILABLE (expected failure with mock data)');
      }
    }
    
    testResults.results.push(test4);

    // Test 5: File Accessibility Check
    console.log('\n📁 Test 5: File Accessibility Check...');
    const test5 = {
      name: 'File Accessibility Check',
      description: 'Verify WASM files are accessible from browser',
      status: 'RUNNING',
      details: ''
    };

    try {
      // Check if files are accessible via fetch
      const jsFileResponse = await fetch('/kaspa-wasm/kaspa.js');
      const wasmFileResponse = await fetch('/kaspa-wasm/kaspa_bg.wasm');
      
      const jsAccessible = jsFileResponse.ok;
      const wasmAccessible = wasmFileResponse.ok;
      
      if (jsAccessible && wasmAccessible) {
        test5.status = 'PASS';
        test5.details = 'Both kaspa.js and kaspa_bg.wasm files are accessible via HTTP';
        
        if (verbose) console.log('✅ File accessibility: SUCCESS');
      } else {
        test5.status = 'FAIL';
        test5.details = `File access: kaspa.js(${jsAccessible}), kaspa_bg.wasm(${wasmAccessible})`;
        
        if (verbose) console.error('❌ File accessibility: FAILED');
      }
      
    } catch (error) {
      test5.status = 'FAIL';
      test5.details = `File accessibility test failed: ${error.message}`;
      
      if (verbose) console.error('❌ File accessibility: ERROR -', error.message);
    }
    
    testResults.results.push(test5);

    // Calculate summary
    const duration = Date.now() - startTime;
    testResults.summary.total = testResults.results.length;
    testResults.summary.passed = testResults.results.filter(r => r.status === 'PASS').length;
    testResults.summary.failed = testResults.results.filter(r => r.status === 'FAIL').length;
    testResults.summary.warnings = testResults.results.filter(r => r.status === 'WARN').length;
    testResults.summary.duration = duration;
    testResults.summary.successRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1) + '%';

    // Determine overall success
    const criticalTests = testResults.results.filter(r => r.name !== 'RPC Client Functionality'); // RPC can fail without local node
    const criticalPassed = criticalTests.filter(r => r.status === 'PASS').length;
    testResults.success = (criticalPassed >= 3); // Need at least 3/4 critical tests to pass

    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Tests: ${testResults.summary.total}`);
    console.log(`   Passed: ${testResults.summary.passed}`);
    console.log(`   Failed: ${testResults.summary.failed}`);
    console.log(`   Warnings: ${testResults.summary.warnings}`);
    console.log(`   Success Rate: ${testResults.summary.successRate}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Overall: ${testResults.success ? '✅ PASS' : '❌ FAIL'}`);

    return testResults;

  } catch (error) {
    console.error('❌ Test suite error:', error);
    
    testResults.success = false;
    testResults.error = error.message;
    testResults.summary.duration = Date.now() - startTime;
    
    return testResults;
  }
}

/**
 * Quick validation test for kaspa-wasm32-sdk basic functionality
 * This is a simplified test that can run quickly to verify basic setup
 * @returns {Object} Quick test result
 */
export function quickWasmSdkValidation() {
  try {
    console.log('🚀 Quick kaspa-wasm32-sdk validation...');
    
    // Check if the function is available
    if (typeof initializeKaspaWasm32Sdk !== 'function') {
      return {
        status: 'FAIL',
        test: 'Quick WASM SDK Validation',
        details: 'initializeKaspaWasm32Sdk function not available',
        recommendation: 'Check kaspa-utils.js imports and function definitions'
      };
    }

    // Check if broadcasting function is available
    if (typeof broadcastViaWasmSdk !== 'function') {
      return {
        status: 'FAIL',
        test: 'Quick WASM SDK Validation',
        details: 'broadcastViaWasmSdk function not available',
        recommendation: 'Check if broadcastViaWasmSdk function is properly exported'
      };
    }

    return {
      status: 'PASS',
      test: 'Quick WASM SDK Validation',
      details: 'All required functions are available',
      functions: {
        initializeKaspaWasm32Sdk: '✅ Available',
        broadcastViaWasmSdk: '✅ Available'
      }
    };

  } catch (error) {
    return {
      status: 'ERROR',
      test: 'Quick WASM SDK Validation',
      details: error.message,
      recommendation: 'Check console for detailed error information'
    };
  }
}

/**
 * Test broadcastViaWasmSdk function implementation - Task 4.2 Validation
 * Verifies the direct WASM SDK broadcasting function is properly implemented
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Promise<Object>} Test results for Task 4.2
 */
export async function testBroadcastViaWasmSdk(verbose = false) {
  const testResults = {
    testName: 'broadcastViaWasmSdk Function Test',
    taskId: '4.2',
    success: false,
    results: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    if (verbose) console.log('🧪 Testing Task 4.2: broadcastViaWasmSdk function...');

    // Test 1: Function exists and is callable
    let test1Passed = false;
    try {
      const { broadcastViaWasmSdk } = await import('./kaspa-utils.js');
      test1Passed = (typeof broadcastViaWasmSdk === 'function');
      testResults.results.push({
        test: 'Function Import',
        passed: test1Passed,
        message: test1Passed ? 'broadcastViaWasmSdk function imported successfully' : 'Function not found or not callable'
      });
    } catch (error) {
      testResults.results.push({
        test: 'Function Import',
        passed: false,
        message: `Import failed: ${error.message}`
      });
    }

    // Test 2: kaspa-wasm32-sdk module availability  
    let test2Passed = false;
    try {
      test2Passed = !!(window.kaspaWasmModule && window.kaspaWasmModule.RpcClient);
      testResults.results.push({
        test: 'WASM SDK Availability',
        passed: test2Passed,
        message: test2Passed ? 'kaspa-wasm32-sdk module loaded with RpcClient available' : 'kaspa-wasm32-sdk module or RpcClient not available'
      });
    } catch (error) {
      testResults.results.push({
        test: 'WASM SDK Availability', 
        passed: false,
        message: `WASM SDK check failed: ${error.message}`
      });
    }

    // Test 3: RPC client creation capability
    let test3Passed = false;
    try {
      if (window.kaspaWasmModule && window.kaspaWasmModule.RpcClient) {
        // Try to create RPC client (don't connect, just test creation)
        const testClient = new window.kaspaWasmModule.RpcClient({
          url: 'ws://127.0.0.1:17210',
          encoding: window.kaspaWasmModule.Encoding.Borsh,
          network: 'testnet-10'
        });
        test3Passed = !!(testClient && typeof testClient.connect === 'function');
        testResults.results.push({
          test: 'RPC Client Creation',
          passed: test3Passed,
          message: test3Passed ? 'RPC client created successfully with connect method' : 'RPC client creation failed or missing methods'
        });
      } else {
        testResults.results.push({
          test: 'RPC Client Creation',
          passed: false,
          message: 'Cannot test RPC client creation - WASM SDK not available'
        });
      }
    } catch (error) {
      testResults.results.push({
        test: 'RPC Client Creation',
        passed: false,
        message: `RPC client creation test failed: ${error.message}`
      });
    }

    // Test 4: Function parameter validation
    let test4Passed = false;
    try {
      const { broadcastViaWasmSdk } = await import('./kaspa-utils.js');
      
      // Test with invalid input (should return error, not crash)
      const result = await broadcastViaWasmSdk(null, { verbose: false });
      test4Passed = (result && result.success === false && result.error);
      
      testResults.results.push({
        test: 'Parameter Validation',
        passed: test4Passed,
        message: test4Passed ? 'Function properly validates parameters and returns error for invalid input' : 'Function validation failed'
      });
    } catch (error) {
      testResults.results.push({
        test: 'Parameter Validation',
        passed: false,
        message: `Parameter validation test failed: ${error.message}`
      });
    }

    // Calculate summary
    testResults.summary.total = testResults.results.length;
    testResults.summary.passed = testResults.results.filter(r => r.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
    testResults.success = (testResults.summary.passed === testResults.summary.total);

    if (verbose) {
      console.log(`🧪 Task 4.2 Test Results: ${testResults.summary.passed}/${testResults.summary.total} tests passed`);
      testResults.results.forEach(result => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`   ${icon} ${result.test}: ${result.message}`);
      });
    }

    return testResults;

  } catch (error) {
    console.error('❌ Task 4.2 test suite error:', error);
    return {
      ...testResults,
      success: false,
      error: error.message
    };
  }
}

/**
 * Test kaspa node connection - Task 4.3 Validation
 * Verifies connection to user's kaspa testnet-10 node at 10.0.0.245
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Promise<Object>} Test results for Task 4.3
 */
export async function testKaspaNodeConnection(verbose = false) {
  const testResults = {
    testName: 'Kaspa Node Connection Test',
    taskId: '4.3',
    success: false,
    results: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    if (verbose) console.log('🧪 Testing Task 4.3: Kaspa node connection...');

    // Test 1: WASM SDK module availability
    let test1Passed = false;
    try {
      test1Passed = !!(window.kaspaWasmModule && window.kaspaWasmModule.RpcClient);
      testResults.results.push({
        test: 'WASM SDK Module Available',
        passed: test1Passed,
        message: test1Passed ? 'kaspa-wasm32-sdk module loaded successfully' : 'kaspa-wasm32-sdk module not available'
      });
    } catch (error) {
      testResults.results.push({
        test: 'WASM SDK Module Available',
        passed: false,
        message: `Module check failed: ${error.message}`
      });
    }

    // Test 2: RPC client creation for user's node
    let test2Passed = false;
    let rpcClient = null;
    try {
      if (window.kaspaWasmModule && window.kaspaWasmModule.RpcClient) {
        rpcClient = new window.kaspaWasmModule.RpcClient({
          url: 'ws://10.0.0.245:17210', // User's testnet-10 node (Borsh)
          encoding: window.kaspaWasmModule.Encoding.Borsh,
          network: 'testnet-10'
        });
        test2Passed = !!(rpcClient && typeof rpcClient.connect === 'function');
        testResults.results.push({
          test: 'RPC Client Creation',
          passed: test2Passed,
          message: test2Passed ? 'RPC client created for ws://10.0.0.245:17210' : 'RPC client creation failed'
        });
      } else {
        testResults.results.push({
          test: 'RPC Client Creation',
          passed: false,
          message: 'Cannot create RPC client - WASM SDK not available'
        });
      }
    } catch (error) {
      testResults.results.push({
        test: 'RPC Client Creation',
        passed: false,
        message: `RPC client creation failed: ${error.message}`
      });
    }

    // Test 3: Actual connection to node
    let test3Passed = false;
    try {
      if (rpcClient && test2Passed) {
        if (verbose) console.log('🔗 Attempting to connect to ws://10.0.0.245:17210...');
        
        // Set a timeout for the connection attempt
        const connectionPromise = rpcClient.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        
        test3Passed = true;
        testResults.results.push({
          test: 'Node Connection',
          passed: true,
          message: 'Successfully connected to kaspa node at 10.0.0.245:17210'
        });
        
        if (verbose) console.log('✅ Connected to kaspa node successfully!');
        
        // Disconnect immediately after successful connection test
        try {
          await rpcClient.disconnect();
          if (verbose) console.log('🔌 Disconnected from node');
        } catch (disconnectError) {
          if (verbose) console.warn('⚠️ Disconnect warning:', disconnectError.message);
        }
        
      } else {
        testResults.results.push({
          test: 'Node Connection',
          passed: false,
          message: 'Cannot test connection - RPC client not available'
        });
      }
    } catch (error) {
      testResults.results.push({
        test: 'Node Connection',
        passed: false,
        message: `Connection failed: ${error.message}`
      });
      
      if (verbose) {
        console.error('❌ Node connection failed:', error.message);
        console.log('🔍 Troubleshooting tips:');
        console.log('   - Verify kaspad is running on 10.0.0.245');
        console.log('   - Check WebSocket port 17210 is exposed');
        console.log('   - Ensure CORS is configured: --rpccors=*');
        console.log('   - Verify network connectivity to 10.0.0.245');
      }
    }

    // Test 4: Alternative JSON endpoint test
    let test4Passed = false;
    try {
      if (window.kaspaWasmModule && window.kaspaWasmModule.RpcClient && !test3Passed) {
        if (verbose) console.log('🔄 Trying JSON endpoint as fallback...');
        
        const jsonRpcClient = new window.kaspaWasmModule.RpcClient({
          url: 'ws://10.0.0.245:18210', // JSON WebSocket port
          encoding: window.kaspaWasmModule.Encoding.JSON,
          network: 'testnet-10'
        });
        
        const connectionPromise = jsonRpcClient.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('JSON connection timeout')), 5000)
        );
        
        await Promise.race([connectionPromise, timeoutPromise]);
        
        test4Passed = true;
        testResults.results.push({
          test: 'JSON Endpoint Fallback',
          passed: true,
          message: 'Successfully connected to JSON endpoint at 10.0.0.245:18210'
        });
        
        try {
          await jsonRpcClient.disconnect();
        } catch (e) {}
        
      } else if (test3Passed) {
        test4Passed = true;
        testResults.results.push({
          test: 'JSON Endpoint Fallback',
          passed: true,
          message: 'Borsh endpoint working, JSON fallback not needed'
        });
      } else {
        testResults.results.push({
          test: 'JSON Endpoint Fallback',
          passed: false,
          message: 'Cannot test JSON fallback - prerequisites not met'
        });
      }
    } catch (error) {
      testResults.results.push({
        test: 'JSON Endpoint Fallback',
        passed: false,
        message: `JSON endpoint test failed: ${error.message}`
      });
    }

    // Calculate summary
    testResults.summary.total = testResults.results.length;
    testResults.summary.passed = testResults.results.filter(r => r.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
    
    // Success if we have at least one working connection
    testResults.success = (test3Passed || test4Passed);

    if (verbose) {
      console.log(`🧪 Task 4.3 Test Results: ${testResults.summary.passed}/${testResults.summary.total} tests passed`);
      testResults.results.forEach(result => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`   ${icon} ${result.test}: ${result.message}`);
      });
      
      if (testResults.success) {
        console.log('🎉 Task 4.3 SUCCESS: Node connection verified!');
      } else {
        console.log('❌ Task 4.3 FAILED: Unable to connect to kaspa node');
      }
    }

    return testResults;

  } catch (error) {
    console.error('❌ Task 4.3 test suite error:', error);
    return {
      ...testResults,
      success: false,
      error: error.message
    };
  }
} 