// test-wasm-object-investigation.js
// Deep WASM Object Investigation and Analysis for Task 3.5.1
// Purpose: Investigate _UtxoEntryReference WASM object structure using multiple inspection techniques

import * as KaspaUtils from './kaspa-utils.js';

/**
 * Deep WASM Object Investigation
 * Uses multiple inspection techniques to understand WASM object structure
 * @param {Object} wasmObject - The WASM object to investigate
 * @param {string} objectName - Name for logging purposes
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Object} Comprehensive analysis results
 */
export function investigateWasmObject(wasmObject, objectName = 'WasmObject', verbose = true) {
  const results = {
    objectName,
    analysis: {
      basicInfo: {},
      properties: {},
      methods: {},
      prototype: {},
      descriptors: {},
      wasmSpecific: {}
    },
    extractionAttempts: {},
    recommendations: []
  };

  try {
    if (verbose) console.log(`🔍 Starting deep investigation of ${objectName}...`);

    // 1. Basic Object Information
    results.analysis.basicInfo = {
      type: typeof wasmObject,
      constructor: wasmObject?.constructor?.name || 'Unknown',
      isWasmObject: !!(wasmObject?.__wbg_ptr || wasmObject?.constructor?.name?.includes('Reference')),
      wasmPtr: wasmObject?.__wbg_ptr || null,
      toString: (() => {
        try {
          return wasmObject.toString();
        } catch (e) {
          return `Error: ${e.message}`;
        }
      })(),
      valueOf: (() => {
        try {
          return wasmObject.valueOf();
        } catch (e) {
          return `Error: ${e.message}`;
        }
      })()
    };

    if (verbose) {
      console.log(`📋 Basic Info for ${objectName}:`);
      console.log(`   Type: ${results.analysis.basicInfo.type}`);
      console.log(`   Constructor: ${results.analysis.basicInfo.constructor}`);
      console.log(`   WASM Pointer: ${results.analysis.basicInfo.wasmPtr}`);
      console.log(`   Is WASM Object: ${results.analysis.basicInfo.isWasmObject}`);
    }

    // 2. Property Enumeration
    results.analysis.properties = {
      ownKeys: Object.keys(wasmObject),
      ownPropertyNames: Object.getOwnPropertyNames(wasmObject),
      enumerableProps: [],
      hasSymbols: Object.getOwnPropertySymbols(wasmObject).length > 0,
      symbols: Object.getOwnPropertySymbols(wasmObject).map(s => s.toString())
    };

    // Get enumerable properties
    for (let prop in wasmObject) {
      results.analysis.properties.enumerableProps.push(prop);
    }

    if (verbose) {
      console.log(`🔑 Properties for ${objectName}:`);
      console.log(`   Own Keys: [${results.analysis.properties.ownKeys.join(', ')}]`);
      console.log(`   Own Property Names: [${results.analysis.properties.ownPropertyNames.join(', ')}]`);
      console.log(`   Enumerable: [${results.analysis.properties.enumerableProps.join(', ')}]`);
      console.log(`   Symbols: ${results.analysis.properties.hasSymbols ? results.analysis.properties.symbols.join(', ') : 'None'}`);
    }

    // 3. Property Descriptors
    results.analysis.descriptors = {};
    for (const prop of results.analysis.properties.ownPropertyNames) {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(wasmObject, prop);
        results.analysis.descriptors[prop] = {
          value: descriptor?.value,
          writable: descriptor?.writable,
          enumerable: descriptor?.enumerable,
          configurable: descriptor?.configurable,
          get: !!descriptor?.get,
          set: !!descriptor?.set
        };
      } catch (e) {
        results.analysis.descriptors[prop] = { error: e.message };
      }
    }

    if (verbose) {
      console.log(`📝 Property Descriptors for ${objectName}:`);
      Object.entries(results.analysis.descriptors).forEach(([prop, desc]) => {
        if (desc.error) {
          console.log(`   ${prop}: ERROR - ${desc.error}`);
        } else {
          console.log(`   ${prop}: value=${typeof desc.value}, writable=${desc.writable}, enumerable=${desc.enumerable}`);
        }
      });
    }

    // 4. Prototype Chain Analysis
    let prototypeChain = [];
    let currentProto = wasmObject;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops

    while (currentProto && depth < maxDepth) {
      try {
        currentProto = Object.getPrototypeOf(currentProto);
        if (currentProto && currentProto !== Object.prototype) {
          const protoInfo = {
            depth: depth + 1,
            constructor: currentProto.constructor?.name || 'Unknown',
            ownPropertyNames: Object.getOwnPropertyNames(currentProto),
            methods: []
          };

          // Find methods on this prototype
          for (const prop of protoInfo.ownPropertyNames) {
            try {
              if (typeof currentProto[prop] === 'function' && prop !== 'constructor') {
                protoInfo.methods.push(prop);
              }
            } catch (e) {
              // Skip properties that can't be accessed
            }
          }

          prototypeChain.push(protoInfo);
        }
        depth++;
      } catch (e) {
        break;
      }
    }

    results.analysis.prototype = {
      chainLength: prototypeChain.length,
      chain: prototypeChain
    };

    if (verbose) {
      console.log(`🔗 Prototype Chain for ${objectName} (${prototypeChain.length} levels):`);
      prototypeChain.forEach((proto, index) => {
        console.log(`   Level ${proto.depth}: ${proto.constructor}`);
        console.log(`     Methods: [${proto.methods.join(', ')}]`);
        console.log(`     Properties: [${proto.ownPropertyNames.join(', ')}]`);
      });
    }

    // 5. Method Detection and Analysis
    const allMethods = [];
    
    // Methods on the object itself
    for (const prop of results.analysis.properties.ownPropertyNames) {
      try {
        if (typeof wasmObject[prop] === 'function') {
          allMethods.push({ name: prop, source: 'direct', callable: true });
        }
      } catch (e) {
        allMethods.push({ name: prop, source: 'direct', callable: false, error: e.message });
      }
    }

    // Methods from prototype chain
    prototypeChain.forEach(proto => {
      proto.methods.forEach(method => {
        allMethods.push({ name: method, source: `prototype-${proto.constructor}`, callable: null });
      });
    });

    results.analysis.methods = {
      totalCount: allMethods.length,
      directMethods: allMethods.filter(m => m.source === 'direct'),
      prototypeMethods: allMethods.filter(m => m.source.startsWith('prototype')),
      allMethods
    };

    if (verbose) {
      console.log(`⚙️ Methods for ${objectName} (${allMethods.length} total):`);
      console.log(`   Direct Methods: [${results.analysis.methods.directMethods.map(m => m.name).join(', ')}]`);
      console.log(`   Prototype Methods: [${results.analysis.methods.prototypeMethods.map(m => m.name).join(', ')}]`);
    }

    // 6. WASM-Specific Analysis
    if (results.analysis.basicInfo.isWasmObject) {
      results.analysis.wasmSpecific = {
        wasmPtr: wasmObject.__wbg_ptr,
        wasmMethods: [],
        potentialGetters: [],
        potentialSetters: []
      };

      // Look for WASM-specific patterns
      allMethods.forEach(method => {
        if (method.name.includes('get') || method.name.includes('Get')) {
          results.analysis.wasmSpecific.potentialGetters.push(method.name);
        }
        if (method.name.includes('set') || method.name.includes('Set')) {
          results.analysis.wasmSpecific.potentialSetters.push(method.name);
        }
      });

      if (verbose) {
        console.log(`🔧 WASM-Specific Analysis for ${objectName}:`);
        console.log(`   WASM Pointer: ${results.analysis.wasmSpecific.wasmPtr}`);
        console.log(`   Potential Getters: [${results.analysis.wasmSpecific.potentialGetters.join(', ')}]`);
        console.log(`   Potential Setters: [${results.analysis.wasmSpecific.potentialSetters.join(', ')}]`);
      }
    }

    // 7. Transaction ID Extraction Attempts
    results.extractionAttempts = attemptTransactionIdExtraction(wasmObject, verbose);

    // 8. Generate Recommendations
    results.recommendations = generateRecommendations(results, verbose);

    if (verbose) {
      console.log(`✅ Deep investigation of ${objectName} completed`);
      console.log(`📊 Summary: ${allMethods.length} methods, ${Object.keys(results.analysis.descriptors).length} properties`);
    }

    return results;

  } catch (error) {
    console.error(`❌ Error during WASM object investigation:`, error);
    results.error = error.message;
    return results;
  }
}

