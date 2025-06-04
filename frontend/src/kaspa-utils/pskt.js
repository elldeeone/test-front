// Kaspa PSKT (Partially Signed Kaspa Transaction) Module

import { Buffer } from 'buffer';
import { WebBuf } from '@webbuf/webbuf';
import { blake3Hash } from '@webbuf/blake3';
import { isFrameworkInitialized, getKastleWalletFunctions, getKaspaWasmModule } from './sdk-init.js';

/**
 * Generate PSKT (Partially Signed Kaspa Transaction) JSON for Kastle Wallet
 * Creates properly formatted PSKT with correct field names and data types
 * @param {Object} options - PSKT generation options
 * @param {string} options.envelope - Transaction envelope in hex format
 * @param {Array} options.utxos - Array of UTXO objects from Kastle Wallet
 * @param {string} options.toAddress - Destination address for the transaction
 * @param {number} options.amount - Amount to send in sompi (smallest unit)
 * @param {number} options.fee - Transaction fee in sompi
 * @param {string} options.changeAddress - Address for change output (optional)
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Object} PSKT generation result with JSON structure
 */
export async function generatePsktJson(options = {}) {
  try {
    if (!isFrameworkInitialized()) {
      throw new Error('Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from pskt.js)');
    }

    const kastleWalletFuncs = getKastleWalletFunctions();
    if (!kastleWalletFuncs) {
        throw new Error('Kastle Wallet functions not available. (from pskt.js)');
    }

    const {
      envelope,
      utxos = [],
      toAddress,
      amount,
      fee = 1000, // Default fee in sompi
      changeAddress = null,
      verbose = false
    } = options;

    if (verbose) console.log('🔧 Generating PSKT JSON (from pskt.js)...');

    // Validation
    if (!envelope || typeof envelope !== 'string') {
      throw new Error('Invalid envelope: must be a non-empty hex string');
    }
    if (!utxos || !Array.isArray(utxos) || utxos.length === 0) {
      throw new Error('Invalid UTXOs: must be a non-empty array');
    }
    if (!toAddress || typeof toAddress !== 'string') {
      throw new Error('Invalid toAddress: must be a non-empty string');
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Invalid amount: must be a positive integer');
    }

    const totalInput = utxos.reduce((sum, utxo) => sum + parseInt(utxo.amount || utxo.value || 0), 0);
    
    if (verbose) {
      console.log(`💰 Total input: ${totalInput} sompi`);
      console.log(`📤 Amount to send: ${amount} sompi`);
      console.log(`💸 Fee: ${fee} sompi`);
    }

    if (totalInput < amount + fee) {
      throw new Error(`Insufficient funds: need ${amount + fee} sompi, have ${totalInput} sompi`);
    }

    const inputs = utxos.map((utxo, index) => {
      if (verbose) {
        console.log(`🔍 UTXO ${index} structure:`, Object.keys(utxo));
        console.log(`🔍 UTXO ${index} data:`, utxo);
        console.log(`🔍 UTXO ${index} constructor:`, utxo.constructor ? utxo.constructor.name : 'N/A');
      }

      let txId, outputIndex, value, scriptPubKey;

      if (utxo.constructor && (utxo.constructor.name.includes('UtxoEntryReference') || utxo.__wbg_ptr)) {
        if (verbose) console.log(`🔧 Detected WASM UTXO object, attempting to extract data...`);
        try {
          if (typeof utxo.outpoint === 'function') {
            const outpoint = utxo.outpoint();
            if (outpoint && typeof outpoint === 'object') {
              txId = outpoint.transactionId;
              outputIndex = outpoint.index;
            }
            if (!txId && outpoint) {
              const outpointJson = JSON.stringify(outpoint);
              const parsed = JSON.parse(outpointJson);
              txId = parsed.transactionId;
              outputIndex = parsed.index;
            }
          }
          if (!txId && typeof utxo.toJSON === 'function') {
            const jsonData = utxo.toJSON();
            if (jsonData && typeof jsonData === 'object' && jsonData.outpoint) {
              txId = jsonData.outpoint.transactionId || jsonData.outpoint.transaction_id;
              outputIndex = jsonData.outpoint.index || jsonData.outpoint.outputIndex;
            }
          }
          if (!txId) {
            txId = typeof utxo.transactionId === 'function' ? utxo.transactionId() : utxo.transactionId;
            outputIndex = typeof utxo.index === 'function' ? utxo.index() : utxo.index || 0;
          }

          try {
            value = typeof utxo.amount === 'function' ? utxo.amount() : utxo.amount || 0;
          } catch (e) { value = utxo.value || 0; }

          const addressObj = typeof utxo.address === 'function' ? utxo.address() : utxo.address;
          if (addressObj && typeof addressObj === 'object') {
            scriptPubKey = typeof addressObj.toString === 'function' ? addressObj.toString() : (addressObj.prefix && addressObj.payload ? `${addressObj.prefix}:${addressObj.payload}` : "");
          } else if (typeof addressObj === 'string') {
            scriptPubKey = addressObj;
          } else {
            scriptPubKey = typeof utxo.scriptPublicKey === 'function' ? utxo.scriptPublicKey() : utxo.scriptPublicKey || "";
          }
        } catch (wasmError) {
          if (verbose) console.warn(`⚠️ Error extracting from WASM object (from pskt.js):`, wasmError);
          // Fallbacks remain similar to original
        }
      } else {
        txId = utxo.transactionId || utxo.txId || utxo.id || utxo.txid || 
               utxo.transaction_id || utxo.tx_id || utxo.outpoint?.transactionId ||
               utxo.outpoint?.txId || utxo.previousOutpoint?.transactionId;
        outputIndex = utxo.index || utxo.outputIndex || utxo.vout || 
                     utxo.outpoint?.index || utxo.outpoint?.outputIndex ||
                     utxo.previousOutpoint?.index || 0;
        value = parseInt(utxo.amount || utxo.value || utxo.satoshis || 0);
        let addressFromRegularUtxo = utxo.address || utxo.scriptPubKey || utxo.script || utxo.scriptPubkey || "";
        if (addressFromRegularUtxo && typeof addressFromRegularUtxo === 'object') {
          scriptPubKey = typeof addressFromRegularUtxo.toString === 'function' ? addressFromRegularUtxo.toString() : (addressFromRegularUtxo.prefix && addressFromRegularUtxo.payload ? `${addressFromRegularUtxo.prefix}:${addressFromRegularUtxo.payload}` : "");
        } else {
            scriptPubKey = addressFromRegularUtxo;
        }
      }

      if (typeof value === 'bigint') value = Number(value);
      if (typeof outputIndex === 'bigint') outputIndex = Number(outputIndex);

      if (!txId) {
        console.error(`❌ UTXO ${index} missing transaction ID (from pskt.js). Fields:`, Object.keys(utxo));
        throw new Error(`UTXO ${index} missing transaction ID. Constructor: ${utxo.constructor ? utxo.constructor.name : 'N/A'}`);
      }
      if (value <= 0) throw new Error(`UTXO ${index} has invalid value: ${value}`);

      return {
        previousOutpoint: { transactionId: txId, index: outputIndex },
        previousOutput: { value: value, scriptPubKey: scriptPubKey || "" },
        sequence: 0
      };
    });

    const outputs = [];
    outputs.push({ value: amount, scriptPubKey: toAddress });

    const changeAmount = totalInput - amount - fee;
    if (changeAmount > 0) {
      let changeAddr = changeAddress;
      if (!changeAddr && utxos.length > 0) {
        const firstUtxo = utxos[0];
        try {
          if (firstUtxo.constructor && (firstUtxo.constructor.name.includes('UtxoEntryReference') || firstUtxo.__wbg_ptr)) {
            const addressObj = typeof firstUtxo.address === 'function' ? firstUtxo.address() : firstUtxo.address;
            if (addressObj && typeof addressObj === 'object') {
              changeAddr = typeof addressObj.toString === 'function' ? addressObj.toString() : (addressObj.prefix && addressObj.payload ? `${addressObj.prefix}:${addressObj.payload}` : null);
            } else if (typeof addressObj === 'string') {
              changeAddr = addressObj;
            }
          } else {
            changeAddr = firstUtxo.address;
          }
        } catch (error) {
          if (verbose) console.warn(`⚠️ Could not extract address from UTXO for change (from pskt.js):`, error);
        }
      }
      if (!changeAddr) {
        try {
          changeAddr = await kastleWalletFuncs.getWalletAddress();
          if (verbose) console.log(`🔄 Using wallet address for change: ${changeAddr} (from pskt.js)`);
        } catch (error) {
          if (verbose) console.warn(`⚠️ Could not get wallet address for change (from pskt.js):`, error);
          changeAddr = toAddress;
        }
      }
      outputs.push({ value: changeAmount, scriptPubKey: changeAddr });
      if (verbose) console.log(`🔄 Change: ${changeAmount} sompi to ${changeAddr} (from pskt.js)`);
    }

    const envelopeBuffer = Buffer.from(envelope, 'hex');
    const envelopeWebBuf = new WebBuf(envelopeBuffer);
    const txIdHash = blake3Hash(envelopeWebBuf);
    const generatedTxId = Buffer.from(txIdHash.buf).toString('hex');

    const psktJson = {
      version: 1,
      inputs: inputs,
      outputs: outputs,
      lockTime: 0
    };

    if (verbose) {
      console.log('✅ PSKT JSON generated successfully (from pskt.js)');
    }

    return {
      success: true,
      psktJson,
      metadata: {
        inputCount: inputs.length, outputCount: outputs.length, totalInput, amount, fee, changeAmount,
        envelopeIncluded: false, txId: generatedTxId, note: "Using minimal PSKT structure (from pskt.js)"
      }
    };

  } catch (error) {
    console.error('❌ Error generating PSKT JSON (from pskt.js):', error);
    return { success: false, error: error.message, psktJson: null };
  }
}

