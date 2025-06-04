// Kaspa Wallet Interaction Module

import { isFrameworkInitialized, getKastleWalletFunctions } from './sdk-init.js';

/**
 * Connect to Kastle Wallet
 * Establishes connection with the user's Kastle Wallet extension
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Connection result with wallet info
 */
export async function connectKastleWallet(verbose = false) {
  try {
    if (!isFrameworkInitialized()) {
      throw new Error('Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from wallet.js)');
    }
    const kastleWalletFuncs = getKastleWalletFunctions();
    if (!kastleWalletFuncs) {
        throw new Error('Kastle Wallet functions not available. (from wallet.js)');
    }

    if (verbose) console.log('🔌 Connecting to Kastle Wallet (from wallet.js)...');

    const walletInstalled = await kastleWalletFuncs.isWalletInstalled();
    if (!walletInstalled) {
      throw new Error('Kastle Wallet not installed. Please install the Kastle Wallet browser extension.');
    }

    const connectionResult = await kastleWalletFuncs.connect();
    if (verbose) console.log('🔗 Connection result:', connectionResult);

    const walletAddress = await kastleWalletFuncs.getWalletAddress();
    const network = await kastleWalletFuncs.getNetwork();
    const balance = await kastleWalletFuncs.getBalance();

    if (verbose) {
      console.log('✅ Kastle Wallet connected successfully (from wallet.js)');
      console.log(`📍 Address: ${walletAddress}`);
      console.log(`🌐 Network: ${network}`);
      console.log(`💰 Balance: ${balance} sompi`);
    }

    return {
      success: true,
      connected: true,
      walletAddress,
      network,
      balance,
      connectionResult
    };

  } catch (error) {
    console.error('❌ Error connecting to Kastle Wallet (from wallet.js):', error);
    return {
      success: false,
      error: error.message,
      connected: false
    };
  }
}

/**
 * Disconnect from Kastle Wallet
 * Closes the connection to the user's Kastle Wallet
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Disconnection result
 */
export async function disconnectKastleWallet(verbose = false) {
  try {
    if (!isFrameworkInitialized()) {
      throw new Error('Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from wallet.js)');
    }
    const kastleWalletFuncs = getKastleWalletFunctions();
    if (!kastleWalletFuncs) {
        throw new Error('Kastle Wallet functions not available. (from wallet.js)');
    }

    if (verbose) console.log('🔌 Disconnecting from Kastle Wallet (from wallet.js)...');

    const result = await kastleWalletFuncs.disconnect();
    if (verbose) console.log('✅ Kastle Wallet disconnected successfully (from wallet.js)');

    return {
      success: true,
      disconnected: true,
      result
    };

  } catch (error) {
    console.error('❌ Error disconnecting from Kastle Wallet (from wallet.js):', error);
    return {
      success: false,
      error: error.message,
      disconnected: false
    };
  }
}

/**
 * Fetch UTXOs from Kastle Wallet for a specific address
 * Retrieves all available unspent transaction outputs for the address
 * @param {string} address - Kaspa address to fetch UTXOs for (optional, uses wallet address if not provided)
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} UTXO fetching result with array of UTXOs
 */
