// Kaspa Transaction Envelope Construction Module

import { Buffer } from 'buffer';
import { blake3Hash } from '@webbuf/blake3';
import { WebBuf } from '@webbuf/webbuf';

/**
 * Construct a Kaspa transaction envelope with exact structure: Version || ContractTypeID || PayloadRootHash || PayloadData
 * @param {Object} options - Envelope construction options
 * @param {string|number} options.version - Version byte (default: 0x01)
 * @param {string} options.contractTypeId - Contract type identifier (default: '0x01')
 * @param {string|Buffer} options.payloadData - Transaction payload data
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Object} Envelope construction result with buffer and metadata
 */
export function constructEnvelope(options = {}) {
  try {
    const {
      version = 0x01,
      contractTypeId = '0x01',
      payloadData = 'Default payload',
      verbose = false
    } = options;

    if (verbose) console.log('🔧 Constructing transaction envelope (from envelope.js)...');

    // Validate and prepare version byte
    let versionBuffer;
    if (typeof version === 'number') {
      if (version < 0 || version > 255) {
        throw new Error(`Invalid version: ${version}. Must be 0-255`);
      }
      versionBuffer = Buffer.from([version]);
    } else {
      throw new Error(`Invalid version type: ${typeof version}. Must be number`);
    }

    if (verbose) console.log(`📄 Version: 0x${versionBuffer.toString('hex')}`);

    // Validate and prepare contract type ID
    let contractTypeBuffer;
    if (typeof contractTypeId === 'string') {
      const cleanContractId = contractTypeId.startsWith('0x') ? contractTypeId.slice(2) : contractTypeId;
      if (!/^[0-9a-fA-F]+$/.test(cleanContractId)) {
        throw new Error(`Invalid contractTypeId format: ${contractTypeId}. Must be valid hex`);
      }
      if (cleanContractId.length % 2 !== 0) {
        throw new Error(`Invalid contractTypeId length: ${contractTypeId}. Must be even number of hex chars`);
      }
      contractTypeBuffer = Buffer.from(cleanContractId, 'hex');
    } else {
      throw new Error(`Invalid contractTypeId type: ${typeof contractTypeId}. Must be string`);
    }

    if (verbose) console.log(`🏷️  ContractTypeID: 0x${contractTypeBuffer.toString('hex')} (${contractTypeBuffer.length} bytes)`);

    // Validate and prepare payload data
    let payloadBuffer;
    if (typeof payloadData === 'string') {
      payloadBuffer = Buffer.from(payloadData, 'utf8');
    } else if (Buffer.isBuffer(payloadData)) {
      payloadBuffer = payloadData;
    } else {
      throw new Error(`Invalid payloadData type: ${typeof payloadData}. Must be string or Buffer`);
    }

    if (verbose) console.log(`📦 PayloadData: ${payloadBuffer.length} bytes`);

    // Calculate PayloadRootHash using Blake3
    const payloadWebBuf = new WebBuf(payloadBuffer);
    const payloadRootHash = blake3Hash(payloadWebBuf);
    const payloadRootHashBuffer = Buffer.from(payloadRootHash.buf);

    if (payloadRootHashBuffer.length !== 32) {
      throw new Error(`Invalid PayloadRootHash length: ${payloadRootHashBuffer.length}. Expected 32 bytes`);
    }

    if (verbose) console.log(`🔑 PayloadRootHash: ${payloadRootHashBuffer.toString('hex').slice(0, 16)}... (32 bytes)`);

    // Construct the complete envelope: Version || ContractTypeID || PayloadRootHash || PayloadData
    const envelope = Buffer.concat([
      versionBuffer,           // Version (1+ bytes)
      contractTypeBuffer,      // ContractTypeID (variable bytes)
      payloadRootHashBuffer,   // PayloadRootHash (32 bytes)
      payloadBuffer           // PayloadData (variable bytes)
    ]);

    const expectedLength = versionBuffer.length + contractTypeBuffer.length + 32 + payloadBuffer.length;
    
    if (envelope.length !== expectedLength) {
      throw new Error(`Envelope length mismatch. Expected: ${expectedLength}, got: ${envelope.length}`);
    }

    if (verbose) console.log(`✅ Envelope constructed: ${envelope.length} bytes total (from envelope.js)`);

    return {
      success: true,
      envelope,
      metadata: {
        totalLength: envelope.length,
        versionLength: versionBuffer.length,
        contractTypeLength: contractTypeBuffer.length,
        payloadRootHashLength: 32,
        payloadDataLength: payloadBuffer.length,
        version: versionBuffer.toString('hex'),
        contractTypeId: contractTypeBuffer.toString('hex'),
        payloadRootHash: payloadRootHashBuffer.toString('hex'),
        payloadPreview: payloadBuffer.toString('utf8').slice(0, 50) + (payloadBuffer.length > 50 ? '...' : '')
      }
    };

  } catch (error) {
    console.error('❌ Error constructing envelope (from envelope.js):', error);
    return {
      success: false,
      error: error.message,
      envelope: null,
      metadata: null
    };
  }
}

console.log('📦 Kaspa Envelope module loaded successfully (envelope.js)'); 