/**
 * Attempt Transaction ID Extraction using multiple strategies
 * @param {Object} wasmObject - The WASM UTXO object
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Object} Extraction attempt results
 */
function attemptTransactionIdExtraction(wasmObject, verbose = true) {
  const attempts = {
    strategies: [],
    successful: [],
    failed: [],
    bestResult: null
  };

  if (verbose) console.log(`🎯 Attempting transaction ID extraction...`);

  // Strategy 1: Direct property access
  const strategy1 = { name: 'Direct Property Access', methods: [] };
  const directProps = ['transactionId', 'txId', 'id', 'transaction_id', 'tx_id'];
  
  for (const prop of directProps) {
    try {
      const value = wasmObject[prop];
      strategy1.methods.push({ property: prop, value, type: typeof value, success: !!value });
      if (value) {
        attempts.successful.push({ strategy: 'direct', property: prop, value });
        if (!attempts.bestResult) attempts.bestResult = { strategy: 'direct', property: prop, value };
      }
    } catch (e) {
      strategy1.methods.push({ property: prop, error: e.message, success: false });
      attempts.failed.push({ strategy: 'direct', property: prop, error: e.message });
    }
  }
  attempts.strategies.push(strategy1);

  // Strategy 2: Method calls
  const strategy2 = { name: 'Method Calls', methods: [] };
  const methodNames = ['transactionId', 'getTransactionId', 'getTxId', 'txId', 'id', 'getId'];
  
  for (const methodName of methodNames) {
    try {
      if (typeof wasmObject[methodName] === 'function') {
        const value = wasmObject[methodName]();
        strategy2.methods.push({ method: methodName, value, type: typeof value, success: !!value });
        if (value) {
          attempts.successful.push({ strategy: 'method', method: methodName, value });
          if (!attempts.bestResult) attempts.bestResult = { strategy: 'method', method: methodName, value };
        }
      } else {
        strategy2.methods.push({ method: methodName, error: 'Not a function', success: false });
      }
    } catch (e) {
      strategy2.methods.push({ method: methodName, error: e.message, success: false });
      attempts.failed.push({ strategy: 'method', method: methodName, error: e.message });
    }
  }
  attempts.strategies.push(strategy2);

  // Strategy 3: Outpoint object access
  const strategy3 = { name: 'Outpoint Object Access', methods: [] };
  try {
    if (typeof wasmObject.outpoint === 'function') {
      const outpoint = wasmObject.outpoint();
      strategy3.methods.push({ step: 'outpoint()', result: outpoint, type: typeof outpoint, success: !!outpoint });
      
      if (outpoint) {
        // Try transaction ID methods on outpoint
        const outpointMethods = ['transactionId', 'getTransactionId', 'getTxId', 'txId', 'id'];
        for (const method of outpointMethods) {
          try {
            if (typeof outpoint[method] === 'function') {
              const value = outpoint[method]();
              strategy3.methods.push({ step: `outpoint.${method}()`, result: value, type: typeof value, success: !!value });
              if (value) {
                attempts.successful.push({ strategy: 'outpoint-method', method: `outpoint.${method}()`, value });
                if (!attempts.bestResult) attempts.bestResult = { strategy: 'outpoint-method', method: `outpoint.${method}()`, value };
              }
            } else if (outpoint[method] !== undefined) {
              const value = outpoint[method];
              strategy3.methods.push({ step: `outpoint.${method}`, result: value, type: typeof value, success: !!value });
              if (value) {
                attempts.successful.push({ strategy: 'outpoint-property', property: `outpoint.${method}`, value });
                if (!attempts.bestResult) attempts.bestResult = { strategy: 'outpoint-property', property: `outpoint.${method}`, value };
              }
            }
          } catch (e) {
            strategy3.methods.push({ step: `outpoint.${method}`, error: e.message, success: false });
          }
        }
      }
    } else {
      strategy3.methods.push({ step: 'outpoint access', error: 'outpoint is not a function', success: false });
    }
  } catch (e) {
    strategy3.methods.push({ step: 'outpoint access', error: e.message, success: false });
    attempts.failed.push({ strategy: 'outpoint', error: e.message });
  }
  attempts.strategies.push(strategy3);

  // Strategy 4: JSON serialization
  const strategy4 = { name: 'JSON Serialization', methods: [] };
  try {
    if (typeof wasmObject.toJSON === 'function') {
      const jsonData = wasmObject.toJSON();
      strategy4.methods.push({ step: 'toJSON()', result: jsonData, type: typeof jsonData, success: !!jsonData });
      
      if (jsonData && typeof jsonData === 'object') {
        const jsonProps = ['transactionId', 'txId', 'id', 'outpoint'];
        for (const prop of jsonProps) {
          if (jsonData[prop]) {
            strategy4.methods.push({ step: `json.${prop}`, result: jsonData[prop], success: true });
            attempts.successful.push({ strategy: 'json', property: prop, value: jsonData[prop] });
            if (!attempts.bestResult) attempts.bestResult = { strategy: 'json', property: prop, value: jsonData[prop] };
          }
        }
      }
    } else {
      strategy4.methods.push({ step: 'toJSON check', error: 'toJSON is not a function', success: false });
    }
  } catch (e) {
    strategy4.methods.push({ step: 'toJSON', error: e.message, success: false });
    attempts.failed.push({ strategy: 'json', error: e.message });
  }
  attempts.strategies.push(strategy4);

  if (verbose) {
    console.log(`🎯 Transaction ID Extraction Results:`);
    console.log(`   Successful attempts: ${attempts.successful.length}`);
    console.log(`   Failed attempts: ${attempts.failed.length}`);
    if (attempts.bestResult) {
      console.log(`   Best result: ${attempts.bestResult.strategy} - ${attempts.bestResult.value}`);
    } else {
      console.log(`   No successful extraction found`);
    }
  }

  return attempts;
}

