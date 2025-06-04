// Kaspa Transaction ID Pattern Logic Module

import { Buffer } from 'buffer';
import { blake3Hash } from '@webbuf/blake3';
import { WebBuf } from '@webbuf/webbuf';

// Placeholder for constructEnvelope, will be imported from ./envelope.js later
// For now, if createTransactionWithIdPattern is used, it might rely on the global kaspa-utils.js version
import { constructEnvelope } from './envelope.js'; // Adjusted to anticipated path

import { isFrameworkInitialized, getKastleWalletFunctions } from './sdk-init.js';

/**
 * Check if a transaction ID matches the specified bit pattern
 * Simplified and robust implementation that converts hex to binary and checks trailing zeros
 * @param {string} txId - Transaction ID in hex format
 * @param {number} zeroBits - Number of trailing zero bits required (1-64)
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {boolean} True if TxID matches the pattern
 */
export function checkTxIdPattern(txId, zeroBits, verbose = false) {
  try {
    // Input validation
    if (!txId || typeof txId !== 'string') {
      if (verbose) console.error('❌ Invalid TxID: must be a non-empty string');
      return false;
    }
    
    if (!Number.isInteger(zeroBits) || zeroBits < 1 || zeroBits > 64) {
      if (verbose) console.error('❌ Invalid zeroBits: must be integer between 1-64');
      return false;
    }
    
    // Remove '0x' prefix if present and validate hex format
    const cleanTxId = txId.startsWith('0x') ? txId.slice(2) : txId;
    
    if (!/^[0-9a-fA-F]+$/.test(cleanTxId)) {
      if (verbose) console.error('❌ Invalid TxID format: must be valid hexadecimal');
      return false;
    }
    
    // Convert hex to binary string for easy bit checking
    let binaryString = '';
    for (let i = 0; i < cleanTxId.length; i++) {
      const hexChar = cleanTxId[i];
      const value = parseInt(hexChar, 16);
      const binary = value.toString(2).padStart(4, '0');
      binaryString += binary;
    }
    
    // Check if we have enough bits
    if (binaryString.length < zeroBits) {
      if (verbose) console.error(`❌ TxID binary length ${binaryString.length} < required ${zeroBits} bits`);
      return false;
    }
    
    // Check the last N bits to see if they're all zeros
    const lastNBits = binaryString.slice(-zeroBits);
    const allZeros = '0'.repeat(zeroBits);
    const matches = lastNBits === allZeros;
    
    if (verbose) {
      console.log(`🔍 TxID: ${cleanTxId} (from tx-pattern.js)`);
      console.log(`🔍 Binary: ...${binaryString.slice(-Math.min(32, binaryString.length))}`);
      console.log(`🔍 Last ${zeroBits} bits: ${lastNBits}`);
      console.log(`🔍 Expected: ${allZeros}`);
      console.log(`${matches ? '✅' : '❌'} Pattern match: ${matches}`);
    }
    
    return matches;
    
  } catch (error) {
    if (verbose) console.error('❌ Error checking TxID pattern (from tx-pattern.js):', error);
    return false;
  }
}

/**
 * Create a transaction envelope and iterate nonce to find matching TxID pattern
 * Enhanced version with performance optimization and detailed progress tracking
 * @param {Object} options - Configuration options
 * @param {number} options.zeroBits - Number of trailing zero bits required in TxID
 * @param {string} options.contractTypeId - Contract type identifier  
 * @param {string} options.payloadData - Transaction payload data
 * @param {number} options.maxIterations - Maximum iterations before giving up (default: 1000000)
 * @param {Function} options.progressCallback - Callback function for progress updates (optional)
 * @param {number} options.progressInterval - Progress reporting interval in attempts (default: 1000)
 * @returns {Promise<Object>} Object containing the transaction with matching TxID and metadata
 */
