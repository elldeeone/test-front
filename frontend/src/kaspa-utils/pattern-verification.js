// Kaspa Pattern Preservation Verification Module

import { broadcastPatternTransactionDirect } from './broadcast.js';
import { checkTxIdPattern } from './tx-pattern.js';

/**
 * 🎯 VERIFY PATTERN PRESERVATION - Task 4.4 Implementation
 * Tests end-to-end pattern TxID preservation through the complete flow:
 * Pattern Generation → Signing → Kastle API Broadcasting → Network Verification
 * @param {Object} signedPskt - Signed PSKT from signPskt()
 * @param {string} originalPatternTxId - Original pattern TxID from buildPatternTransactionWithSdk
 * @param {number} bitCount - Number of trailing zero bits in the pattern
 * @param {Object} options - Verification options
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @param {string} options.nodeUrl - Kaspa node URL (default: user's node)
 * @returns {Promise<Object>} Comprehensive verification result
 */
export async function verifyPatternPreservation(signedPskt, originalPatternTxId, bitCount, options = {}) {
  const startTime = Date.now();
  
  try {
    const {
      verbose = false,
      nodeUrl = 'ws://10.0.0.245:17210' // Default to user's testnet-10 node
    } = options;

    if (verbose) {
      console.log('🎯 Starting Pattern TxID Preservation Verification (from pattern-verification.js)...');
      console.log('🔍 Original Pattern TxID:', originalPatternTxId);
      console.log(`🎯 Expected Pattern: ${bitCount} trailing zero bits`);
      console.log('📡 Broadcasting via Kastle API to preserve exact TxID...');
    }

    // Step 1: Pre-broadcast validation
    let psktData = signedPskt;
    if (typeof signedPskt === 'string') {
      try {
        psktData = JSON.parse(signedPskt);
      } catch (e) {
        psktData = null; // Or handle error more explicitly
      }
    }
    
    const preValidation = {
      originalTxIdValid: !!originalPatternTxId,
      originalPatternMatch: checkTxIdPattern(originalPatternTxId, bitCount, verbose),
      signedPsktValid: !!(psktData && psktData.id),
      psktTxIdMatch: psktData?.id === originalPatternTxId
    };

    if (verbose) {
      console.log('📋 Pre-broadcast validation (from pattern-verification.js):');
      console.log('   ✅ Original TxID valid:', preValidation.originalTxIdValid);
      console.log('   ✅ Original pattern match:', preValidation.originalPatternMatch);
      console.log('   ✅ Signed PSKT valid:', preValidation.signedPsktValid);
      console.log('   ✅ PSKT TxID matches original:', preValidation.psktTxIdMatch);
    }

    if (!preValidation.psktTxIdMatch) {
      return {
        success: false,
        stage: 'pre-validation',
        error: 'Signed PSKT TxID does not match original pattern TxID',
        preValidation,
        recommendation: 'Check signing process - TxID should be preserved during signing'
      };
    }

    // Step 2: Broadcast via Kastle API
    if (verbose) console.log('🚀 Broadcasting via Kastle API (from pattern-verification.js calling broadcast.js)...');
    
    const broadcastResult = await broadcastPatternTransactionDirect(signedPskt, originalPatternTxId, {
      networkId: 'testnet-10',
      verbose // Pass verbose option to broadcast function
    });

    if (!broadcastResult.success) {
      return {
        success: false,
        stage: 'broadcasting',
        error: `Broadcasting failed: ${broadcastResult.error}`,
        preValidation,
        broadcastResult,
        recommendation: 'Check node connectivity and transaction validity'
      };
    }

    const networkTxId = broadcastResult.txId;
    
    if (verbose) {
      console.log('✅ Transaction broadcasted successfully! (from pattern-verification.js)');
      console.log('🆔 Network Transaction ID:', networkTxId);
    }

    // Step 3: Post-broadcast verification
    const postValidation = {
      networkTxIdValid: !!networkTxId,
      txIdPreserved: originalPatternTxId === networkTxId,
      networkPatternMatch: checkTxIdPattern(networkTxId, bitCount, verbose), // Use imported checkTxIdPattern
      broadcastDuration: broadcastResult.broadcastDuration
    };

    if (verbose) {
      console.log('📋 Post-broadcast verification (from pattern-verification.js):');
      console.log('   🆔 Network TxID valid:', postValidation.networkTxIdValid);
      console.log('   🎯 TxID preserved exactly:', postValidation.txIdPreserved);
      console.log('   ✅ Network TxID matches pattern:', postValidation.networkPatternMatch);
      console.log('   ⏱️ Broadcast duration:', postValidation.broadcastDuration, 'ms');
    }

    // Step 4: Pattern analysis
    const patternAnalysis = {
      originalTxId: originalPatternTxId,
      networkTxId: networkTxId,
      preservationSuccess: postValidation.txIdPreserved,
      patternSuccess: postValidation.networkPatternMatch,
      overallSuccess: postValidation.txIdPreserved && postValidation.networkPatternMatch,
      bitCount,
      patternProbability: `1 in ${Math.pow(2, bitCount).toLocaleString()}`,
      verificationDuration: Date.now() - startTime
    };

    // Step 5: Generate comprehensive result
    const verificationResult = {
      success: patternAnalysis.overallSuccess,
      stage: 'completed',
      preValidation,
      broadcastResult,
      postValidation,
      patternAnalysis,
      summary: {
        txIdPreserved: postValidation.txIdPreserved,
        patternMaintained: postValidation.networkPatternMatch,
        perfectSuccess: patternAnalysis.overallSuccess,
        nodeUrl,
        network: 'testnet-10', // Assuming testnet-10 from default nodeUrl
        method: 'Kastle API',
        totalDuration: Date.now() - startTime
      }
    };

    // Step 6: Final status logging
    if (verbose) {
      console.log('\n🏆 PATTERN PRESERVATION VERIFICATION COMPLETE! (from pattern-verification.js)');
      console.log('═══════════════════════════════════════════════');
      
      if (patternAnalysis.overallSuccess) {
        console.log('🎉 PERFECT SUCCESS! Pattern TxID preserved completely!');
        console.log(`✅ Original TxID: ${originalPatternTxId}`);
        console.log(`✅ Network TxID:  ${networkTxId}`);
        console.log(`✅ Pattern Match: ${bitCount} trailing zero bits confirmed`);
        console.log(`✅ Probability:   ${patternAnalysis.patternProbability}`);
        console.log('🏆 WORLD\'S FIRST CLIENT-SIDE KASPA PATTERN TRANSACTION SUCCESS!');
      } else {
        console.log('❌ Pattern preservation verification failed (from pattern-verification.js)');
        if (!postValidation.txIdPreserved) {
          console.log('🔍 Issue: TxID changed during broadcasting');
          console.log(`   Expected: ${originalPatternTxId}`);
          console.log(`   Got:      ${networkTxId}`);
        }
        if (!postValidation.networkPatternMatch) {
          console.log('🔍 Issue: Network TxID does not match expected pattern');
          console.log(`   TxID: ${networkTxId}`);
          console.log(`   Expected: ${bitCount} trailing zero bits`);
        }
      }
    }
    return verificationResult;
  } catch (error) {
    console.error('❌ Pattern preservation verification failed (from pattern-verification.js):', error);
    return {
      success: false,
      stage: 'error',
      error: error.message,
      summary: {
        txIdPreserved: false,
        patternMaintained: false,
        perfectSuccess: false,
        totalDuration: Date.now() - startTime
      },
      troubleshooting: {
        checkList: [
          'Verify Kastle wallet is properly connected',
          'Ensure node is accessible',
          'Check signed PSKT format and validity',
          'Verify network connectivity'
        ]
      }
    };
  }
}

console.log('📦 Kaspa Pattern Verification module loaded successfully (pattern-verification.js)'); 