export async function fetchKastleUtxos(address = null, verbose = false) {
  try {
    if (!isFrameworkInitialized()) {
      throw new Error('Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from wallet.js)');
    }
    const kastleWalletFuncs = getKastleWalletFunctions();
     if (!kastleWalletFuncs) {
        throw new Error('Kastle Wallet functions not available. (from wallet.js)');
    }

    if (verbose) console.log('💰 Fetching UTXOs from Kastle Wallet (from wallet.js)...');

    let targetAddress = address;
    if (!targetAddress) {
      targetAddress = await kastleWalletFuncs.getWalletAddress();
      if (verbose) console.log(`📍 Using wallet address: ${targetAddress}`);
    }

    const utxos = await kastleWalletFuncs.getUtxosByAddress(targetAddress);
    
    if (verbose) {
      console.log(`✅ Found ${utxos.length} UTXOs (from wallet.js)`);
      utxos.forEach((utxo, index) => {
        let displayValue = 0;
        let displayTxId = 'unknown';
        try {
          if (utxo.constructor && (utxo.constructor.name.includes('UtxoEntryReference') || utxo.__wbg_ptr)) {
            displayValue = typeof utxo.amount === 'function' ? utxo.amount() : utxo.amount || 0;
            displayTxId = typeof utxo.transactionId === 'function' ? utxo.transactionId() : utxo.transactionId || 'unknown';
          } else {
            displayValue = utxo.amount || utxo.value || 0;
            displayTxId = utxo.transactionId || utxo.txId || utxo.id || 'unknown';
          }
        } catch (error) {
          console.warn(`⚠️ Error extracting UTXO ${index + 1} info (from wallet.js):`, error);
        }
        const shortTxId = typeof displayTxId === 'string' ? displayTxId.substring(0, 16) + '...' : 'unknown';
        console.log(`   ${index + 1}. ${displayValue} sompi (${shortTxId})`);
      });
    }

    const totalBalance = utxos.reduce((sum, utxo) => {
      let utxoValue = 0;
      try {
        if (utxo.constructor && (utxo.constructor.name.includes('UtxoEntryReference') || utxo.__wbg_ptr)) {
            try { utxoValue = typeof utxo.amount === 'function' ? utxo.amount() : utxo.amount || 0; } 
            catch (e) { 
                try { utxoValue = typeof utxo.getAmount === 'function' ? utxo.getAmount() : 0; } 
                catch (e2) { 
                    try { utxoValue = typeof utxo.value === 'function' ? utxo.value() : 0; } 
                    catch (e3) { utxoValue = 0; }
                }
            }
        } else {
          utxoValue = parseInt(utxo.amount || utxo.value || 0);
        }
        if (typeof utxoValue === 'bigint') utxoValue = Number(utxoValue);
      } catch (error) {
        console.warn(`⚠️ Error calculating balance for UTXO (from wallet.js):`, error);
      }
      return sum + utxoValue;
    }, 0);

    return {
      success: true,
      utxos,
      totalBalance,
      utxoCount: utxos.length,
      address: targetAddress
    };

  } catch (error) {
    console.error('❌ Error fetching UTXOs from Kastle Wallet (from wallet.js):', error);
    return {
      success: false,
      error: error.message,
      utxos: [],
      totalBalance: 0,
      utxoCount: 0
    };
  }
}

/**
 * Get Kastle Wallet status and information
 * Comprehensive function to check wallet state and connectivity
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Wallet status information
 */
export async function getKastleWalletStatus(verbose = false) {
  try {
    if (!isFrameworkInitialized()) {
       return {
        success: false,
        error: 'Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from wallet.js)',
        frameworkReady: false
      };
    }
    const kastleWalletFuncs = getKastleWalletFunctions();
    if (!kastleWalletFuncs) {
        return {
            success: false,
            error: 'Kastle Wallet functions not available. (from wallet.js)',
            frameworkReady: true, // Framework might be init, but funcs are not there
            walletInstalled: false,
            connected: false
        };
    }

    if (verbose) console.log('🔍 Checking Kastle Wallet status (from wallet.js)...');

    const status = {
      frameworkReady: true,
      walletInstalled: false,
      connected: false,
      walletAddress: null,
      network: null,
      balance: null,
      availableFunctions: []
    };

    try {
      status.walletInstalled = await kastleWalletFuncs.isWalletInstalled();
      status.availableFunctions = Object.keys(kastleWalletFuncs);
    } catch (error) {
      if (verbose) console.warn('⚠️ Could not check wallet installation (from wallet.js):', error.message);
    }

    if (status.walletInstalled) {
      try {
        status.walletAddress = await kastleWalletFuncs.getWalletAddress();
        status.connected = !!status.walletAddress; // If address is fetched, assume connected
      } catch (error) {
        // Not necessarily an error if wallet is installed but not connected by user yet
        if (verbose && !error.message.toLowerCase().includes('not connected')) {
            console.warn('⚠️ Could not get wallet address (wallet may not be connected by user): (from wallet.js)', error.message);
        }
        status.connected = false;
      }

      if (status.connected) {
        try {
          status.network = await kastleWalletFuncs.getNetwork();
          status.balance = await kastleWalletFuncs.getBalance();
        } catch (error) {
          if (verbose) console.warn('⚠️ Could not get network/balance info (from wallet.js):', error.message);
        }
      }
    }

    if (verbose) {
      console.log('📊 Kastle Wallet Status (from wallet.js):');
      console.log(`   Framework Ready: ${status.frameworkReady}`);
      console.log(`   Wallet Installed: ${status.walletInstalled}`);
      console.log(`   Connected: ${status.connected}`);
      console.log(`   Address: ${status.walletAddress || 'N/A'}`);
      console.log(`   Network: ${status.network || 'N/A'}`);
      console.log(`   Balance: ${status.balance || 'N/A'} sompi`);
    }

    return {
      success: true,
      ...status
    };

  } catch (error) {
    console.error('❌ Error getting Kastle Wallet status (from wallet.js):', error);
    return {
      success: false,
      error: error.message,
      frameworkReady: isFrameworkInitialized() // Check current status
    };
  }
}

