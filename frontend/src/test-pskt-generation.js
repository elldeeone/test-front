// Test module for PSKT JSON Generation functionality
// Tests the generatePsktJson and validatePsktJson functions

import { 
  generatePsktJson, 
  validatePsktJson, 
  initialiseKaspaFramework,
  createTransactionWithIdPattern,
  connectKastleWallet,
  fetchKastleUtxos,
  constructEnvelope,
  getKastleWalletStatus
} from './kaspa-utils.js';

/**
 * Test PSKT Generation functionality
 * @returns {Promise<Object>} Test results
 */
export async function testPsktGeneration() {
  console.log('\n🧪 === PSKT GENERATION TESTS ===\n');

  const testResults = {
    testDetails: [],
    success: true,
    totalTests: 0,
    passedTests: 0
  };

  // Ensure framework is initialized
  await initialiseKaspaFramework();

  // Test 1: Basic PSKT Generation
  try {
    console.log('📝 Test 1: Basic PSKT Generation with Valid Inputs');

    // Mock UTXO data (simulating what Kastle Wallet would provide)
    const mockUtxos = [
      {
        transactionId: 'abc123def456789012345678901234567890123456789012345678901234567890',
        index: 0,
        amount: 1000000, // 1,000,000 sompi
        scriptPubKey: 'mock_script_pub_key_1',
        address: 'kaspa:qq8zg0ng5w3w84szt6xhs7k3h9fvs2t3f5wrnf4xxcukmcvms5kxlq9hfa8r'
      },
      {
        transactionId: 'def789abc123456789012345678901234567890123456789012345678901234567890',
        index: 1,
        amount: 500000, // 500,000 sompi
        scriptPubKey: 'mock_script_pub_key_2',
        address: 'kaspa:qq8zg0ng5w3w84szt6xhs7k3h9fvs2t3f5wrnf4xxcukmcvms5kxlq9hfa8r'
      }
    ];

    // Generate a pattern envelope first
    const patternResult = await createTransactionWithIdPattern({
      zeroBits: 4,
      payloadData: 'PSKT Test Transaction',
      maxIterations: 1000
    });

    if (!patternResult.success) {
      throw new Error('Failed to generate pattern envelope for test');
    }

    const result = await generatePsktJson({
      envelope: patternResult.envelope,
      utxos: mockUtxos,
      toAddress: 'kaspa:qp0xlk8jn2zzd6yxy8fmxkqq6gny4xr8hvqqs0rfdz4u5cmn0zxlm5xa7gr8m',
      amount: 750000, // 750,000 sompi
      fee: 1000,
      verbose: true
    });

    if (result.success && result.psktJson) {
      console.log('✅ Basic PSKT generation successful');
      console.log(`🔍 Generated TxID: ${result.psktJson.id}`);
      console.log(`📊 Inputs: ${result.metadata.inputCount}, Outputs: ${result.metadata.outputCount}`);
      
      testResults.testDetails.push({
        test: 'Basic PSKT Generation',
        status: 'PASS',
        details: 'Successfully generated PSKT with valid structure'
      });
      testResults.passedTests++;
    } else {
      throw new Error(result.error || 'Unknown error in PSKT generation');
    }

  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    testResults.testDetails.push({
      test: 'Basic PSKT Generation',
      status: 'FAIL',
      details: error.message
    });
    testResults.success = false;
  }
  testResults.totalTests++;

  // Test 2: PSKT Validation - Valid Structure
  try {
    console.log('\n📝 Test 2: PSKT Validation - Valid Structure');

    const validPskt = {
      id: 'abc123def456789012345678901234567890123456789012345678901234567890',
      version: 1,
      inputs: [
        {
          previousOutpoint: {
            transactionId: 'input_tx_id_here',
            index: 0
          },
          previousOutput: {
            value: 1000000,
            scriptPubKeyVersion: 0,
            scriptPubKey: 'mock_script'
          },
          sequence: 0,
          sigOpCount: 1
        }
      ],
      outputs: [
        {
          value: 750000,
          scriptPubKeyVersion: 0,
          scriptPubKey: 'output_script'
        },
        {
          value: 249000,
          scriptPubKeyVersion: 0,
          scriptPubKey: 'change_script'
        }
      ],
      lockTime: 0,
      subnetworkId: "0000000000000000000000000000000000000000",
      gas: 0,
      payload: "01010123456789abcdef"
    };

    const validation = validatePsktJson(validPskt, true);

    if (validation.success) {
      console.log('✅ Valid PSKT structure passed validation');
      console.log(`📊 Summary: ${validation.summary.inputCount} inputs, ${validation.summary.outputCount} outputs`);
      
      testResults.testDetails.push({
        test: 'PSKT Validation - Valid Structure',
        status: 'PASS',
        details: `Validation passed with ${validation.summary.totalWarnings} warnings`
      });
      testResults.passedTests++;
    } else {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    testResults.testDetails.push({
      test: 'PSKT Validation - Valid Structure',
      status: 'FAIL',
      details: error.message
    });
    testResults.success = false;
  }
  testResults.totalTests++;

  // Test 3: PSKT Validation - Invalid Structure (Wrong Field Names)
  try {
    console.log('\n📝 Test 3: PSKT Validation - Invalid Structure (Field Name Issues)');

    const invalidPskt = {
      txId: 'abc123def456789012345678901234567890123456789012345678901234567890', // Should be "id"
      version: 1,
      inputs: [
        {
          previousOutpoint: {
            transactionId: 'input_tx_id_here',
            index: 0
          },
          previousOutput: {
            value: 1000000
          }
        }
      ],
      outputs: [
        {
          value: 750000
        }
      ]
      // Missing required fields: lockTime
    };

    const validation = validatePsktJson(invalidPskt, true);

    if (!validation.success) {
      console.log('✅ Invalid PSKT structure correctly rejected');
      console.log(`❌ Found ${validation.errors.length} errors as expected`);
      console.log(`⚠️ Found ${validation.warnings.length} warnings as expected`);
      
      // Check for specific errors we expect
      const hasIdError = validation.errors.some(error => error.includes('Missing required field: "id"'));
      const hasTxIdWarning = validation.warnings.some(warning => warning.includes('Found "txId" field'));
      
      if (hasIdError && hasTxIdWarning) {
        console.log('✅ Correctly identified field name issues');
        testResults.testDetails.push({
          test: 'PSKT Validation - Invalid Structure',
          status: 'PASS',
          details: 'Correctly identified field name and structure issues'
        });
        testResults.passedTests++;
      } else {
        throw new Error('Did not catch expected field name issues');
      }
    } else {
      throw new Error('Invalid PSKT structure incorrectly passed validation');
    }

  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    testResults.testDetails.push({
      test: 'PSKT Validation - Invalid Structure',
      status: 'FAIL',
      details: error.message
    });
    testResults.success = false;
  }
  testResults.totalTests++;

  // Test 4: PSKT Generation - Insufficient Funds
  try {
    console.log('\n📝 Test 4: PSKT Generation - Insufficient Funds Error Handling');

    const smallUtxos = [
      {
        transactionId: 'small_utxo_tx_id',
        index: 0,
        amount: 500, // Only 500 sompi
        scriptPubKey: 'mock_script',
        address: 'kaspa:test_address'
      }
    ];

    const result = await generatePsktJson({
      envelope: '01010123456789abcdef',
      utxos: smallUtxos,
      toAddress: 'kaspa:recipient_address',
      amount: 1000000, // Request 1,000,000 sompi but only have 500
      fee: 1000,
      verbose: true
    });

    if (!result.success && result.error.includes('Insufficient funds')) {
      console.log('✅ Insufficient funds error correctly detected');
      console.log(`💰 Error message: ${result.error}`);
      
      testResults.testDetails.push({
        test: 'PSKT Generation - Insufficient Funds',
        status: 'PASS',
        details: 'Correctly detected insufficient funds'
      });
      testResults.passedTests++;
    } else {
      throw new Error('Should have failed with insufficient funds error');
    }

  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
    testResults.testDetails.push({
      test: 'PSKT Generation - Insufficient Funds',
      status: 'FAIL',
      details: error.message
    });
    testResults.success = false;
  }
  testResults.totalTests++;

  // Test 5: PSKT Critical Field Names Compliance
  try {
    console.log('\n📝 Test 5: PSKT Critical Field Names Compliance (Kastle Wallet)');

    const mockUtxos = [
      {
        transactionId: 'field_test_tx_id',
        index: 0,
        amount: 1000000,
        scriptPubKey: 'test_script',
        address: 'kaspa:test_address'
      }
    ];

    const result = await generatePsktJson({
      envelope: '01010123456789abcdef',
      utxos: mockUtxos,
      toAddress: 'kaspa:recipient',
      amount: 500000,
      fee: 1000
    });

    if (result.success) {
      const pskt = result.psktJson;
      
      // Check critical field names
      const hasIdField = pskt.hasOwnProperty('id');
      const noTxIdField = !pskt.hasOwnProperty('txId');
      const hasCorrectStructure = pskt.inputs && pskt.outputs && pskt.version !== undefined;
      
      if (hasIdField && noTxIdField && hasCorrectStructure) {
        console.log('✅ Critical field names compliance verified');
        console.log(`🔑 Transaction ID field: "id" (correct)`);
        console.log(`📋 Structure: ${Object.keys(pskt).join(', ')}`);
        
        testResults.testDetails.push({
          test: 'PSKT Critical Field Names Compliance',
          status: 'PASS',
          details: 'All critical field names follow Kastle Wallet requirements'
        });
        testResults.passedTests++;
      } else {
        throw new Error('PSKT does not meet critical field name requirements');
      }
    } else {
      throw new Error(result.error || 'PSKT generation failed');
    }

  } catch (error) {
    console.error('❌ Test 5 failed:', error.message);
    testResults.testDetails.push({
      test: 'PSKT Critical Field Names Compliance',
      status: 'FAIL',
      details: error.message
    });
    testResults.success = false;
  }
  testResults.totalTests++;

  // Test Summary
  console.log('\n📊 === PSKT GENERATION TEST SUMMARY ===');
  console.log(`✅ Passed: ${testResults.passedTests}/${testResults.totalTests} tests`);
  console.log(`🎯 Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`);

  if (testResults.success) {
    console.log('🎉 All PSKT generation tests passed!');
  } else {
    console.log('❌ Some PSKT generation tests failed');
  }

  return testResults;
}

/**
 * Quick PSKT validation test with a pre-built PSKT structure
 * @returns {Object} Test result
 */
export function quickPsktValidationTest() {
  console.log('\n🚀 Quick PSKT Validation Test');

  const samplePskt = {
    id: 'sample_transaction_id_for_quick_test',
    version: 1,
    inputs: [
      {
        previousOutpoint: {
          transactionId: 'previous_tx_id',
          index: 0
        },
        previousOutput: {
          value: 1000000,
          scriptPubKeyVersion: 0,
          scriptPubKey: 'sample_script'
        },
        sequence: 0,
        sigOpCount: 1
      }
    ],
    outputs: [
      {
        value: 999000,
        scriptPubKeyVersion: 0,
        scriptPubKey: 'output_script'
      }
    ],
    lockTime: 0,
    subnetworkId: "0000000000000000000000000000000000000000",
    gas: 0,
    payload: "sample_payload_data"
  };

  const validation = validatePsktJson(samplePskt, false);

  return {
    test: 'Quick PSKT Validation',
    status: validation.success ? 'PASS' : 'FAIL',
    details: validation.success 
      ? 'Sample PSKT structure is valid'
      : `Validation errors: ${validation.errors.join(', ')}`,
    summary: validation.summary
  };
}

/**
 * Test PSKT Generation with Fixed UTXO Extraction
 * Task 3.5.4: PSKT Generation Fix and Validation
 * 
 * Tests the complete PSKT generation pipeline with real UTXO data
 * to validate the fixed WASM object property extraction from Task 3.5.3
 */

/**
 * Task 3.5.4: Comprehensive PSKT Generation Test
 * Tests all UTXO field extraction and PSKT JSON structure validation
 */
export async function testPsktGenerationFix(verbose = true) {
  const testResults = {
    testName: "PSKT Generation Fix Validation",
    taskId: "3.5.4",
    timestamp: new Date().toISOString(),
    overall: { success: false, message: "" },
    steps: []
  };

  try {
    if (verbose) {
      console.log('🎯 === TASK 3.5.4: PSKT GENERATION FIX AND VALIDATION ===');
      console.log('🔧 Testing fixed WASM UTXO extraction with real wallet data...');
    }

    // Step 1: Initialize Framework
    await addTestStep(testResults, "Framework Initialization", async () => {
      const initResult = await initialiseKaspaFramework();
      if (!initResult.success) {
        throw new Error(`Framework initialization failed: ${initResult.error}`);
      }
      return { success: true, message: "Kaspa framework initialized successfully" };
    }, verbose);

    // Step 2: Connect to Kastle Wallet
    let walletInfo;
    await addTestStep(testResults, "Kastle Wallet Connection", async () => {
      const connectionResult = await connectKastleWallet(verbose);
      if (!connectionResult.success) {
        throw new Error(`Wallet connection failed: ${connectionResult.error}`);
      }
      walletInfo = connectionResult;
      return { 
        success: true, 
        message: `Connected to wallet: ${connectionResult.walletAddress}`,
        data: { address: connectionResult.walletAddress, balance: connectionResult.balance }
      };
    }, verbose);

    // Step 3: Fetch Real UTXOs
    let utxos;
    await addTestStep(testResults, "UTXO Fetching", async () => {
      const utxoResult = await fetchKastleUtxos(walletInfo.walletAddress, verbose);
      if (!utxoResult.success || !utxoResult.utxos || utxoResult.utxos.length === 0) {
        throw new Error(`Failed to fetch UTXOs: ${utxoResult.error || 'No UTXOs available'}`);
      }
      utxos = utxoResult.utxos;
      return { 
        success: true, 
        message: `Fetched ${utxos.length} UTXOs successfully`,
        data: { 
          utxoCount: utxos.length,
          totalValue: typeof utxoResult.totalBalance === 'bigint' ? utxoResult.totalBalance.toString() : utxoResult.totalBalance,
          constructorTypes: utxos.map(u => u.constructor.name)
        }
      };
    }, verbose);

    // Step 4: Test UTXO Field Extraction (Critical Test)
    let extractionResults;
    await addTestStep(testResults, "WASM UTXO Field Extraction", async () => {
      extractionResults = await testUtxoFieldExtraction(utxos, verbose);
      
      if (!extractionResults.success) {
        throw new Error(`UTXO extraction failed: ${extractionResults.error}`);
      }

      const successRate = (extractionResults.successfulExtractions / extractionResults.totalUtxos) * 100;
      if (successRate < 100) {
        throw new Error(`UTXO extraction success rate too low: ${successRate}% (${extractionResults.successfulExtractions}/${extractionResults.totalUtxos})`);
      }

      return {
        success: true,
        message: `UTXO extraction: ${successRate}% success rate (${extractionResults.successfulExtractions}/${extractionResults.totalUtxos})`,
        data: extractionResults
      };
    }, verbose);

    // Step 5: Generate Test Envelope
    let envelope;
    await addTestStep(testResults, "Pattern Envelope Generation", async () => {
      const envelopeResult = constructEnvelope({
        contractTypeId: "0001",
        payloadData: "test-pskt-generation-data-nonce-12345",
        verbose: verbose
      });

      if (!envelopeResult.success) {
        throw new Error(`Envelope generation failed: ${envelopeResult.error}`);
      }

      envelope = envelopeResult.envelope;
      const envelopeStr = typeof envelope === 'string' ? envelope : envelope.toString();
      return {
        success: true,
        message: `Generated envelope: ${envelopeStr.substring(0, 32)}... (${envelopeStr.length} bytes)`,
        data: { envelopeLength: envelopeStr.length, envelope: envelopeStr.substring(0, 64) }
      };
    }, verbose);

    // Step 6: Generate PSKT JSON (Main Test)
    let psktResult;
    await addTestStep(testResults, "PSKT JSON Generation", async () => {
      // Use a small amount for testing (0.001 KAS = 100000 sompi)
      const testAmount = 100000;
      const testRecipient = walletInfo.walletAddress; // Send to self for testing
      
      psktResult = await generatePsktJson({
        utxos: utxos,
        toAddress: testRecipient,
        amount: testAmount,
        fee: 10000, // 0.0001 KAS fee
        envelope: typeof envelope === 'string' ? envelope : envelope.toString(),
        changeAddress: walletInfo.walletAddress,
        verbose: verbose
      });

      if (!psktResult.success) {
        throw new Error(`PSKT generation failed: ${psktResult.error}`);
      }

      return {
        success: true,
        message: `PSKT JSON generated successfully`,
        data: {
          inputCount: psktResult.metadata.inputCount,
          outputCount: psktResult.metadata.outputCount,
          totalInput: psktResult.metadata.totalInput,
          amount: psktResult.metadata.amount,
          fee: psktResult.metadata.fee,
          txId: psktResult.metadata.txId
        }
      };
    }, verbose);

    // Step 7: Validate PSKT JSON Structure
    let validationResult;
    await addTestStep(testResults, "PSKT JSON Validation", async () => {
      validationResult = validatePsktJson(psktResult.psktJson, verbose);
      
      if (!validationResult.success) {
        throw new Error(`PSKT validation failed: ${validationResult.errors.join(', ')}`);
      }

      return {
        success: true,
        message: `PSKT JSON structure validation passed`,
        data: {
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length,
          summary: validationResult.summary
        }
      };
    }, verbose);

    // Step 8: Detailed Structure Analysis
    await addTestStep(testResults, "PSKT Structure Analysis", async () => {
      const psktJson = psktResult.psktJson;
      
      // Analyze each input for correct field extraction
      const inputAnalysis = psktJson.inputs.map((input, index) => {
        return {
          index,
          hasTransactionId: !!input.previousOutpoint?.transactionId,
          hasOutputIndex: input.previousOutpoint?.index !== undefined,
          hasValue: !!input.previousOutput?.value,
          hasScriptPubKey: !!input.previousOutput?.scriptPubKey,
          transactionId: input.previousOutpoint?.transactionId,
          outputIndex: input.previousOutpoint?.index,
          value: input.previousOutput?.value
        };
      });

      const allInputsValid = inputAnalysis.every(input => 
        input.hasTransactionId && 
        input.hasOutputIndex !== undefined && 
        input.hasValue && 
        input.value > 0
      );

      if (!allInputsValid) {
        const invalidInputs = inputAnalysis.filter(input => 
          !input.hasTransactionId || 
          input.hasOutputIndex === undefined || 
          !input.hasValue || 
          input.value <= 0
        );
        throw new Error(`Invalid inputs found: ${JSON.stringify(invalidInputs, null, 2)}`);
      }

      return {
        success: true,
        message: `All ${inputAnalysis.length} inputs have correct field extraction`,
        data: {
          inputAnalysis,
          criticalFields: {
            allHaveTransactionIds: inputAnalysis.every(i => i.hasTransactionId),
            allHaveOutputIndex: inputAnalysis.every(i => i.hasOutputIndex !== undefined),
            allHaveValue: inputAnalysis.every(i => i.hasValue),
            allHaveValidValue: inputAnalysis.every(i => i.value > 0)
          }
        }
      };
    }, verbose);

    // Mark overall test as successful
    testResults.overall = {
      success: true,
      message: "✅ TASK 3.5.4 COMPLETED SUCCESSFULLY - PSKT generation with fixed UTXO extraction works end-to-end!"
    };

    if (verbose) {
      console.log('\n🎉 === TASK 3.5.4 VALIDATION RESULTS ===');
      console.log('✅ Status: COMPLETE AND SUCCESSFUL');
      console.log(`✅ UTXO Extraction: ${extractionResults.successfulExtractions}/${extractionResults.totalUtxos} (100% success)`);
      console.log(`✅ PSKT Generation: SUCCESS`);
      console.log(`✅ Structure Validation: PASSED (${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings)`);
      console.log(`✅ Critical Fields: All inputs correctly extracted`);
      console.log('\n🚀 READY FOR TASK 3.5.5: End-to-End Transaction Flow Testing');
    }

  } catch (error) {
    testResults.overall = {
      success: false,
      message: `❌ TASK 3.5.4 FAILED: ${error.message}`
    };
    
    if (verbose) {
      console.error('❌ TASK 3.5.4 VALIDATION FAILED:', error);
    }
  }

  return testResults;
}

/**
 * Test UTXO field extraction with detailed analysis
 * Validates the fixed WASM object property extraction from Task 3.5.3
 */
async function testUtxoFieldExtraction(utxos, verbose = false) {
  try {
    if (verbose) console.log('🔍 Testing UTXO field extraction...');

    const results = {
      totalUtxos: utxos.length,
      successfulExtractions: 0,
      extractions: [],
      errors: []
    };

    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      const extraction = {
        index: i,
        constructor: utxo.constructor.name,
        success: false,
        fields: {},
        errors: []
      };

      try {
        // Test Transaction ID extraction (CRITICAL for Task 3.5.4)
        let txId, outputIndex, value, scriptPubKey, address;

        // Use the same extraction logic as in generatePsktJson
        if (utxo.constructor.name.includes('UtxoEntryReference') || utxo.__wbg_ptr) {
          // WASM object - use proven JSON extraction method
          try {
            if (typeof utxo.outpoint === 'function') {
              const outpoint = utxo.outpoint();
              if (verbose) console.log(`🔍 UTXO ${i} outpoint() returned:`, outpoint);
              
              if (outpoint && typeof outpoint === 'object') {
                // Direct property access on returned outpoint object
                txId = outpoint.transactionId;
                outputIndex = outpoint.index;
                if (verbose) console.log(`🎯 Direct access: txId=${txId}, index=${outputIndex}`);
              }
              
              // If direct access fails, try JSON stringification approach
              if (!txId && outpoint) {
                try {
                  const outpointJson = JSON.stringify(outpoint);
                  const parsed = JSON.parse(outpointJson);
                  txId = parsed.transactionId;
                  outputIndex = parsed.index;
                  if (verbose) console.log(`🎯 JSON extraction: txId=${txId}, index=${outputIndex}`);
                } catch (jsonError) {
                  if (verbose) console.log(`⚠️ JSON stringify failed:`, jsonError);
                }
              }
            }
          } catch (e) {
            extraction.errors.push(`outpoint() method failed: ${e.message}`);
          }

          // FALLBACK: Try legacy method call patterns if JSON extraction failed
          if (!txId) {
            try {
              if (typeof utxo.outpoint === 'function') {
                const outpoint = utxo.outpoint();
                if (outpoint) {
                  if (typeof outpoint.transactionId === 'function') {
                    txId = outpoint.transactionId();
                    if (verbose) console.log(`🔍 Legacy transactionId() method returned:`, txId);
                  }
                  if (typeof outpoint.index === 'function') {
                    outputIndex = outpoint.index();
                    if (verbose) console.log(`🔍 Legacy index() method returned:`, outputIndex);
                  }
                }
              }
            } catch (fallbackError) {
              if (verbose) console.log(`⚠️ Legacy method calls failed:`, fallbackError);
            }
          }
          
          // Extract other fields with the same pattern
          try {
            value = typeof utxo.amount === 'function' ? utxo.amount() : utxo.amount || 0;
            if (verbose) console.log(`🔍 UTXO ${i} amount extracted:`, value);
          } catch (e) {
            extraction.errors.push(`amount extraction failed: ${e.message}`);
          }

          try {
            scriptPubKey = typeof utxo.scriptPublicKey === 'function' ? utxo.scriptPublicKey() : utxo.scriptPublicKey || "";
          } catch (e) {
            extraction.errors.push(`scriptPubKey extraction failed: ${e.message}`);
          }

          try {
            address = typeof utxo.address === 'function' ? utxo.address() : utxo.address;
          } catch (e) {
            extraction.errors.push(`address extraction failed: ${e.message}`);
          }
          
          // FINAL FALLBACK: If still no transaction ID, try WASM investigation methods
          if (!txId) {
            try {
              // Try toJSON method if available (as seen in WASM investigation)
              if (typeof utxo.toJSON === 'function') {
                const jsonData = utxo.toJSON();
                if (verbose) console.log(`🔍 UTXO ${i} toJSON() returned:`, jsonData);
                if (jsonData && typeof jsonData === 'object') {
                  if (jsonData.outpoint) {
                    txId = jsonData.outpoint.transactionId || jsonData.outpoint.transaction_id;
                    outputIndex = jsonData.outpoint.index || jsonData.outpoint.outputIndex;
                    if (verbose) console.log(`🎯 toJSON extraction: txId=${txId}, index=${outputIndex}`);
                  }
                }
              }
            } catch (jsonError) {
              extraction.errors.push(`toJSON extraction failed: ${jsonError.message}`);
            }
          }

        } else {
          // Regular JavaScript object
          txId = utxo.transactionId || utxo.txId || utxo.id;
          outputIndex = utxo.index || utxo.outputIndex || utxo.vout || 0;
          value = parseInt(utxo.amount || utxo.value || utxo.satoshis || 0);
          scriptPubKey = utxo.scriptPubKey || utxo.script || "";
          address = utxo.address;
        }

        // Store extracted fields
        extraction.fields = {
          transactionId: txId,
          outputIndex,
          value,
          scriptPubKey,
          address
        };

        // Validate critical fields
        const hasTransactionId = !!txId && txId.length > 0;
        const hasValidOutputIndex = outputIndex !== undefined && outputIndex !== null;
        const hasValue = value > 0;

        if (hasTransactionId && hasValidOutputIndex && hasValue) {
          extraction.success = true;
          results.successfulExtractions++;
        } else {
          extraction.errors.push(`Missing critical fields: txId=${!!txId}, outputIndex=${hasValidOutputIndex}, value=${hasValue}`);
        }

      } catch (error) {
        extraction.errors.push(`General extraction error: ${error.message}`);
      }

      results.extractions.push(extraction);

      if (verbose && extraction.success) {
        console.log(`✅ UTXO ${i}: txId=${extraction.fields.transactionId?.substring(0, 16)}..., index=${extraction.fields.outputIndex}, value=${extraction.fields.value}`);
      } else if (verbose) {
        console.log(`❌ UTXO ${i}: ${extraction.errors.join(', ')}`);
      }
    }

    results.success = results.successfulExtractions === results.totalUtxos;
    results.successRate = (results.successfulExtractions / results.totalUtxos) * 100;

    if (verbose) {
      console.log(`🔍 UTXO Extraction Results: ${results.successfulExtractions}/${results.totalUtxos} (${results.successRate.toFixed(1)}%)`);
    }

    return results;

  } catch (error) {
    return {
      success: false,
      error: error.message,
      totalUtxos: utxos.length,
      successfulExtractions: 0
    };
  }
}

