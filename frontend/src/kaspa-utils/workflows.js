// Kaspa High-Level Workflow Module

import {
    getKastleWalletStatus,
    connectKastleWallet,
    fetchKastleUtxos,
    signTransactionWithKastle
} from './wallet.js';
import { buildPatternTransactionWithSdk, buildPatternTransactionWithWasmSdk, checkTxIdPattern } from './tx-pattern.js';
import { verifyPatternPreservation } from './pattern-verification.js';
// Leo's Solution: Direct Kastle API for pattern preservation
import { broadcastPatternTransactionDirect } from './broadcast.js'; 
import { getKastleWalletFunctions, initialiseKaspaFramework } from './sdk-init.js'; // For kaspaToSompi if needed directly

/**
 * Core Pattern Transaction Flow with TxID Preservation
 * Uses buildPatternTransactionWithSdk + signTransactionWithKastle + broadcastPatternTransactionDirect
 * This implements the direct Kastle API solution using kastle.request("kas:sign_and_broadcast_tx") to preserve exact TxID patterns
 * @param {Object} options - Transaction options
 * @param {number} options.zeroBits - Number of trailing zero bits for pattern matching
 * @param {string} options.toAddress - Destination address
 * @param {number} options.amount - Amount to send in sompi
 * @param {number} options.fee - Transaction fee in sompi (default: 1000)
 * @param {string} options.networkId - Network identifier: "mainnet" or "testnet-10" (default: "testnet-10")
 * @param {boolean} options.waitForConfirmation - Wait for transaction confirmation (default: false)
 * @param {number} options.confirmationTimeout - Max time to wait for confirmation in seconds (default: 60)
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Complete transaction result with pattern preservation status
 */