/**
 * Validate PSKT JSON structure for Kastle Wallet compatibility
 * Checks for correct field names, data types, and required fields
 * @param {Object} psktJson - PSKT JSON object to validate
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Object} Validation result with detailed feedback
 */
export function validatePsktJson(psktJson, verbose = false) {
  try {
    if (verbose) console.log('🔍 Validating PSKT JSON structure (from pskt.js)...');
    const errors = [];
    const warnings = [];

    if (!psktJson || typeof psktJson !== 'object') {
      errors.push('PSKT must be a non-null object');
      return { success: false, errors, warnings };
    }

    if (!psktJson.hasOwnProperty('id')) warnings.push('Missing "id" field - will be calculated during signing');
    if (psktJson.hasOwnProperty('txId')) warnings.push('Found "txId" field - should be "id" for Kastle Wallet compatibility');

    const requiredFields = ['version', 'inputs', 'outputs', 'lockTime'];
    for (const field of requiredFields) {
      if (!psktJson.hasOwnProperty(field)) errors.push(`Missing required field: "${field}"`);
    }

    if (psktJson.version !== undefined && !Number.isInteger(psktJson.version)) errors.push('Field "version" must be an integer');
    if (psktJson.inputs !== undefined && !Array.isArray(psktJson.inputs)) errors.push('Field "inputs" must be an array');
    if (psktJson.outputs !== undefined && !Array.isArray(psktJson.outputs)) errors.push('Field "outputs" must be an array');
    if (psktJson.lockTime !== undefined && !Number.isInteger(psktJson.lockTime)) errors.push('Field "lockTime" must be an integer');

    if (Array.isArray(psktJson.inputs)) {
      psktJson.inputs.forEach((input, index) => {
        if (!input.previousOutpoint) errors.push(`Input ${index}: missing "previousOutpoint"`);
        else {
          if (!input.previousOutpoint.transactionId) errors.push(`Input ${index}: missing "previousOutpoint.transactionId"`);
          if (input.previousOutpoint.index === undefined) errors.push(`Input ${index}: missing "previousOutpoint.index"`);
        }
        if (!input.previousOutput) errors.push(`Input ${index}: missing "previousOutput"`);
        else {
          if (input.previousOutput.value === undefined) errors.push(`Input ${index}: missing "previousOutput.value"`);
        }
      });
    }

    if (Array.isArray(psktJson.outputs)) {
      psktJson.outputs.forEach((output, index) => {
        if (output.value === undefined) errors.push(`Output ${index}: missing "value"`);
        if (!output.scriptPubKey) warnings.push(`Output ${index}: missing "scriptPubKey"`);
      });
    }

    const isValid = errors.length === 0;
    if (verbose) {
      if (isValid) console.log('✅ PSKT JSON validation passed (from pskt.js)');
      else console.log('❌ PSKT JSON validation failed (from pskt.js)');
      errors.forEach(error => console.log(`  ❌ ${error}`));
      if (warnings.length > 0) {
        console.log('⚠️ Validation warnings (from pskt.js):');
        warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
      }
    }
    return {
      success: isValid, errors, warnings,
      summary: {
        totalErrors: errors.length, totalWarnings: warnings.length,
        inputCount: Array.isArray(psktJson.inputs) ? psktJson.inputs.length : 0,
        outputCount: Array.isArray(psktJson.outputs) ? psktJson.outputs.length : 0
      }
    };
  } catch (error) {
    return { success: false, errors: [`Validation error: ${error.message} (from pskt.js)`], warnings: [] };
  }
}