/**
 * ✅ METHOD 2: Enhanced signing function using correct Kastle SDK approach
 * Uses buildTransaction() + signPskt(transaction, scriptOptions) instead of manual PSKT JSON
 * @param {Array} utxos - Array of UTXO objects from getUtxosByAddress
 * @param {Array} outputs - Array of output objects with address and amount
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @param {Object} preBuiltTransaction - Pre-built transaction object (optional, if provided, skips buildTransaction)
 * @returns {Promise<Object>} Signing result with signed transaction
 */
export async function signTransactionWithKastle(utxos, outputs, verbose = false, preBuiltTransaction = null) {
  try {
    if (!isFrameworkInitialized()) {
      throw new Error('Kaspa Framework not initialized. Call initialiseKaspaFramework() first. (from wallet.js)');
    }
    const kastleWalletFuncs = getKastleWalletFunctions();
    if (!kastleWalletFuncs || !kastleWalletFuncs.buildTransaction || !kastleWalletFuncs.signPskt || !kastleWalletFuncs.SignType) {
        throw new Error('Kastle Wallet functions (buildTransaction, signPskt, SignType) not available. (from wallet.js)');
    }

    if (verbose) console.log('✍️ Building and signing transaction with correct Kastle SDK approach (from wallet.js)...');

    if (!Array.isArray(utxos) || utxos.length === 0) throw new Error('Invalid UTXOs: must be a non-empty array');
    if (!Array.isArray(outputs) || outputs.length === 0) throw new Error('Invalid outputs: must be a non-empty array');

    const walletInstalled = await kastleWalletFuncs.isWalletInstalled();
    if (!walletInstalled) throw new Error('Kastle Wallet not installed');

    let transaction;
    if (preBuiltTransaction) {
      if (verbose) console.log('🎯 Using pre-built pattern transaction (preserving pattern TxID)... (from wallet.js)');
      transaction = preBuiltTransaction;
    } else {
      if (verbose) console.log('🔧 Using buildTransaction() to create proper transaction object... (from wallet.js)');
      transaction = kastleWalletFuncs.buildTransaction(utxos, outputs);
      if (!transaction) throw new Error('buildTransaction() returned null/undefined');
    }

    const scriptOptions = utxos.map((_, index) => ({
      inputIndex: index,
      signType: kastleWalletFuncs.SignType.NoneAnyOneCanPay,
    }));

    if (verbose) console.log(`✍️ Calling signPskt(transaction, scriptOptions) with ${scriptOptions.length} script options... (from wallet.js)`);
    const signedResult = await kastleWalletFuncs.signPskt(transaction, scriptOptions);

    if (verbose) console.log('✅ Transaction signed successfully with Method 2 approach! (from wallet.js)');

    return {
      success: true,
      signedTransaction: signedResult,
      transaction, // The transaction object that was signed (either preBuilt or newly built)
      scriptOptions,
      metadata: {
        inputCount: utxos.length,
        outputCount: outputs.length,
        method: preBuiltTransaction ? 'Pre-built pattern transaction + signPskt' : 'buildTransaction + signPskt',
        signType: 'NoneAnyOneCanPay',
        usedPreBuiltTransaction: !!preBuiltTransaction
      }
    };
  } catch (error) {
    console.error('❌ Error in Method 2 transaction signing (from wallet.js):', error);
    return {
      success: false,
      error: error.message,
      signedTransaction: null,
      method: preBuiltTransaction ? 'Pre-built pattern transaction + signPskt (failed)' : 'buildTransaction + signPskt (failed)'
    };
  }
}

/**
 * Sign transaction using Kastle Wallet (Alias for enhanced implementation)
 * @param {Object} psktData - PSKT (Partially Signed Kaspa Transaction) data - Note: This param might be misleading if utxos & outputs are expected.
 * @param {boolean} verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Signed transaction result
 */
export async function signWithKastle(psktData, verbose = false) {
  // This function delegates to the enhanced implementation.
  // It expects psktData to be an object containing { utxos, outputs, preBuiltTransaction? }
  // For direct PSKT object signing, the caller should ensure psktData is the actual transaction object.
  if (verbose) console.log('래핑된 signWithKastle 호출됨 (wallet.js). psktData가 올바른지 확인하십시오.');
  
  if (!psktData || (!psktData.utxos && !psktData.preBuiltTransaction)) {
    console.error('❌ signWithKastle: psktData must contain utxos and outputs, or a preBuiltTransaction. (from wallet.js)');
    return {
      success: false,
      error: 'Invalid psktData for signWithKastle. Expected { utxos, outputs } or { preBuiltTransaction }.',
      signedTransaction: null
    };
  }
  // The signTransactionWithKastle function handles the logic of whether to use preBuiltTransaction or build one from utxos/outputs.
  return await signTransactionWithKastle(psktData.utxos, psktData.outputs, verbose, psktData.preBuiltTransaction);
}

console.log('📦 Kaspa Wallet Actions module loaded successfully (wallet.js)'); 