export async function createTransactionWithIdPattern(options = {}) {
  try {
    if (!isFrameworkInitialized()) {
      throw new Error('Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from tx-pattern.js)');
    }
    
    const {
      zeroBits = 8,
      contractTypeId = '0x01',
      payloadData = 'Hello Kaspa Pattern Matching!',
      maxIterations = 1000000,
      progressCallback = null,
      progressInterval = 1000
    } = options;
    
    console.log(`🎯 Starting optimized pattern search for ${zeroBits} zero bits (from tx-pattern.js)...`);
    console.log(`📊 Max iterations: ${maxIterations.toLocaleString()}`);
    console.log(`⚡ Expected iterations for ${zeroBits} bits: ~${Math.pow(2, zeroBits).toLocaleString()}`);
    
    let nonce = 0;
    let attempts = 0;
    const startTime = Date.now();
    let lastProgressTime = startTime;
    let bestPattern = { zeroBits: 0, txId: '', attempts: 0 };
    
    const performanceMetrics = {
      iterationsPerSecond: 0,
      estimatedTimeRemaining: 0,
      memoryUsage: typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : null // Browser-safe
    };
    
    const batchSize = zeroBits <= 4 ? 100 : (zeroBits <= 8 ? 1000 : 5000);
    const expectedIterations = Math.pow(2, zeroBits);
    
    console.log(`🔧 Using batch size: ${batchSize} (optimized for ${zeroBits}-bit pattern)`);
    
    while (attempts < maxIterations) {
      const batchStartTime = Date.now();
      
      for (let batchIndex = 0; batchIndex < batchSize && attempts < maxIterations; batchIndex++) {
        attempts++;
        
        const paddedNonce = nonce.toString().padStart(10, '0');
        const payloadWithNonce = `${payloadData}_nonce_${paddedNonce}`;
        
        const envelopeResult = constructEnvelope({ // This function will be from ./envelope.js
          version: 0x01,
          contractTypeId,
          payloadData: payloadWithNonce,
          verbose: false 
        });
        
        if (!envelopeResult.success) {
          throw new Error(`Envelope construction failed: ${envelopeResult.error}`);
        }
        
        const envelope = envelopeResult.envelope;
        const envelopeWebBuf = new WebBuf(envelope);
        const txIdHash = blake3Hash(envelopeWebBuf);
        const txId = Buffer.from(txIdHash.buf).toString('hex');
        
        const currentZeroBits = getTrailingZeroBits(txId); // Uses local getTrailingZeroBits
        if (currentZeroBits > bestPattern.zeroBits) {
          bestPattern = { zeroBits: currentZeroBits, txId, attempts };
        }
        
        if (checkTxIdPattern(txId, zeroBits)) { // Uses local checkTxIdPattern
          const endTime = Date.now();
          const duration = endTime - startTime;
          const iterationsPerSecond = (attempts / duration) * 1000;
          
          console.log(`🎉 SUCCESS! Pattern found after ${attempts.toLocaleString()} attempts in ${duration}ms (from tx-pattern.js)`);
          console.log(`🆔 Winning TxID: ${txId}`);
          console.log(`🔢 Winning nonce: ${nonce} (padded: ${paddedNonce})`);
          console.log(`⚡ Performance: ${iterationsPerSecond.toFixed(0)} iterations/second`);
          console.log(`🎯 Target efficiency: ${((attempts / expectedIterations) * 100).toFixed(1)}% of expected iterations`);
          
          return {
            success: true,
            txId,
            nonce,
            paddedNonce,
            attempts,
            duration,
            iterationsPerSecond: Math.round(iterationsPerSecond),
            efficiency: (attempts / expectedIterations),
            envelope: envelope.toString('hex'),
            envelopeMetadata: envelopeResult.metadata,
            payloadWithNonce,
            zeroBits,
            bestPatternFound: bestPattern,
            performanceMetrics: {
              ...performanceMetrics,
              iterationsPerSecond: Math.round(iterationsPerSecond),
              totalDuration: duration,
              averageTimePerIteration: duration / attempts
            }
          };
        }
        nonce++;
      }
      
      const batchEndTime = Date.now();
      const batchDuration = batchEndTime - batchStartTime;
      const currentIterationsPerSecond = (batchSize / batchDuration) * 1000;
      performanceMetrics.iterationsPerSecond = Math.round(currentIterationsPerSecond);
      
      const remainingIterations = expectedIterations - attempts;
      if (currentIterationsPerSecond > 0) {
        performanceMetrics.estimatedTimeRemaining = Math.round(remainingIterations / currentIterationsPerSecond);
      } else {
        performanceMetrics.estimatedTimeRemaining = Infinity;
      }
      
      if (attempts % progressInterval === 0 || (batchEndTime - lastProgressTime) >= 2000) {
        const elapsed = batchEndTime - startTime;
        console.log(`🔄 Progress: ${attempts.toLocaleString()}/${maxIterations.toLocaleString()} attempts (${((attempts/maxIterations)*100).toFixed(1)}%) (from tx-pattern.js)`);
        console.log(`   ⏱️  Elapsed: ${elapsed}ms | Speed: ${performanceMetrics.iterationsPerSecond.toLocaleString()}/sec`);
        console.log(`   🎯 Best so far: ${bestPattern.zeroBits} zero bits (at attempt ${bestPattern.attempts.toLocaleString()})`);
        
        if (performanceMetrics.estimatedTimeRemaining < 300 && performanceMetrics.estimatedTimeRemaining !== Infinity) {
          console.log(`   ⏳ ETA: ~${performanceMetrics.estimatedTimeRemaining} seconds`);
        }
        
        if (progressCallback && typeof progressCallback === 'function') {
          progressCallback({
            attempts,
            maxIterations,
            progress: (attempts / maxIterations) * 100,
            elapsed,
            iterationsPerSecond: performanceMetrics.iterationsPerSecond,
            bestPattern: { ...bestPattern },
            estimatedTimeRemaining: performanceMetrics.estimatedTimeRemaining
          });
        }
        lastProgressTime = batchEndTime;
      }
      
      if (attempts > 10000) {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        if (elapsedSeconds > 0) {
            const currentRate = attempts / elapsedSeconds;
            const projectedTimeFor8Bit = (Math.pow(2, 8) / currentRate);
            if (zeroBits === 8 && projectedTimeFor8Bit > 10) {
              console.warn(`⚠️  Performance warning: Current rate (${currentRate.toFixed(0)}/sec) may not meet 5-second target for 8-bit patterns (from tx-pattern.js)`);
            }
        }
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const iterationsPerSecond = (attempts > 0 && duration > 0) ? (attempts / duration) * 1000 : 0;
    
    console.log(`⏰ Max iterations reached (${maxIterations.toLocaleString()}) in ${duration}ms (from tx-pattern.js)`);
    console.log(`❌ Pattern with ${zeroBits} zero bits not found`);
    console.log(`📊 Final performance: ${iterationsPerSecond.toFixed(0)} iterations/second`);
    console.log(`🎯 Best pattern found: ${bestPattern.zeroBits} zero bits`);
    
    return {
      success: false,
      attempts,
      duration,
      iterationsPerSecond: Math.round(iterationsPerSecond),
      zeroBits,
      bestPatternFound: bestPattern,
      error: `Pattern not found within ${maxIterations.toLocaleString()} iterations`,
      performanceMetrics: {
        ...performanceMetrics,
        iterationsPerSecond: Math.round(iterationsPerSecond),
        totalDuration: duration,
        averageTimePerIteration: attempts > 0 ? duration / attempts : 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error in createTransactionWithIdPattern (from tx-pattern.js):', error);
    return {
      success: false,
      error: error.message,
      zeroBits: options.zeroBits || 8
    };
  }
}

/**
 * Helper function to count trailing zero bits in a hex string
 * Used for tracking best patterns found during iteration
 * @param {string} hexString - Hex string to analyze
 * @returns {number} Number of trailing zero bits
 */
export function getTrailingZeroBits(hexString) {
  try {
    let binaryString = '';
    for (let i = 0; i < hexString.length; i++) {
      const hexChar = hexString[i];
      const value = parseInt(hexChar, 16);
      const binary = value.toString(2).padStart(4, '0');
      binaryString += binary;
    }
    
    let zeroBits = 0;
    for (let i = binaryString.length - 1; i >= 0; i--) {
      if (binaryString[i] === '0') {
        zeroBits++;
      } else {
        break;
      }
    }
    return zeroBits;
  } catch (error) {
    // console.error('Error in getTrailingZeroBits (from tx-pattern.js):', error); // Optional: log error
    return 0;
  }
}

/**
 * ✅ METHOD 2: Build transaction with pattern integration using correct SDK approach
 * Combines pattern generation with buildTransaction() for proper SDK compliance
 * @param {Object} options - Transaction building options
 * @param {Array} options.utxos - Array of UTXO objects from getUtxosByAddress
 * @param {string} options.toAddress - Destination address
 * @param {number} options.amount - Amount to send in sompi
 * @param {number} options.fee - Transaction fee in sompi
 * @param {string} options.changeAddress - Change address (optional)
 * @param {number} options.zeroBits - Number of trailing zero bits for pattern matching
 * @param {number} options.maxIterations - Maximum pattern matching iterations
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Transaction building result with pattern integration
 */
export async function buildPatternTransactionWithSdk(options = {}) {
  try {
    const kastleFuncs = getKastleWalletFunctions();
    if (!isFrameworkInitialized() || !kastleFuncs) {
      throw new Error('Kaspa Framework or Kastle functions not initialized. Call initialiseKaspaFramework() first. (from tx-pattern.js)');
    }

    const {
      utxos,
      toAddress,
      amount,
      fee = 1000,
      changeAddress = null,
      zeroBits = 8,
      maxIterations = 1000000,
      verbose = false
    } = options;

    if (verbose) console.log('🔧 Building pattern transaction with SDK approach (from tx-pattern.js)...');

    if (!Array.isArray(utxos) || utxos.length === 0) {
      throw new Error('Invalid UTXOs: must be a non-empty array');
    }
    if (!toAddress) {
      throw new Error('Invalid toAddress: must be provided');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Invalid amount: must be a positive integer');
    }

    const sortedUtxos = [...utxos].sort((a, b) => {
      const amountA = typeof a.amount === 'function' ? a.amount() : a.amount || 0;
      const amountB = typeof b.amount === 'function' ? b.amount() : b.amount || 0;
      return Number(amountA) - Number(amountB);
    });
    
    const singleUtxo = [sortedUtxos[0]];
    if (verbose) {
      const utxoAmount = typeof singleUtxo[0].amount === 'function' ? singleUtxo[0].amount() : singleUtxo[0].amount || 0;
      console.log('🔧 Using smallest UTXO to avoid duplicates:', utxoAmount, 'sompi');
    }

    const totalInput = (() => {
      try {
        const value = typeof singleUtxo[0].amount === 'function' ? singleUtxo[0].amount() : singleUtxo[0].amount || 0;
        return Number(value);
      } catch (e) { return 0; }
    })();
    
    if (verbose) {
      console.log(`💰 Total input: ${totalInput} sompi`);
      console.log(`📤 Amount to send: ${amount} sompi`);
      console.log(`💸 Fee: ${fee} sompi`);
    }

    if (totalInput < amount + fee) {
      throw new Error(`Insufficient funds: need ${amount + fee} sompi, have ${totalInput} sompi`);
    }

    const changeAmount = totalInput - amount - fee;
    let finalChangeAddress = changeAddress;
    if (!finalChangeAddress && changeAmount > 0) {
      try {
        finalChangeAddress = await kastleFuncs.getWalletAddress();
        if (verbose) console.log(`🔄 Using wallet address for change: ${finalChangeAddress}`);
      } catch (error) {
        if (verbose) console.warn(`⚠️ Could not get wallet address for change:`, error);
        finalChangeAddress = toAddress;
      }
    }

    if (verbose) {
      console.log(`🎯 Starting ${zeroBits}-bit pattern search using REAL transaction IDs (from tx-pattern.js)...`);
      console.log(`🔧 Pattern strategy: Use real transaction.id from SDK buildTransaction()`);
      console.log(`💰 Amount: Base 0.2 KAS + nonce variation (0-999 sompi)`);
      console.log(`🔄 Structure: Single UTXO → Single output (self-send) with amount variation`);
    }

    let nonce = 0;
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxIterations) {
      attempts++;
      const paddedNonce = nonce.toString().padStart(6, '0');
      const baseAmountSompi = 20000000; 
      const nonceVariation = nonce; 
      const amountWithNonce = baseAmountSompi + nonceVariation;
      
      if (verbose && attempts % 1000 === 0) {
        console.log(`🔄 Attempt ${attempts}: nonce=${nonce}, amount=${amountWithNonce} sompi`);
      }

      const outputs = [{
        address: finalChangeAddress, 
        amount: kastleFuncs.kaspaWasm.kaspaToSompi((amountWithNonce / 100000000).toFixed(8))
      }];

      try {
        const transaction = kastleFuncs.buildTransaction(singleUtxo, outputs);
        if (!transaction) throw new Error('buildTransaction returned null');

        if (verbose && attempts === 1 && typeof transaction.addData === 'function') {
           console.log('🧪 Attempting to add payload data to transaction (from tx-pattern.js)');
           const noncePayload = `nonce_${paddedNonce}_${Date.now()}`;
           try {
             transaction.addData(noncePayload);
             console.log('✅ Successfully added payload data to transaction');
           } catch (addDataError) {
             console.log('❌ Failed to add payload data:', addDataError.message);
           }
        }

        let txId;
        if (typeof transaction === 'string') {
          try {
            const parsedTransaction = JSON.parse(transaction);
            txId = parsedTransaction.id;
          } catch (parseError) {
            throw new Error(`Failed to parse transaction JSON: ${parseError.message}`);
          }
        } else {
          txId = transaction.id;
        }
        
        if (!txId) throw new Error(`No transaction ID found in transaction object/string`);

        if (verbose && attempts <= 5) {
          console.log(`🔍 Attempt ${attempts}: nonce=${nonce}, amount=${amountWithNonce}, TxID=${txId}`);
        }

        if (checkTxIdPattern(txId, zeroBits)) { // Uses local checkTxIdPattern
          const endTime = Date.now();
          const duration = endTime - startTime;
          if (verbose) {
            console.log(`🎉 Pattern found using REAL transaction ID! ${attempts} attempts in ${duration}ms (from tx-pattern.js)`);
            console.log(`🆔 Pattern TxID: ${txId}`);
            console.log(`🔢 Winning nonce: ${nonce} (${paddedNonce})`);
            console.log(`💰 Final amount: ${amountWithNonce} sompi (base 0.2 KAS + ${nonceVariation} sompi nonce)`);
          }
          return {
            success: true, transaction, utxos: singleUtxo, outputs, txId, nonce, paddedNonce, attempts, duration,
            nonceVariation, winningAmount: amountWithNonce, zeroBits, method: 'Real TxID Pattern Matching (SDK-based)',
            metadata: {
              totalInput, baseAmount: baseAmountSompi, finalAmount: amountWithNonce,
              patternStrategy: 'Real transaction TxID with amount variation',
              utxoCount: singleUtxo.length, outputCount: outputs.length,
              approach: 'Use real transaction.id from SDK buildTransaction()',
              selfSend: true, wasmSafe: true, realTxId: true
            }
          };
        }
        nonce++;
        if (attempts % 5000 === 0 && verbose) {
          console.log(`🔄 Real TxID pattern search progress: ${attempts} attempts (${((attempts/maxIterations)*100).toFixed(1)}%) (from tx-pattern.js)`);
        }
      } catch (buildError) {
        if (attempts % 10000 === 0 && verbose) {
          console.warn(`⚠️ buildTransaction error at attempt ${attempts} (from tx-pattern.js):`, buildError.message);
        }
        nonce++; 
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    if (verbose) {
      console.log(`⏰ Pattern search completed: ${attempts} attempts in ${duration}ms (from tx-pattern.js)`);
      console.log(`❌ ${zeroBits}-bit pattern not found within ${maxIterations} iterations`);
    }
    return {
      success: false, attempts, duration, zeroBits, maxIterations,
      error: `Pattern not found within ${maxIterations} iterations`,
      method: 'Real TxID Pattern Matching (SDK-based) - failed'
    };
  } catch (error) {
    console.error('❌ Error in real TxID pattern transaction building (from tx-pattern.js):', error);
    return { success: false, error: error.message, method: 'Real TxID Pattern Matching (SDK-based) - error' };
  }
}

/**
 * 🎯 TASK 7.1 FIX: Build pattern transaction with WASM SDK (Official Kastle Documentation Approach)
 * Uses kaspaWasm.createTransactions() instead of kastleFuncs.buildTransaction() for Kastle API compatibility
 * @param {Object} options - Transaction building options
 * @param {Array} options.utxos - Array of UTXO objects from getUtxosByAddress
 * @param {string} options.toAddress - Destination address
 * @param {number} options.amount - Amount to send in sompi
 * @param {number} options.fee - Transaction fee in sompi
 * @param {string} options.changeAddress - Change address (optional)
 * @param {number} options.zeroBits - Number of trailing zero bits for pattern matching
 * @param {number} options.maxIterations - Maximum pattern matching iterations
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @param {string} options.networkId - Network ID for kaspaWasm.createTransactions() (default: 'testnet-10')
 * @returns {Promise<Object>} Transaction building result with WASM SDK transaction
 */
export async function buildPatternTransactionWithWasmSdk(options = {}) {
  try {
    const { getKaspaWasmModule, getRpcClient } = await import('./sdk-init.js');
    const kaspaWasm = getKaspaWasmModule();
    const rpcClient = getRpcClient();

    if (!kaspaWasm || !rpcClient) {
      throw new Error('WASM SDK not properly initialized');
    }

    const {
      utxos,
      toAddress,
      amount,
      fee = 1000,
      changeAddress = null,
      zeroBits = 8,
      maxIterations = 1000000,
      verbose = false,
      networkId = "testnet-10"
    } = options;

    if (verbose) console.log(`Building pattern transaction with WASM SDK for network: ${networkId}`);

    // Simplified validation
    if (!Array.isArray(utxos) || !utxos.length || !toAddress || !Number.isInteger(amount) || amount <= 0) {
      throw new Error('Invalid input parameters');
    }

    // Simplified UTXO conversion
    const entries = utxos.map(utxo => ({
      address: utxo.address || utxo.scriptPublicKey || '',
      amount: BigInt(utxo.amount || 0),
      outpoint: {
        transactionId: utxo.transactionId || utxo.outpoint?.transactionId || '',
        index: parseInt(utxo.index || utxo.outpoint?.index || 0, 10)
      },
      utxoEntry: {
        amount: BigInt(utxo.amount || 0),
        scriptPublicKey: utxo.scriptPublicKey || utxo.scriptPubKey || '',
        blockDaaScore: BigInt(utxo.blockDaaScore || 0),
        isCoinbase: utxo.isCoinbase || false
      }
    }));

    let nonce = 0;
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < maxIterations) {
      attempts++;
      
      // Simplified nonce variation
      const amountWithNonce = amount + (nonce % 1000);
      
      try {
        const pending = await kaspaWasm.createTransactions({
          entries,
          outputs: [{
            address: changeAddress || toAddress,
            amount: kaspaWasm.kaspaToSompi((amountWithNonce / 100000000).toFixed(8))
          }],
          priorityFee: kaspaWasm.kaspaToSompi((fee / 100000000).toFixed(8)),
          changeAddress: changeAddress || toAddress,
          networkId
        });

        if (!pending?.transactions?.length) {
          throw new Error('No transactions created');
        }

        const transaction = pending.transactions[0];
        const txJson = transaction.serializeToSafeJSON?.() || transaction;
        const txId = txJson?.id || transaction.id;

        if (!txId) {
          throw new Error('No transaction ID available');
        }

        if (checkTxIdPattern(txId, zeroBits)) {
          const duration = Date.now() - startTime;
          
          if (verbose) {
            console.log(`Pattern found! ${attempts} attempts in ${duration}ms`);
            console.log(`TxID: ${txId}, Nonce: ${nonce}, Amount: ${amountWithNonce} sompi`);
          }

          return {
            success: true,
            transaction,
            txJson,
            txId,
            nonce,
            attempts,
            duration,
            winningAmount: amountWithNonce,
            zeroBits,
            method: 'WASM SDK Pattern Matching'
          };
        }

        nonce++;
        
        if (verbose && attempts % 5000 === 0) {
          console.log(`Progress: ${attempts}/${maxIterations} attempts`);
        }

      } catch (error) {
        if (verbose && attempts % 10000 === 0) {
          console.warn(`Error at attempt ${attempts}:`, error.message);
        }
        nonce++;
      }
    }

    const duration = Date.now() - startTime;
    
    if (verbose) {
      console.log(`Pattern search completed: ${attempts} attempts in ${duration}ms`);
      console.log(`No ${zeroBits}-bit pattern found within ${maxIterations} iterations`);
    }

    return {
      success: false,
      attempts,
      duration,
      zeroBits,
      error: `Pattern not found within ${maxIterations} iterations`
    };

  } catch (error) {
    console.error('Error in buildPatternTransactionWithWasmSdk:', error);
    return {
      success: false,
      error: error.message,
      zeroBits: options.zeroBits || 8
    };
  }
}

console.log('📦 Kaspa TX Pattern module loaded successfully (tx-pattern.js)'); 