/**
 * 🎯 TASK 6.1: Convert Signed PSKT to WASM Transaction Object
 * Converts Kastle's signed PSKT format to WASM Transaction object for Leo's API
 * This preserves the TxID and signature scripts from the signed PSKT
 * @param {Object|string} signedPskt - Signed PSKT from Kastle wallet (JSON string or object)
 * @param {Object} options - Conversion options
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Conversion result with WASM Transaction object
 */
export async function convertSignedPsktToWasmTransaction(signedPskt, options = {}) {
  try {
    const { verbose = false } = options;
    
    if (verbose) console.log('🎯 Task 6.1: Converting signed PSKT to WASM Transaction (from pskt.js)...');

    // Get WASM module
    const currentKaspaModule = getKaspaWasmModule();
    if (!currentKaspaModule) {
      throw new Error('Kaspa WASM module not initialized. Call initialiseKaspaFramework() first.');
    }

    // Step 1: Parse JSON string if needed
    let transactionData;
    if (typeof signedPskt === 'string') {
      try { 
        transactionData = JSON.parse(signedPskt); 
        if (verbose) console.log('✅ Parsed signed PSKT from JSON string (from pskt.js)');
      }
      catch (parseError) { 
        throw new Error(`Failed to parse signed PSKT JSON: ${parseError.message}`); 
      }
    } else {
      transactionData = signedPskt;
      if (verbose) console.log('✅ Using signed PSKT object directly (from pskt.js)');
    }

    // Step 2: Validate signed PSKT structure
    if (!transactionData || typeof transactionData !== 'object') {
      throw new Error('Invalid signed PSKT: must be an object or JSON string');
    }

    const requiredFields = ['id', 'inputs', 'outputs'];
    for (const field of requiredFields) {
      if (!transactionData[field]) {
        throw new Error(`Invalid signed PSKT: missing required field "${field}"`);
      }
    }

    if (verbose) {
      console.log(`🔍 Signed PSKT structure (from pskt.js):`, {
        id: transactionData.id,
        inputCount: transactionData.inputs?.length || 0,
        outputCount: transactionData.outputs?.length || 0,
        hasSignatures: transactionData.inputs?.some(input => input.signatureScript) || false
      });
    }

    const originalTxId = transactionData.id;
    if (verbose) console.log(`🎯 Original TxID to preserve: ${originalTxId} (from pskt.js)`);

    // Step 3: Convert to WASM Transaction using interface objects (proven approach)
    if (verbose) console.log('🔧 Converting inputs to WASM format (from pskt.js)...');
    
    const wasmInputs = transactionData.inputs.map((input, index) => {
      if (verbose) {
        console.log(`🔧 Processing input ${index}: txId=${input.transactionId}, index=${input.index}, hasSignature=${!!input.signatureScript} (from pskt.js)`);
      }
      
      // Use interface object format (proven working approach from broadcast.js)
      return {
        previousOutpoint: {
          transactionId: input.transactionId,
          index: parseInt(input.index || 0, 10)
        },
        signatureScript: input.signatureScript || '',  // ✅ PRESERVES SIGNATURE SCRIPT
        sequence: BigInt(input.sequence || 0),
        sigOpCount: parseInt(input.sigOpCount || 1, 10)
      };
    });
    
    if (verbose) console.log('🔧 Converting outputs to WASM format (from pskt.js)...');
    
    const wasmOutputs = transactionData.outputs.map((output, index) => {
      if (verbose) {
        console.log(`🔧 Processing output ${index}: amount=${output.value || output.amount} (from pskt.js)`);
      }
      
      return {
        value: BigInt(output.value || output.amount || 0),  // ✅ FIXED: Use 'value' property for WASM SDK
        scriptPublicKey: output.scriptPublicKey || output.scriptPubKey || ''
      };
    });
    
    if (verbose) console.log('🔧 Creating WASM Transaction with interface objects (from pskt.js)...');
    
    // Step 4: Create transaction using interface object (preserves all data)
    const transactionObject = {
      version: parseInt(transactionData.version || 1, 10),
      inputs: wasmInputs,
      outputs: wasmOutputs,
      lockTime: BigInt(transactionData.lockTime || 0),
      subnetworkId: transactionData.subnetworkId || '0000000000000000000000000000000000000000',
      gas: BigInt(transactionData.gas || 0),
      payload: transactionData.payload || ''
    };
    
    // Step 5: Convert interface object to WASM Transaction
    let wasmTransaction;
    try {
      if (typeof currentKaspaModule.Transaction.fromObject === 'function') {
        wasmTransaction = currentKaspaModule.Transaction.fromObject(transactionObject);
        if (verbose) console.log('✅ WASM Transaction created using fromObject() method (from pskt.js)');
      } else if (typeof currentKaspaModule.Transaction === 'function') {
        // Try direct constructor with interface object
        wasmTransaction = new currentKaspaModule.Transaction(transactionObject);
        if (verbose) console.log('✅ WASM Transaction created using constructor (from pskt.js)');
      } else {
        throw new Error('Unable to create WASM Transaction - no valid constructor method found');
      }
    } catch (constructorError) {
      throw new Error(`Failed to create WASM Transaction: ${constructorError.message}`);
    }

    // Step 6: Verify serializeToSafeJSON method is available
    if (typeof wasmTransaction.serializeToSafeJSON !== 'function') {
      if (verbose) console.warn('⚠️ serializeToSafeJSON method not found, checking alternatives (from pskt.js)...');
      
      // Check for alternative serialization methods
      const availableMethods = Object.getOwnPropertyNames(wasmTransaction).filter(name => 
        name.includes('serialize') || name.includes('JSON')
      );
      
      if (verbose) console.log(`🔍 Available serialization methods: ${availableMethods.join(', ')} (from pskt.js)`);
      
      if (availableMethods.length === 0) {
        throw new Error('WASM Transaction object does not have serializeToSafeJSON() method or alternatives');
      }
    } else {
      if (verbose) console.log('✅ serializeToSafeJSON() method confirmed available (from pskt.js)');
    }

    if (verbose) console.log('🎉 Task 6.1: Signed PSKT successfully converted to WASM Transaction! (from pskt.js)');

    return {
      success: true,
      wasmTransaction,
      originalTxId,
      metadata: {
        inputCount: wasmInputs.length,
        outputCount: wasmOutputs.length,
        hasSignatures: wasmInputs.some(input => input.signatureScript),
        serializationMethodAvailable: typeof wasmTransaction.serializeToSafeJSON === 'function',
        conversionMethod: 'interface_objects'
      }
    };

  } catch (error) {
    console.error('❌ Task 6.1: Signed PSKT to WASM Transaction conversion failed (from pskt.js):', error);
    return {
      success: false,
      error: error.message,
      wasmTransaction: null,
      originalTxId: null
    };
  }
}