/**
 * Generate Recommendations based on investigation results
 * @param {Object} results - Investigation results
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Array} Array of recommendation objects
 */
function generateRecommendations(results, verbose = true) {
  const recommendations = [];

  // Check if transaction ID extraction was successful
  if (results.extractionAttempts.successful.length > 0) {
    const bestResult = results.extractionAttempts.bestResult;
    recommendations.push({
      priority: 'HIGH',
      category: 'SUCCESS',
      title: 'Transaction ID Extraction Successful',
      description: `Use ${bestResult.strategy} approach: ${bestResult.method || bestResult.property}`,
      implementation: `Implement: ${bestResult.strategy === 'method' ? `wasmObject.${bestResult.method}()` : 
                       bestResult.strategy === 'outpoint-method' ? `wasmObject.${bestResult.method}` :
                       bestResult.strategy === 'direct' ? `wasmObject.${bestResult.property}` :
                       'See extraction attempts for details'}`
    });
  } else {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'FAILURE',
      title: 'Transaction ID Extraction Failed',
      description: 'No working method found for transaction ID extraction',
      implementation: 'Investigate alternative UTXO data sources or update extraction logic'
    });
  }

  // Recommend based on available methods
  if (results.analysis.methods.totalCount > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'METHODS',
      title: 'Available Methods Found',
      description: `${results.analysis.methods.totalCount} methods available for exploration`,
      implementation: `Try calling methods: ${results.analysis.methods.directMethods.map(m => m.name).slice(0, 5).join(', ')}`
    });
  }

  // WASM-specific recommendations
  if (results.analysis.basicInfo.isWasmObject) {
    recommendations.push({
      priority: 'HIGH',
      category: 'WASM',
      title: 'WASM Object Detected',
      description: 'Use WASM-specific access patterns',
      implementation: 'Prefer method calls over property access for WASM objects'
    });

    if (results.analysis.wasmSpecific.potentialGetters.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'WASM',
        title: 'Potential Getter Methods',
        description: `Found ${results.analysis.wasmSpecific.potentialGetters.length} potential getter methods`,
        implementation: `Try: ${results.analysis.wasmSpecific.potentialGetters.slice(0, 3).join(', ')}`
      });
    }
  }

  if (verbose) {
    console.log(`💡 Recommendations (${recommendations.length} total):`);
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.title}`);
      console.log(`      ${rec.description}`);
      console.log(`      Implementation: ${rec.implementation}`);
    });
  }

  return recommendations;
}

/**
 * Test UTXO WASM Object Investigation
 * Fetches real UTXOs and performs deep investigation
 * @param {boolean} verbose - Enable detailed logging
 * @returns {Promise<Object>} Test results
 */
export async function testUtxoWasmInvestigation(verbose = true) {
  const testResults = {
    testName: 'UTXO WASM Object Investigation',
    startTime: Date.now(),
    status: 'running',
    results: {
      frameworkInit: null,
      walletConnection: null,
      utxoFetch: null,
      wasmInvestigation: []
    },
    summary: {},
    errors: []
  };

  try {
    if (verbose) console.log('🚀 Starting UTXO WASM Object Investigation Test...');

    // 1. Initialize Kaspa Framework
    if (verbose) console.log('📦 Initializing Kaspa Framework...');
    const initResult = await KaspaUtils.initialiseKaspaFramework();
    testResults.results.frameworkInit = initResult;
    
    if (!initResult.success) {
      throw new Error(`Framework initialization failed: ${initResult.error}`);
    }

    // 2. Connect to Kastle Wallet
    if (verbose) console.log('🔌 Connecting to Kastle Wallet...');
    const walletResult = await KaspaUtils.connectKastleWallet(verbose);
    testResults.results.walletConnection = walletResult;
    
    if (!walletResult.success) {
      throw new Error(`Wallet connection failed: ${walletResult.error}`);
    }

    // 3. Fetch UTXOs
    if (verbose) console.log('💰 Fetching UTXOs for investigation...');
    const utxoResult = await KaspaUtils.fetchKastleUtxos(null, verbose);
    testResults.results.utxoFetch = utxoResult;
    
    if (!utxoResult.success || utxoResult.utxos.length === 0) {
      throw new Error(`UTXO fetch failed: ${utxoResult.error || 'No UTXOs found'}`);
    }

    // 4. Investigate Each UTXO WASM Object
    if (verbose) console.log(`🔍 Investigating ${utxoResult.utxos.length} UTXO WASM objects...`);
    
    utxoResult.utxos.forEach((utxo, index) => {
      if (verbose) console.log(`\n🔍 ========== INVESTIGATING UTXO ${index + 1} ==========`);
      
      const investigation = investigateWasmObject(utxo, `UTXO-${index + 1}`, verbose);
      testResults.results.wasmInvestigation.push(investigation);
      
      if (verbose) console.log(`🔍 ========== UTXO ${index + 1} INVESTIGATION COMPLETE ==========\n`);
    });

    // 5. Generate Summary
    const successfulExtractions = testResults.results.wasmInvestigation
      .filter(inv => inv.extractionAttempts.successful.length > 0);
    
    const failedExtractions = testResults.results.wasmInvestigation
      .filter(inv => inv.extractionAttempts.successful.length === 0);

    testResults.summary = {
      totalUtxos: utxoResult.utxos.length,
      successfulExtractions: successfulExtractions.length,
      failedExtractions: failedExtractions.length,
      successRate: successfulExtractions.length / utxoResult.utxos.length,
      recommendedApproaches: successfulExtractions.length > 0 ? 
        successfulExtractions[0].extractionAttempts.bestResult : null
    };

    testResults.status = 'completed';
    testResults.duration = Date.now() - testResults.startTime;

    if (verbose) {
      console.log('🎉 UTXO WASM Object Investigation Test Completed!');
      console.log(`📊 Summary:`);
      console.log(`   Total UTXOs investigated: ${testResults.summary.totalUtxos}`);
      console.log(`   Successful extractions: ${testResults.summary.successfulExtractions}`);
      console.log(`   Failed extractions: ${testResults.summary.failedExtractions}`);
      console.log(`   Success rate: ${(testResults.summary.successRate * 100).toFixed(1)}%`);
      if (testResults.summary.recommendedApproaches) {
        console.log(`   Recommended approach: ${testResults.summary.recommendedApproaches.strategy}`);
      }
    }

    return testResults;

  } catch (error) {
    console.error('❌ UTXO WASM Investigation Test failed:', error);
    testResults.status = 'failed';
    testResults.error = error.message;
    testResults.duration = Date.now() - testResults.startTime;
    testResults.errors.push(error.message);
    return testResults;
  }
}

/**
 * Quick WASM Object Analysis
 * Simplified version for rapid testing
 * @param {Object} wasmObject - WASM object to analyze
 * @returns {Object} Quick analysis results
 */
export function quickWasmAnalysis(wasmObject) {
  const analysis = {
    isWasm: !!(wasmObject?.__wbg_ptr || wasmObject?.constructor?.name?.includes('Reference')),
    constructor: wasmObject?.constructor?.name || 'Unknown',
    methods: [],
    properties: Object.keys(wasmObject),
    transactionIdFound: false,
    extractionMethod: null
  };

  // Quick method detection
  try {
    const proto = Object.getPrototypeOf(wasmObject);
    if (proto) {
      analysis.methods = Object.getOwnPropertyNames(proto).filter(name => 
        typeof wasmObject[name] === 'function' && name !== 'constructor'
      );
    }
  } catch (e) {
    // Ignore prototype access errors
  }

  // Quick transaction ID extraction attempt
  const quickMethods = ['transactionId', 'outpoint'];
  for (const method of quickMethods) {
    try {
      if (typeof wasmObject[method] === 'function') {
        const result = wasmObject[method]();
        if (result) {
          if (method === 'outpoint' && typeof result.transactionId === 'function') {
            const txId = result.transactionId();
            if (txId) {
              analysis.transactionIdFound = true;
              analysis.extractionMethod = 'outpoint().transactionId()';
              break;
            }
          } else if (method === 'transactionId') {
            analysis.transactionIdFound = true;
            analysis.extractionMethod = 'transactionId()';
            break;
          }
        }
      }
    } catch (e) {
      // Ignore method call errors
    }
  }

  return analysis;
} 