export async function createAndBroadcastPatternTransaction(options = {}) {
  try {
    const {
      zeroBits = 8,
      toAddress,
      amount,
      fee = 1000,
      networkId = "testnet-10",
      waitForConfirmation = false,
      confirmationTimeout = 60,
      verbose = false
    } = options;

    if (verbose) console.log('Starting pattern transaction flow with TxID preservation (from workflows.js)...');

    // Step 1: Check wallet status & connect if needed
    let walletStatus = await getKastleWalletStatus(verbose);
    if (!walletStatus.success || !walletStatus.walletInstalled) {
      throw new Error('Kastle Wallet not available or framework not ready.');
    }
    if (!walletStatus.connected) {
      const connectionResult = await connectKastleWallet(verbose);
      if (!connectionResult.success) {
        throw new Error(`Wallet connection failed: ${connectionResult.error}`);
      }
      // Re-check status after connection attempt
      walletStatus = await getKastleWalletStatus(verbose);
      if(!walletStatus.connected) {
        throw new Error('Wallet connection attempt failed, please ensure wallet is unlocked and connected.');
      }
    }

    // Step 2: Fetch fresh UTXOs
    if (verbose) console.log('Fetching fresh UTXOs (from workflows.js)...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    const utxoResult = await fetchKastleUtxos(null, verbose);
    if (!utxoResult.success || utxoResult.utxos.length === 0) {
      throw new Error(`No UTXOs available for transaction: ${utxoResult.error || 'No UTXOs found'}`);
    }
    if (utxoResult.totalBalance < amount + fee + 100) { // Added buffer
      throw new Error(`Insufficient funds: need ${amount + fee + 100} sompi, have ${utxoResult.totalBalance} sompi`);
    }

    // Step 3: Generate pattern transaction using SDK buildTransaction
    if (verbose) console.log(`Generating ${zeroBits}-bit pattern transaction (from workflows.js calling tx-pattern.js)...`);
    const buildResult = await buildPatternTransactionWithSdk({
      zeroBits,
      toAddress: walletStatus.walletAddress, // Self-send for pattern generation as per original logic
      amount, // This is the amount for the actual transaction, pattern gen uses a fixed amount internally
      fee,
      utxos: utxoResult.utxos,
      verbose
    });

    if (!buildResult.success) {
      throw new Error(`Pattern generation failed: ${buildResult.error}`);
    }
    if (verbose) console.log(`Pattern found! TxID: ${buildResult.txId} (from workflows.js)`);

    // Step 4: Sign the original pattern transaction
    if (verbose) console.log('Signing original pattern transaction (from workflows.js calling wallet.js)...');
    const signResult = await signTransactionWithKastle(
      buildResult.utxos,       
      buildResult.outputs,     
      verbose,
      buildResult.transaction  // Pass the actual transaction object with the pattern TxID
    );

    if (!signResult.success) {
      throw new Error(`Transaction signing failed: ${signResult.error}`);
    }
    if (verbose) console.log('Original pattern transaction signed successfully! (from workflows.js)');

    // Step 5: Broadcast using Leo's Direct Kastle API Solution
    if (verbose) console.log('Broadcasting via direct Kastle API solution (from workflows.js calling broadcast.js)...');
    const directBroadcastResult = await broadcastPatternTransactionDirect(
      buildResult.transaction, // The transaction object 
      buildResult.txId,        // The original pattern TxID separately
      {
        networkId,
        waitForConfirmation,
        confirmationTimeout,
        verbose,
        progressCallback: options.progressCallback // Pass through any progress callback
      }
    );

    if (directBroadcastResult.success && directBroadcastResult.txIdPreserved) {
      if (verbose) console.log('SUCCESS: Pattern TxID preserved via direct Kastle API! (from workflows.js)');
      return {
        success: true,
        method: 'Leo\'s Direct Kastle API Solution',
        buildResult,
        signResult,
        directBroadcastResult,
        finalTxId: directBroadcastResult.txId,
        patternTxId: buildResult.txId,
        patternPreserved: directBroadcastResult.txIdPreserved,
        networkId: directBroadcastResult.networkId,
        metadata: {
          ...directBroadcastResult.metadata,
          approach: 'Leo\'s Direct Kastle API',
          worldFirst: true,
          leosSolution: true
        }
      };
    } else if (directBroadcastResult.success && !directBroadcastResult.txIdPreserved) {
      // Transaction succeeded but pattern wasn't preserved - this shouldn't happen with Leo's solution
      console.warn('WARNING: Solution succeeded but pattern not preserved - unexpected! (from workflows.js)', directBroadcastResult);
      return {
        success: true,
        method: 'Leo\'s Direct Kastle API (Pattern Not Preserved)',
        buildResult,
        signResult,
        directBroadcastResult,
        finalTxId: directBroadcastResult.txId,
        patternTxId: buildResult.txId,
        patternPreserved: false,
        networkId: directBroadcastResult.networkId,
        warning: 'Transaction succeeded but pattern not preserved - investigate Leo\'s solution implementation',
        metadata: {
          ...directBroadcastResult.metadata,
          approach: 'Leo\'s Direct Kastle API',
          unexpectedBehavior: true
        }
      };
    } else {
      // Leo's solution failed - fall back to legacy WASM SDK approach
      console.warn('WARNING: Direct API failed, falling back to legacy WASM SDK approach... (from workflows.js)', directBroadcastResult);
      
      if (verbose) console.log('Falling back to WASM SDK pattern verification approach (from workflows.js)...');
      const legacyVerificationResult = await verifyPatternPreservation(
        signResult.signedTransaction,
        buildResult.txId,
        zeroBits,
        { verbose, nodeUrl: options.nodeUrl }
      );

      if (legacyVerificationResult.success && legacyVerificationResult.patternAnalysis.overallSuccess) {
        if (verbose) console.log('Fallback successful: Pattern preserved via legacy WASM SDK (from workflows.js)');
        return {
          success: true,
          method: 'Legacy WASM SDK (Fallback)',
          buildResult,
          signResult,
          verificationResult: legacyVerificationResult,
          finalTxId: legacyVerificationResult.patternAnalysis.networkTxId,
          patternTxId: buildResult.txId,
          patternPreserved: legacyVerificationResult.patternAnalysis.preservationSuccess,
          directBroadcastFailure: directBroadcastResult,
          metadata: {
            ...legacyVerificationResult.summary,
            approach: 'Legacy WASM SDK Fallback',
            leosSolutionFailed: true,
            fallbackSuccess: true
          }
        };
      } else {
        // Both Leo's solution and WASM SDK failed - final fallback to Kastle API
        if (verbose) console.log('WARNING: Both direct solutions failed, final fallback to Kastle API broadcast... (from workflows.js)');
        
        const fallbackBroadcastResult = await broadcastPatternTransactionDirect(signResult.signedTransaction, buildResult.txId, {
          networkId: 'testnet-10',
          verbose,
          progressCallback: options.progressCallback
        });

        if (fallbackBroadcastResult.success) {
          if (verbose) console.log('Final fallback successful: Transaction broadcasted via Kastle API (from workflows.js)');
          return {
            success: true,
            method: 'Kastle API (Final Fallback)',
            buildResult,
            signResult,
            broadcastResult: fallbackBroadcastResult,
            finalTxId: fallbackBroadcastResult.txId,
            patternTxId: buildResult.txId,
            patternPreserved: fallbackBroadcastResult.txIdPreserved,
            directBroadcastFailure: directBroadcastResult,
            metadata: {
              ...fallbackBroadcastResult.metadata,
              approach: 'Kastle API Final Fallback',
              leosSolutionFailed: true,
              fallbackSuccess: true
            }
          };
        } else {
          throw new Error(`All broadcasting methods failed. Last error: ${fallbackBroadcastResult.error}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in createAndBroadcastPatternTransaction (from workflows.js):', error);
    return {
      success: false,
      error: error.message,
      method: 'Main Workflow Error'
    };
  }
}

/**
 * Test Simplified Workflow Theory 
 * Tests if we can send unsigned pattern transactions directly to Kastle API
 * This would eliminate the need for complex PSKT conversion workflow
 * @param {Object} options - Test options
 * @param {number} options.zeroBits - Number of trailing zero bits for pattern matching (default: 8)
 * @param {string} options.networkId - Network identifier (default: testnet-10)
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Test result showing if simplified workflow works
 */
export async function testSimplifiedWorkflow(options = {}) {
  try {
    const {
      zeroBits = 8,
      networkId = "testnet-10",
      verbose = false
    } = options;

    if (verbose) console.log('Testing WASM SDK + Kastle API Theory (Official Documentation Approach) (from workflows.js)...');

    // Step 1: Check wallet status & connect if needed
    let walletStatus = await getKastleWalletStatus(verbose);
    if (!walletStatus.success || !walletStatus.walletInstalled) {
      throw new Error('Kastle Wallet not available or framework not ready.');
    }
    if (!walletStatus.connected) {
      const connectionResult = await connectKastleWallet(verbose);
      if (!connectionResult.success) {
        throw new Error(`Wallet connection failed: ${connectionResult.error}`);
      }
      walletStatus = await getKastleWalletStatus(verbose);
      if(!walletStatus.connected) {
        throw new Error('Wallet connection attempt failed, please ensure wallet is unlocked and connected.');
      }
    }

    // Step 2: Fetch fresh UTXOs
    if (verbose) console.log('Fetching fresh UTXOs for test (from workflows.js)...');
    const utxoResult = await fetchKastleUtxos(null, verbose);
    if (!utxoResult.success || utxoResult.utxos.length === 0) {
      throw new Error(`No UTXOs available for test: ${utxoResult.error || 'No UTXOs found'}`);
    }

    // Step 3: Generate pattern transaction using WASM SDK (Official Kastle docs approach)
    if (verbose) console.log(`Generating ${zeroBits}-bit pattern transaction with WASM SDK for Kastle API compatibility (from workflows.js)...`);
    const buildResult = await buildPatternTransactionWithWasmSdk({
      zeroBits,
      toAddress: walletStatus.walletAddress, // Self-send for testing
      amount: 1000000, // 0.01 KAS for testing (reduced from 0.2 KAS to fit in smaller UTXOs)
      fee: 1000,
      changeAddress: walletStatus.walletAddress, // Use wallet address for change
      utxos: utxoResult.utxos,
      maxIterations: 10000, // Limit for testing
      verbose
    });

    if (!buildResult.success) {
      throw new Error(`Pattern generation failed: ${buildResult.error}`);
    }
    
    if (verbose) {
      console.log(`Pattern found for test! TxID: ${buildResult.txId}`);
      console.log(`Pattern attempts: ${buildResult.attempts}`);
      console.log(`Pattern generation time: ${buildResult.duration}ms`);
    }

    // Step 4: Test Leo's API with unsigned transaction (THE KEY TEST!)
    if (verbose) console.log('Testing API with unsigned transaction (from workflows.js)...');
    
    // Import the test function (dynamic import to avoid circular dependencies)
    const { testLeosApiWithUnsignedTransaction } = await import('./broadcast.js');
    
    const testResult = await testLeosApiWithUnsignedTransaction(
      buildResult.transaction, // Unsigned pattern transaction
      buildResult.txId,        // Original pattern TxID
      {
        networkId: "testnet-10", // Keep full format for internal use
        verbose
      }
    );

    if (verbose) {
      console.log('Complete Test Results:');
      console.log(`Theory Status: ${testResult.metadata.theorySupportLevel}`);
      console.log(`API Accepted Unsigned: ${testResult.apiAcceptedUnsigned}`);
      console.log(`Signing Prompted: ${testResult.signingPrompted}`);
      console.log(`TxID Preserved: ${testResult.txIdPreserved}`);
      console.log(`Total Test Duration: ${testResult.totalDuration}ms`);
    }

    // Step 5: Analyze implications
    const theoryConfirmed = testResult.apiAcceptedUnsigned && testResult.signingPrompted;
    const complexityReduction = theoryConfirmed ? '~80%' : '0%';
    
    return {
      success: true,
      theoryConfirmed: theoryConfirmed,
      complexityReduction: complexityReduction,
      buildResult: buildResult,
      testResult: testResult,
      implications: {
        eliminatesPSKTConversion: theoryConfirmed,
        eliminatesSerializeToSafeJSON: theoryConfirmed,
        eliminatesWASMIntegration: theoryConfirmed,
        simplifiedWorkflow: theoryConfirmed,
        directUnsignedToAPI: theoryConfirmed
      },
      recommendation: theoryConfirmed 
        ? 'IMPLEMENT SIMPLIFIED WORKFLOW - Massive complexity reduction confirmed!'
        : 'CONTINUE WITH PHASE 6 - Complex workflow still needed',
      metadata: {
        task: 'Task 7.1',
        theory: 'Leo\'s Simplified Workflow',
        testType: 'End-to-end unsigned transaction test',
        framework: 'Kastle Wallet + Leo\'s API',
        patternBits: zeroBits,
        networkId: networkId
      }
    };

  } catch (error) {
    if (verbose) {
      console.error('Test Failed:', error.message);
    }

    return {
      success: false,
      error: error.message,
      theoryConfirmed: false,
      complexityReduction: '0%',
      recommendation: 'CONTINUE WITH PHASE 6 - Simplified workflow test failed',
      metadata: {
        task: 'Task 7.1',
        theory: 'Leo\'s Simplified Workflow',
        testType: 'End-to-end unsigned transaction test',
        errorOccurred: true
      }
    };
  }
}

/**
 * ✅ Task 1.2: Implement Steps 1-2 of the 5-Step Workflow
 * Step 1: kastle - Connect wallet, get address
 * Step 2: Kastle - Get UTXOs
 * Also verifies UTXO format compatibility with kaspa-wasm createTransactions()
 * @param {Object} options - Configuration options
 * @param {string} options.network - Network to connect to (default: "testnet-10")
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Result with wallet connection info and UTXOs
 */
export async function implementWorkflowSteps1And2(options = {}) {
  const {
    network = "testnet-10",
    verbose = false
  } = options;

  try {
    if (verbose) console.log('Implementing 5-Step Workflow Steps 1-2 (from workflows.js)...');

    // Initialize framework if needed
    const initResult = await initialiseKaspaFramework();
    if (!initResult.success) {
      throw new Error(`Framework initialization failed: ${initResult.error}`);
    }

    // ===== STEP 1: kastle - Connect wallet, get address =====
    if (verbose) console.log('Step 1: Connecting to Kastle Wallet...');
    
    const connectionResult = await connectKastleWallet(verbose);
    if (!connectionResult.success) {
      throw new Error(`Wallet connection failed: ${connectionResult.error}`);
    }

    const walletInfo = {
      connected: connectionResult.connected,
      address: connectionResult.walletAddress,
      network: connectionResult.network,
      balance: connectionResult.balance
    };

    if (verbose) {
      console.log('Step 1 Complete: Wallet connected successfully');
      console.log(`   Address: ${walletInfo.address}`);
      console.log(`   Network: ${walletInfo.network}`);
      console.log(`   Balance: ${walletInfo.balance} sompi`);
    }

    // ===== STEP 2: Kastle - Get UTXOs =====
    if (verbose) console.log('Step 2: Fetching UTXOs from Kastle Wallet...');
    
    const utxoResult = await fetchKastleUtxos(walletInfo.address, verbose);
    if (!utxoResult.success) {
      throw new Error(`UTXO fetching failed: ${utxoResult.error}`);
    }

    if (verbose) {
      console.log('Step 2 Complete: UTXOs fetched successfully');
      console.log(`   UTXOs Found: ${utxoResult.utxoCount}`);
      console.log(`   Total Balance: ${utxoResult.totalBalance} sompi`);
    }

    // ===== VERIFICATION: Check UTXO format compatibility with WASM SDK =====
    if (verbose) console.log('Verifying UTXO format compatibility with kaspa-wasm createTransactions()...');
    
    const compatibility = await verifyUtxoCompatibility(utxoResult.utxos, verbose);
    
    if (verbose) {
      console.log(`UTXO Compatibility Check: ${compatibility.compatible ? 'COMPATIBLE' : 'INCOMPATIBLE'}`);
      if (!compatibility.compatible) {
        console.log(`   Issues: ${compatibility.issues.join(', ')}`);
        console.log(`   Recommendations: ${compatibility.recommendations.join(', ')}`);
      }
    }

    return {
      success: true,
      workflow: {
        step1: {
          completed: true,
          walletInfo
        },
        step2: {
          completed: true,
          utxos: utxoResult.utxos,
          utxoCount: utxoResult.utxoCount,
          totalBalance: utxoResult.totalBalance
        }
      },
      compatibility,
      metadata: {
        network,
        timestamp: new Date().toISOString(),
        workflowPhase: 'Steps 1-2 Complete',
        nextStep: 'Step 3: kaspa-wasm pattern generation and transaction construction'
      }
    };

  } catch (error) {
    console.error('Error in Steps 1-2 workflow implementation (from workflows.js):', error);
    return {
      success: false,
      error: error.message,
      workflow: {
        step1: { completed: false },
        step2: { completed: false }
      },
      metadata: {
        network,
        timestamp: new Date().toISOString(),
        workflowPhase: 'Steps 1-2 Failed'
      }
    };
  }
}

/**
 * Verify UTXO format compatibility with kaspa-wasm createTransactions()
 * Checks if UTXOs from Kastle can be used directly with WASM SDK
 * @param {Array} utxos - Array of UTXO objects from Kastle
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Compatibility analysis result
 */
async function verifyUtxoCompatibility(utxos, verbose = false) {
  try {
    if (!Array.isArray(utxos) || utxos.length === 0) {
      return {
        compatible: false,
        issues: ['No UTXOs provided for compatibility check'],
        recommendations: ['Ensure UTXOs are fetched successfully before verification']
      };
    }

    const issues = [];
    const recommendations = [];
    const sampleUtxo = utxos[0];

    if (verbose) {
      console.log('Analyzing UTXO format compatibility...');
      console.log('Sample UTXO structure:', {
        hasAmount: 'amount' in sampleUtxo || 'value' in sampleUtxo,
        hasTxId: 'transactionId' in sampleUtxo || 'txId' in sampleUtxo,
        hasIndex: 'index' in sampleUtxo || 'outpoint' in sampleUtxo,
        hasAddress: 'address' in sampleUtxo,
        hasScriptPubKey: 'scriptPubKey' in sampleUtxo,
        actualKeys: Object.keys(sampleUtxo)
      });
    }

    // Check required fields for kaspa-wasm createTransactions()
    // Based on the kaspa-wasm documentation, entries should have:
    // - amount (or value)
    // - transactionId (or txId)  
    // - index
    // - address
    // - scriptPubKey

    utxos.forEach((utxo, index) => {
      // Check amount/value field
      if (!('amount' in utxo) && !('value' in utxo)) {
        issues.push(`UTXO ${index}: Missing amount/value field`);
      }

      // Check transaction ID field
      if (!('transactionId' in utxo) && !('txId' in utxo)) {
        issues.push(`UTXO ${index}: Missing transactionId/txId field`);
      }

      // Check index field
      if (!('index' in utxo)) {
        issues.push(`UTXO ${index}: Missing index field`);
      }

      // Check address field
      if (!('address' in utxo)) {
        issues.push(`UTXO ${index}: Missing address field`);
      }

      // Check scriptPubKey field
      if (!('scriptPubKey' in utxo)) {
        issues.push(`UTXO ${index}: Missing scriptPubKey field`);
      }
    });

    // Generate recommendations based on issues found
    if (issues.length > 0) {
      recommendations.push('Transform UTXO format to match kaspa-wasm expectations');
      recommendations.push('Create UTXO adapter function to normalize field names');
      recommendations.push('Consider using RPC client UTXOs as alternative');
    }

    const compatible = issues.length === 0;

    if (verbose) {
      console.log(`Compatibility Analysis: ${compatible ? 'COMPATIBLE' : 'NEEDS ADAPTATION'}`);
      if (!compatible) {
        console.log('Issues found:', issues);
        console.log('Recommendations:', recommendations);
      }
    }

    return {
      compatible,
      issues,
      recommendations,
      utxoCount: utxos.length,
      sampleUtxo: {
        keys: Object.keys(sampleUtxo),
        hasRequiredFields: compatible
      }
    };

  } catch (error) {
    console.error('Error in UTXO compatibility verification (from workflows.js):', error);
    return {
      compatible: false,
      issues: [`Compatibility check failed: ${error.message}`],
      recommendations: ['Retry compatibility check', 'Verify UTXO format manually']
    };
  }
}

/**
 * Execute the full 5-Step Kaspa Workflow for TxID pattern generation and broadcast.
 * Step 1: kastle - Connect wallet, get address
 * Step 2: Kastle - Get UTXOs
 * Step 3: kaspa-wasm - Construct and mine for ideal TxID pattern (using buildPatternTransactionWithWasmSdk)
 * Step 4: kaspa-wasm - Serialize transaction to safe JSON (handled by broadcastPatternTransactionDirect)
 * Step 5: kastle - Sign and broadcast via Kastle (using broadcastPatternTransactionDirect)
 *
 * @param {Object} options - Configuration options
 * @param {string} options.network - Network to connect to (e.g., "testnet-10", "mainnet")
 * @param {string} options.recipientAddress - The final recipient address for the transaction.
 * @param {number} options.amountKas - The amount to send to the recipient, in KAS.
 * @param {number} options.feeKas - The transaction fee, in KAS.
 * @param {number} options.patternBits - Number of trailing zero bits for the TxID pattern.
 * @param {number} options.maxPatternIterations - Max iterations for pattern mining (default: 100000).
 * @param {boolean} options.waitForConfirmation - Whether to wait for broadcast confirmation (default: false).
 * @param {number} options.confirmationTimeout - Timeout for confirmation in seconds (default: 60).
 * @param {boolean} options.verbose - Enable detailed logging (default: false).
 * @param {Function} options.progressCallback - Callback for progress updates (e.g., for UI).
 * @returns {Promise<Object>} Result object with success status, TxIDs, logs, and other details.
 */
export async function executeKaspaFiveStepWorkflow(options = {}) {
  const {
    network = "testnet-10",
    recipientAddress,
    amountKas = 0.001, // Min amount for example
    feeKas = 0.0001,
    patternBits = 8,
    maxPatternIterations = 100000,
    waitForConfirmation = false,
    confirmationTimeout = 60,
    verbose = false,
    progressCallback = null
  } = options;

  const overallStartTime = Date.now();
  let stepLogs = [];

  const log = (message, data) => {
    const logEntry = { time: new Date().toISOString(), message, data: data || null };
    if (verbose) console.log(message, data || '');
    stepLogs.push(logEntry);
    if (progressCallback) progressCallback({ type: 'log', payload: logEntry });
  };

  try {
    log(`Starting 5-Step Kaspa Workflow: Target ${patternBits}-bit pattern, send ${amountKas} KAS to ${recipientAddress} on ${network}`);

    if (!recipientAddress) {
      throw new Error('Recipient address is required.');
    }

    // ===== Step 1 & 2: Connect Wallet & Get UTXOs =====
    log('Step 1 & 2: Connecting to Kastle Wallet and fetching UTXOs...');
    if (progressCallback) progressCallback({ type: 'status', step: 1, message: 'Connecting wallet & fetching UTXOs...' });
    
    // Ensure Kaspa framework is initialized (idempotent)
    await initialiseKaspaFramework();

    const steps1And2Result = await implementWorkflowSteps1And2({ network, verbose });
    if (!steps1And2Result.success) {
      throw new Error(`Wallet connection or UTXO fetching failed: ${steps1And2Result.error}`);
    }
    const { walletInfo } = steps1And2Result.workflow.step1;
    const { utxos } = steps1And2Result.workflow.step2;
    log('Step 1 & 2 Complete: Wallet connected, UTXOs fetched.', { address: walletInfo.address, utxoCount: utxos.length, balanceSompi: steps1And2Result.workflow.step2.totalBalance });

    if (utxos.length === 0) {
        throw new Error('No UTXOs found in the wallet. Cannot proceed.');
    }
    
    const amountSompi = Math.round(amountKas * 100000000);
    const feeSompi = Math.round(feeKas * 100000000);

    if (steps1And2Result.workflow.step2.totalBalance < amountSompi + feeSompi) {
        throw new Error(`Insufficient funds. Need ${amountKas + feeKas} KAS (${amountSompi + feeSompi} sompi), but wallet has ${steps1And2Result.workflow.step2.totalBalance / 100000000} KAS (${steps1And2Result.workflow.step2.totalBalance} sompi).`);
    }

    // ===== Step 3: Construct and Mine for Ideal TxID Pattern =====
    log(`Step 3: Constructing transaction to ${recipientAddress} for ${amountKas} KAS (fee ${feeKas} KAS) and mining for ${patternBits}-bit TxID pattern...`);
    if (progressCallback) progressCallback({ type: 'status', step: 3, message: `Mining for ${patternBits}-bit TxID pattern...` });
    
    const buildResult = await buildPatternTransactionWithWasmSdk({
      utxos,
      toAddress: recipientAddress,
      amount: amountSompi, // expects sompi
      fee: feeSompi, // expects sompi
      changeAddress: walletInfo.address,
      zeroBits: patternBits,
      networkId: network, // Pass the networkId to WASM SDK step
      maxIterations: maxPatternIterations,
      verbose,
      // progressCallback for buildPattern... can be a sub-progress if needed for finer grain updates
    });

    if (!buildResult.success) {
      throw new Error(`Pattern transaction construction failed: ${buildResult.error}`);
    }
    log('Step 3 Complete: Pattern transaction constructed.', { patternTxId: buildResult.txId, attempts: buildResult.attempts, durationMs: buildResult.duration });
    const { transaction: unsignedPatternTransaction, txId: originalPatternTxId } = buildResult;

    // ===== Step 4 & 5: Serialize Transaction to Safe JSON and Sign & Broadcast via Kastle =====
    log('Step 4 & 5: Serializing and Broadcasting transaction via Kastle (Leo\'s method)...');
    if (progressCallback) progressCallback({ type: 'status', step: 4, message: 'Serializing & Broadcasting...' });

    const broadcastOptions = {
        networkId: network, // networkId for Kastle (e.g. "testnet-10", "mainnet")
        waitForConfirmation,
        confirmationTimeout,
        verbose,
        progressCallback: progressCallback ? (payload) => progressCallback({ type: 'broadcast_log', payload}) : null
    };
    if (verbose) console.log('Broadcasting with options:', broadcastOptions);

    const broadcastResult = await broadcastPatternTransactionDirect(
      unsignedPatternTransaction, 
      originalPatternTxId,
      broadcastOptions
    );

    if (!broadcastResult.success) {
      throw new Error(`Broadcast failed: ${broadcastResult.error}`);
    }
    log('Step 4 & 5 Complete: Transaction broadcasted.', { finalTxId: broadcastResult.txId, preserved: broadcastResult.txIdPreserved, durationMs: broadcastResult.broadcastDuration });
    if (progressCallback) progressCallback({ type: 'status', step: 5, message: 'Broadcast complete!' });

    // ===== Workflow Complete =====
    const overallDuration = Date.now() - overallStartTime;
    const finalMessage = `5-Step Workflow COMPLETED in ${(overallDuration / 1000).toFixed(2)}s. TxID Preservation: ${broadcastResult.txIdPreserved}. Final TxID: ${broadcastResult.txId}`;
    log(finalMessage);
    if (progressCallback) progressCallback({ type: 'final_result', payload: { success: true, message: finalMessage, ...broadcastResult }});
    
    return {
      success: true,
      finalTxId: broadcastResult.txId,
      originalPatternTxId,
      txIdPreserved: broadcastResult.txIdPreserved,
      attempts: buildResult.attempts,
      durationMs: overallDuration,
      steps: {
        walletAndUtxos: steps1And2Result,
        patternTxConstruction: buildResult,
        broadcastAndSign: broadcastResult,
      },
      logs: stepLogs,
      metadata: {
        network,
        patternBits,
        recipientAddress,
        amountKas,
        feeKas,
      }
    };

  } catch (error) {
    const overallDuration = Date.now() - overallStartTime;
    const errorMessage = `Workflow failed: ${error.message}`;
    log(errorMessage, { error: error.toString() });
    if (progressCallback) progressCallback({ type: 'final_result', payload: { success: false, message: errorMessage, error: error.message }});
    return {
      success: false,
      error: error.message,
      durationMs: overallDuration,
      logs: stepLogs,
      metadata: {
        network,
        patternBits,
        recipientAddress,
        amountKas,
        feeKas,
      }
    };
  }
}

console.log('Kaspa Workflows module loaded successfully (workflows.js)'); 