/**
 * Safe JSON serialization that handles BigInt values
 */
function safeJsonStringify(obj, replacer = null, space = 2) {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n'; // Add 'n' suffix to indicate it was a BigInt
    }
    if (replacer && typeof replacer === 'function') {
      return replacer(key, value);
    }
    return value;
  }, space);
}

/**
 * Helper function to add test steps with error handling
 */
async function addTestStep(testResults, stepName, stepFunction, verbose = false) {
  const step = {
    name: stepName,
    success: false,
    message: "",
    timestamp: new Date().toISOString(),
    data: null
  };

  try {
    if (verbose) console.log(`\n🔄 ${stepName}...`);
    
    const result = await stepFunction();
    step.success = result.success;
    step.message = result.message;
    step.data = result.data;
    
    if (verbose) {
      if (step.success) {
        console.log(`✅ ${stepName}: ${step.message}`);
      } else {
        console.log(`❌ ${stepName}: ${step.message}`);
      }
    }
  } catch (error) {
    step.success = false;
    step.message = error.message;
    step.error = error.message;
    
    if (verbose) {
      console.log(`❌ ${stepName}: ${error.message}`);
    }
  }

  testResults.steps.push(step);
  
  if (!step.success) {
    throw new Error(`${stepName} failed: ${step.message}`);
  }
  
  return step;
}

/**
 * Quick test function for UI integration
 */
export async function quickPsktTest(verbose = true) {
  try {
    if (verbose) console.log('🚀 Quick PSKT Generation Test...');
    
    const result = await testPsktGenerationFix(verbose);
    
    return {
      success: result.overall.success,
      message: result.overall.message,
      details: {
        totalSteps: result.steps.length,
        successfulSteps: result.steps.filter(s => s.success).length,
        timestamp: result.timestamp
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Quick test failed: ${error.message}`,
      error: error.message
    };
  }
}

console.log('📦 PSKT Generation test module loaded'); 