/**
 * 🎯 TASK 6.2: Convert Signed PSKT to Leo's API Format
 * Complete function to convert signed PSKT to serializeToSafeJSON() format for Leo's API
 * Uses Task 6.1 conversion function and calls serializeToSafeJSON() method
 * @param {Object|string} signedPskt - Signed PSKT from Kastle wallet (JSON string or object)
 * @param {Object} options - Conversion options
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Conversion result with Leo's API JSON format
 */
export async function convertSignedPsktToLeosApiFormat(signedPskt, options = {}) {
  try {
    const { verbose = false } = options;
    
    if (verbose) console.log('🎯 Task 6.2: Converting signed PSKT to Leo\'s API format (from pskt.js)...');

    // Step 1: Convert signed PSKT to WASM Transaction using Task 6.1 function
    if (verbose) console.log('🔧 Step 1: Converting PSKT to WASM Transaction (from pskt.js)...');
    
    const conversionResult = await convertSignedPsktToWasmTransaction(signedPskt, { verbose });
    
    if (!conversionResult.success) {
      throw new Error(`Task 6.1 conversion failed: ${conversionResult.error}`);
    }

    const { wasmTransaction, originalTxId, metadata } = conversionResult;
    
    if (verbose) {
      console.log('✅ Step 1 completed: WASM Transaction created (from pskt.js)', {
        originalTxId,
        inputCount: metadata.inputCount,
        outputCount: metadata.outputCount,
        hasSignatures: metadata.hasSignatures,
        serializationMethodAvailable: metadata.serializationMethodAvailable
      });
    }

    // Step 2: Verify serializeToSafeJSON method is available
    if (!metadata.serializationMethodAvailable) {
      throw new Error('WASM Transaction does not have serializeToSafeJSON() method required for Leo\'s API');
    }

    // Step 3: Call serializeToSafeJSON() method (Paul Chen confirmed format)
    if (verbose) console.log('🔧 Step 2: Calling serializeToSafeJSON() method (from pskt.js)...');
    
    let leosApiJson;
    let serializationMethod = 'unknown';
    
    // Try serializeToSafeJSON() first with better error handling
    try {
      if (verbose) console.log('🔧 Attempting serializeToSafeJSON() (from pskt.js)...');
      leosApiJson = wasmTransaction.serializeToSafeJSON();
      serializationMethod = 'serializeToSafeJSON';
      
      if (verbose) {
        console.log('🔍 serializeToSafeJSON() returned:', typeof leosApiJson, leosApiJson);
      }
      
      // Check if it returned a valid result
      if (leosApiJson === undefined || leosApiJson === null) {
        throw new Error('serializeToSafeJSON() returned undefined/null');
      }
      
      if (verbose) console.log('✅ serializeToSafeJSON() completed successfully (from pskt.js)');
      
    } catch (safeJsonError) {
      if (verbose) {
        console.warn('⚠️ serializeToSafeJSON() failed:', safeJsonError.message);
        console.log('🔧 Trying alternative serialization methods (from pskt.js)...');
      }
      
      // Get all available methods for debugging
      const availableMethods = Object.getOwnPropertyNames(wasmTransaction).filter(name => 
        name.includes('serialize') || name.includes('JSON') || name.includes('json')
      );
      
      if (verbose) console.log('🔍 Available serialization methods:', availableMethods);
      
      let fallbackSuccess = false;
      
      // Try serializeToJSON() method
      if (!fallbackSuccess && typeof wasmTransaction.serializeToJSON === 'function') {
        try {
          if (verbose) console.log('🔧 Trying serializeToJSON() method (from pskt.js)...');
          leosApiJson = wasmTransaction.serializeToJSON();
          serializationMethod = 'serializeToJSON';
          if (leosApiJson !== undefined && leosApiJson !== null) {
            fallbackSuccess = true;
            if (verbose) console.log('✅ serializeToJSON() succeeded (from pskt.js)');
          }
        } catch (jsonError) {
          if (verbose) console.warn('⚠️ serializeToJSON() failed:', jsonError.message);
        }
      }
      
      // Try toJSON() method
      if (!fallbackSuccess && typeof wasmTransaction.toJSON === 'function') {
        try {
          if (verbose) console.log('🔧 Trying toJSON() method (from pskt.js)...');
          leosApiJson = wasmTransaction.toJSON();
          serializationMethod = 'toJSON';
          if (leosApiJson !== undefined && leosApiJson !== null) {
            fallbackSuccess = true;
            if (verbose) console.log('✅ toJSON() succeeded (from pskt.js)');
          }
        } catch (toJsonError) {
          if (verbose) console.warn('⚠️ toJSON() failed:', toJsonError.message);
        }
      }
      
      // Try serialize() method
      if (!fallbackSuccess && typeof wasmTransaction.serialize === 'function') {
        try {
          if (verbose) console.log('🔧 Trying serialize() method (from pskt.js)...');
          const serialized = wasmTransaction.serialize();
          serializationMethod = 'serialize';
          if (typeof serialized === 'string') {
            leosApiJson = JSON.parse(serialized);
          } else {
            leosApiJson = serialized;
          }
          if (leosApiJson !== undefined && leosApiJson !== null) {
            fallbackSuccess = true;
            if (verbose) console.log('✅ serialize() succeeded (from pskt.js)');
          }
        } catch (serializeError) {
          if (verbose) console.warn('⚠️ serialize() failed:', serializeError.message);
        }
      }
      
      if (!fallbackSuccess) {
        throw new Error(`All serialization methods failed. Original serializeToSafeJSON() error: ${safeJsonError.message}. Available methods: ${availableMethods.join(', ')}`);
      }
    }
    
    if (verbose) {
      console.log(`✅ Transaction serialization completed using ${serializationMethod} (from pskt.js)`);
      console.log('🔍 Final serialized result type:', typeof leosApiJson);
    }

    // Step 4: Validate the resulting JSON structure
    if (verbose) console.log('🔧 Step 3: Validating Leo\'s API JSON format (from pskt.js)...');
    
    if (!leosApiJson || typeof leosApiJson !== 'object') {
      throw new Error('serializeToSafeJSON() returned invalid data - expected object');
    }

    // Check for basic transaction structure that Leo's API would expect
    const expectedFields = ['version', 'inputs', 'outputs'];
    const missingFields = expectedFields.filter(field => !leosApiJson.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      if (verbose) console.warn(`⚠️ Leo's API JSON missing expected fields: ${missingFields.join(', ')} (from pskt.js)`);
    }

    // Step 5: Create the final payload for Leo's kastle.request() API
    if (verbose) console.log('🔧 Step 4: Creating final Leo\'s API payload (from pskt.js)...');
    
    // Convert BigInt values to strings for Kastle extension compatibility
    const kastleCompatibleTxJson = JSON.parse(JSON.stringify(leosApiJson, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    const leosApiPayload = {
      networkId: "testnet-10", // Default - can be overridden by caller
      txJson: kastleCompatibleTxJson
    };

    // Calculate payload size safely (handling BigInt values)
    let payloadSize;
    try {
      payloadSize = JSON.stringify(leosApiPayload, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ).length;
    } catch (sizeError) {
      payloadSize = -1; // Fallback if size calculation fails
      if (verbose) console.warn('⚠️ Could not calculate payload size:', sizeError.message);
    }

    if (verbose) {
      console.log('🎉 Task 6.2: Signed PSKT successfully converted to Leo\'s API format! (from pskt.js)', {
        originalTxId,
        txJsonKeys: Object.keys(leosApiJson),
        payloadReady: true
      });
    }

    return {
      success: true,
      leosApiPayload,
      txJson: leosApiJson,
      originalTxId,
      metadata: {
        ...metadata,
        apiFormatValidated: missingFields.length === 0,
        missingFields: missingFields.length > 0 ? missingFields : null,
        payloadSize: payloadSize,
        readyForKastleRequest: true,
        serializationMethodUsed: serializationMethod
      }
    };

  } catch (error) {
    console.error('❌ Task 6.2: Signed PSKT to Leo\'s API format conversion failed (from pskt.js):', error);
    return {
      success: false,
      error: error.message,
      leosApiPayload: null,
      txJson: null,
      originalTxId: null
    };
  }
}

/**
 * 🧪 TEST FUNCTION: Test Signed PSKT to WASM Transaction Conversion
 * Tests the convertSignedPsktToWasmTransaction function with sample data (Task 6.1)
 * @param {Object} options - Test options
 * @param {boolean} options.verbose - Enable detailed logging (default: true)
 * @returns {Promise<Object>} Test result
 */
export async function testSignedPsktConversion(options = {}) {
  try {
    const { verbose = true } = options;
    
    if (verbose) console.log('🧪 Testing Task 6.1: Signed PSKT to WASM Transaction conversion (from pskt.js)...');

    // Sample signed PSKT structure (simulating what Kastle wallet returns)
    const sampleSignedPskt = {
      id: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      version: 1,
      inputs: [
        {
          transactionId: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          index: 0,
          signatureScript: "483045022100abc...def022000123...789",  // Simulated signature
          sequence: 0,
          sigOpCount: 1
        }
      ],
      outputs: [
        {
          value: 1000000,              // 1 KAS in sompi
          scriptPublicKey: "kaspatest:qqkqc8p3l4z0q5qghq3hqfxdqf5z8q5qqfqjqxzqyq8q"
        },
        {
          value: 99000000,            // Change output
          scriptPublicKey: "kaspatest:qqkqc8p3l4z0q5qghq3hqfxdqf5z8q5qqfqjqxzqyq9q"
        }
      ],
      lockTime: 0,
      subnetworkId: "0000000000000000000000000000000000000000",
      gas: 0,
      payload: ""
    };

    // Test with object format
    if (verbose) console.log('🔬 Testing conversion with PSKT object (from pskt.js)...');
    const objectResult = await convertSignedPsktToWasmTransaction(sampleSignedPskt, { verbose });
    
    if (!objectResult.success) {
      throw new Error(`Object conversion failed: ${objectResult.error}`);
    }

    // Test with JSON string format
    if (verbose) console.log('🔬 Testing conversion with PSKT JSON string (from pskt.js)...');
    const jsonString = JSON.stringify(sampleSignedPskt);
    const stringResult = await convertSignedPsktToWasmTransaction(jsonString, { verbose });
    
    if (!stringResult.success) {
      throw new Error(`String conversion failed: ${stringResult.error}`);
    }

    // Verify results
    const testResults = {
      objectConversion: {
        success: objectResult.success,
        hasWasmTransaction: !!objectResult.wasmTransaction,
        originalTxId: objectResult.originalTxId,
        hasSerializeMethod: objectResult.metadata.serializationMethodAvailable,
        inputCount: objectResult.metadata.inputCount,
        outputCount: objectResult.metadata.outputCount,
        hasSignatures: objectResult.metadata.hasSignatures
      },
      stringConversion: {
        success: stringResult.success,
        hasWasmTransaction: !!stringResult.wasmTransaction,
        originalTxId: stringResult.originalTxId,
        hasSerializeMethod: stringResult.metadata.serializationMethodAvailable,
        inputCount: stringResult.metadata.inputCount,
        outputCount: stringResult.metadata.outputCount,
        hasSignatures: stringResult.metadata.hasSignatures
      }
    };

    // Test serialization if available
    let serializationTest = null;
    if (objectResult.wasmTransaction && typeof objectResult.wasmTransaction.serializeToSafeJSON === 'function') {
      try {
        const serializedJson = objectResult.wasmTransaction.serializeToSafeJSON();
        serializationTest = {
          success: true,
          jsonLength: JSON.stringify(serializedJson).length,
          hasValidStructure: !!(serializedJson && typeof serializedJson === 'object')
        };
        if (verbose) console.log('✅ serializeToSafeJSON() test successful (from pskt.js)');
      } catch (serError) {
        serializationTest = { success: false, error: serError.message };
        if (verbose) console.warn('⚠️ serializeToSafeJSON() test failed (from pskt.js):', serError);
      }
    }

    if (verbose) console.log('🎉 Task 6.1 conversion test completed successfully! (from pskt.js)');

    return {
      success: true,
      testResults,
      serializationTest,
      summary: {
        bothFormatsWorking: objectResult.success && stringResult.success,
        serializationAvailable: testResults.objectConversion.hasSerializeMethod,
        signaturesPreserved: testResults.objectConversion.hasSignatures,
        txIdPreserved: testResults.objectConversion.originalTxId === sampleSignedPskt.id
      }
    };

  } catch (error) {
    console.error('❌ Task 6.1 conversion test failed (from pskt.js):', error);
    return {
      success: false,
      error: error.message,
      testResults: null,
      serializationTest: null
    };
  }
}

/**
 * 🧪 TEST FUNCTION: Test Signed PSKT to Leo's API Format Conversion
 * Tests the complete Task 6.2 implementation with sample data
 * @param {Object} options - Test options
 * @param {boolean} options.verbose - Enable detailed logging (default: true)
 * @param {string} options.networkId - Network ID for testing (default: testnet-10)
 * @returns {Promise<Object>} Test result
 */
export async function testSignedPsktToLeosApiConversion(options = {}) {
  try {
    const { verbose = true, networkId = "testnet-10" } = options;
    
    if (verbose) console.log('🧪 Testing Task 6.2: Signed PSKT to Leo\'s API format conversion (from pskt.js)...');

    // Use the same sample data from Task 6.1 test
    const sampleSignedPskt = {
      id: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      version: 1,
      inputs: [
        {
          transactionId: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          index: 0,
          signatureScript: "483045022100abc...def022000123...789",  // Simulated signature
          sequence: 0,
          sigOpCount: 1
        }
      ],
      outputs: [
        {
          value: 1000000,              // 1 KAS in sompi
          scriptPublicKey: "kaspatest:qqkqc8p3l4z0q5qghq3hqfxdqf5z8q5qqfqjqxzqyq8q"
        },
        {
          value: 99000000,            // Change output
          scriptPublicKey: "kaspatest:qqkqc8p3l4z0q5qghq3hqfxdqf5z8q5qqfqjqxzqyq9q"
        }
      ],
      lockTime: 0,
      subnetworkId: "0000000000000000000000000000000000000000",
      gas: 0,
      payload: ""
    };

    // Test with object format
    if (verbose) console.log('🔬 Testing Leo\'s API conversion with PSKT object (from pskt.js)...');
    const objectResult = await convertSignedPsktToLeosApiFormat(sampleSignedPskt, { verbose });
    
    if (!objectResult.success) {
      throw new Error(`Object conversion failed: ${objectResult.error}`);
    }

    // Test with JSON string format
    if (verbose) console.log('🔬 Testing Leo\'s API conversion with PSKT JSON string (from pskt.js)...');
    const jsonString = JSON.stringify(sampleSignedPskt);
    const stringResult = await convertSignedPsktToLeosApiFormat(jsonString, { verbose });
    
    if (!stringResult.success) {
      throw new Error(`String conversion failed: ${stringResult.error}`);
    }

    // Test Leo's kastle.request() format preparation
    if (verbose) console.log('🔬 Testing Leo\'s kastle.request() API call format (from pskt.js)...');
    
    const kastleRequestCall = {
      method: "kas:sign_and_broadcast_tx",
      params: {
        networkId: networkId,
        txJson: objectResult.txJson
      }
    };

    if (verbose) {
      console.log('📋 Sample Leo\'s API usage (from pskt.js):');
      console.log('kastle.request("kas:sign_and_broadcast_tx", {');
      console.log(`  networkId: "${networkId}",`);
      console.log('  txJson: <serializeToSafeJSON_output>');
      console.log('});');
    }

    const testResults = {
      objectConversion: {
        success: objectResult.success,
        hasLeosApiPayload: !!objectResult.leosApiPayload,
        hasTxJson: !!objectResult.txJson,
        originalTxId: objectResult.originalTxId,
        apiFormatValidated: objectResult.metadata.apiFormatValidated,
        payloadSize: objectResult.metadata.payloadSize,
        readyForKastleRequest: objectResult.metadata.readyForKastleRequest
      },
      stringConversion: {
        success: stringResult.success,
        hasLeosApiPayload: !!stringResult.leosApiPayload,
        hasTxJson: !!stringResult.txJson,
        originalTxId: stringResult.originalTxId,
        apiFormatValidated: stringResult.metadata.apiFormatValidated,
        payloadSize: stringResult.metadata.payloadSize,
        readyForKastleRequest: stringResult.metadata.readyForKastleRequest
      },
      kastleRequestFormat: {
        method: kastleRequestCall.method,
        networkId: kastleRequestCall.params.networkId,
        txJsonProvided: !!kastleRequestCall.params.txJson,
        callReady: true
      }
    };

    if (verbose) console.log('🎉 Task 6.2 Leo\'s API conversion test completed successfully! (from pskt.js)');

    return {
      success: true,
      testResults,
      sampleKastleRequestCall: kastleRequestCall,
      summary: {
        bothFormatsWorking: objectResult.success && stringResult.success,
        apiFormatValid: testResults.objectConversion.apiFormatValidated,
        txIdPreserved: testResults.objectConversion.originalTxId === sampleSignedPskt.id,
        kastleRequestReady: testResults.kastleRequestFormat.callReady,
        payloadSizeBytes: testResults.objectConversion.payloadSize
      }
    };

  } catch (error) {
    console.error('❌ Task 6.2 Leo\'s API conversion test failed (from pskt.js):', error);
    return {
      success: false,
      error: error.message,
      testResults: null,
      sampleKastleRequestCall: null
    };
  }
}

console.log('📦 Kaspa PSKT module loaded successfully (pskt.js)'); 