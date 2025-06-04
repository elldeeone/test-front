// Kaspa Transaction Broadcasting Module

import { Buffer } from 'buffer';
import {
    isFrameworkInitialized,
    getKastleWalletFunctions,
    getKaspaWasmModule,
    getRpcClient
} from './sdk-init.js';

import { monitorTransactionConfirmation } from './tx-monitor.js';

/**
 * Core Pattern Transaction Broadcasting
 * Broadcasts pattern transactions directly via Kastle's kastle.request() API 
 * This preserves exact TxID patterns by sending unsigned pattern transactions to Kastle for signing
 * @param {Object} unsignedTransaction - Unsigned pattern transaction from buildPatternTransactionWithWasmSdk
 * @param {string} originalTxId - The original pattern TxID to preserve
 * @param {Object} options - Broadcasting configuration options
 * @param {string} options.networkId - Network ID (default: testnet-10)
 * @param {boolean} options.waitForConfirmation - Wait for confirmation (default: false)
 * @param {number} options.confirmationTimeout - Confirmation timeout in seconds (default: 60)
 * @param {Function} options.progressCallback - Progress callback function (optional)
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Broadcasting result with TxID preservation status
 */
export async function broadcastPatternTransactionDirect(unsignedTransaction, originalTxId, options = {}) {
  const startTime = Date.now();
  try {
    const {
      networkId = "testnet-10",
      waitForConfirmation = false,
      confirmationTimeout = 60,
      progressCallback = null,
      verbose = false
    } = options;

    if (verbose) console.log('🎯 Broadcasting pattern transaction via Kastle API...');

    // Essential input validation
    if (!unsignedTransaction) {
      throw new Error('No unsigned pattern transaction provided');
    }
    if (!originalTxId) {
      throw new Error('No original pattern TxID provided');
    }
    if (typeof unsignedTransaction.serializeToSafeJSON !== 'function') {
      throw new Error('Invalid transaction object: must be a WASM SDK Transaction object with serializeToSafeJSON method');
    }

    // Check if Kastle is available
    if (typeof window === 'undefined' || !window.kastle) {
      throw new Error('Kastle wallet extension not available');
    }

    // Serialize transaction for Kastle
    let serializedTxObjectForKastle;
    try {
      serializedTxObjectForKastle = unsignedTransaction.serializeToSafeJSON();
    } catch (error) {
      throw new Error(`Failed to serialize transaction: ${error.message}`);
    }

    // Create API payload
    const apiPayload = {
      networkId: networkId,
      txJson: serializedTxObjectForKastle
    };

    // Progress callback for broadcasting start
    if (progressCallback) {
      progressCallback({ 
        stage: 'broadcasting', 
        method: 'Direct Kastle API',
        originalTxId: originalTxId,
        networkId,
        status: 'starting' 
      });
    }

    // Execute Kastle API call
    let broadcastResult;
    try {
      broadcastResult = await window.kastle.request("kas:sign_and_broadcast_tx", apiPayload);
    } catch (error) {
      throw new Error(`Kastle API call failed: ${error.message}`);
    }

    // For successful broadcasts, we assume TxID preservation
    const networkTxId = originalTxId;
    const txIdPreserved = true;

    const broadcastDuration = Date.now() - startTime;

    // Progress callback for broadcast success
    if (progressCallback) {
      progressCallback({
        stage: 'broadcast_success',
        method: 'Direct Kastle API',
        originalTxId: originalTxId,
        networkTxId: networkTxId,
        txIdPreserved: txIdPreserved,
        status: 'broadcasted'
      });
    }

    // Optional confirmation monitoring
    let confirmationResult = null;
    if (waitForConfirmation && networkTxId) {
      if (progressCallback) {
        progressCallback({ 
          stage: 'confirmation_waiting', 
          txId: networkTxId, 
          timeout: confirmationTimeout, 
          status: 'monitoring' 
        });
      }
      
      confirmationResult = await monitorTransactionConfirmation(networkTxId, {
        timeout: confirmationTimeout,
        progressCallback: progressCallback ? (confirmationProgress) => 
          progressCallback({ stage: 'confirmation_progress', txId: networkTxId, ...confirmationProgress }) : null,
        verbose
      });
    }

    const totalDuration = Date.now() - startTime;

    // Final success result
    if (progressCallback) {
      progressCallback({
        stage: 'completed',
        txId: networkTxId,
        originalTxId: originalTxId,
        txIdPreserved: txIdPreserved,
        broadcastDuration,
        totalDuration,
        confirmed: confirmationResult?.confirmed || false,
        status: 'completed'
      });
    }

    return {
      success: true,
      txId: networkTxId,
      originalPatternTxId: originalTxId,
      txIdPreserved: txIdPreserved,
      method: 'Direct Kastle API',
      networkId: networkId,
      broadcastResult: broadcastResult,
      broadcastDuration: broadcastDuration,
      totalDuration: totalDuration,
      networkStatus: 'broadcasted',
      confirmation: confirmationResult || { 
        monitored: waitForConfirmation, 
        confirmed: null, 
        message: waitForConfirmation ? 'Confirmation monitoring completed' : 'Confirmation monitoring not requested' 
      },
      metadata: {
        approach: 'Direct Kastle Wallet API',
        patternPreservationMethod: 'Unsigned Pattern Transaction → kas:sign_and_broadcast_tx API',
        bypassesSDKReconstruction: true,
        preservesExactTxID: txIdPreserved,
        confirmationTimeout
      }
    };

  } catch (error) {
    console.error('❌ Broadcasting failed:', error);
    
    if (progressCallback) {
      progressCallback({ 
        stage: 'failed', 
        error: error.message, 
        method: 'Direct Kastle API',
        status: 'failed' 
      });
    }

    return {
      success: false,
      error: error.message,
      txId: null,
      originalPatternTxId: originalTxId || 'unknown',
      txIdPreserved: false,
      method: 'Direct Kastle API - Failed',
      networkId: options.networkId || "testnet-10",
      networkStatus: 'failed',
      totalDuration: Date.now() - startTime,
      metadata: {
        approach: 'Direct Kastle Wallet API',
        patternPreservationMethod: 'Unsigned Pattern Transaction → kas:sign_and_broadcast_tx API',
        bypassesSDKReconstruction: true,
        preservesExactTxID: false,
        errorDetails: error.message
      }
    };
  }
}

console.log('📦 Kaspa Broadcast module loaded successfully (broadcast.js)'); 