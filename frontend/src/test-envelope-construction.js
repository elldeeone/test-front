// Test Envelope Construction
// Comprehensive tests for Kaspa transaction envelope building

import { Buffer } from 'buffer';
import { blake3Hash } from '@webbuf/blake3';
import { WebBuf } from '@webbuf/webbuf';

/**
 * Test suite for envelope construction functionality
 * Tests the exact structure: Version || ContractTypeID || PayloadRootHash || PayloadData
 */
export function testEnvelopeConstruction() {
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    testDetails: [] // ✅ Fixed: Changed 'details' to 'testDetails' for React UI compatibility
  };

  function runTest(testName, testFn) {
    results.totalTests++;
    try {
      const result = testFn();
      if (result.success) {
        results.passed++;
        results.testDetails.push({ test: testName, status: 'PASS', details: result.message }); // ✅ Fixed: {test, status, details} format
        console.log(`✅ ${testName}: ${result.message}`);
      } else {
        results.failed++;
        results.testDetails.push({ test: testName, status: 'FAIL', details: result.message }); // ✅ Fixed: {test, status, details} format
        console.log(`❌ ${testName}: ${result.message}`);
      }
    } catch (error) {
      results.failed++;
      results.testDetails.push({ test: testName, status: 'ERROR', details: error.message }); // ✅ Fixed: {test, status, details} format
      console.log(`💥 ${testName}: ${error.message}`);
    }
  }

  console.log('🧪 Starting Envelope Construction Tests...');

  // Test 1: Basic envelope structure validation
  runTest('Basic Envelope Structure', () => {
    const version = Buffer.from([0x01]);
    const contractTypeId = Buffer.from([0x01]);
    const payloadData = Buffer.from('test payload', 'utf8');
    
    // Calculate PayloadRootHash
    const payloadWebBuf = new WebBuf(payloadData);
    const payloadRootHash = blake3Hash(payloadWebBuf);
    
    // Construct envelope
    const envelope = Buffer.concat([
      version,
      contractTypeId,
      Buffer.from(payloadRootHash.buf),
      payloadData
    ]);
    
    // Validate structure
    const expectedLength = 1 + 1 + 32 + payloadData.length; // version + contractType + hash + payload
    
    if (envelope.length !== expectedLength) {
      return { success: false, message: `Expected length ${expectedLength}, got ${envelope.length}` };
    }
    
    if (envelope[0] !== 0x01) {
      return { success: false, message: 'Version byte incorrect' };
    }
    
    if (envelope[1] !== 0x01) {
      return { success: false, message: 'ContractTypeID byte incorrect' };
    }
    
    return { success: true, message: `Envelope structure valid, length: ${envelope.length} bytes` };
  });

  // Test 2: PayloadRootHash calculation verification
  runTest('PayloadRootHash Calculation', () => {
    const testPayload = Buffer.from('test data for hash calculation', 'utf8');
    const payloadWebBuf = new WebBuf(testPayload);
    const hash1 = blake3Hash(payloadWebBuf);
    const hash2 = blake3Hash(payloadWebBuf);
    
    // Hashes should be consistent
    if (Buffer.from(hash1.buf).toString('hex') !== Buffer.from(hash2.buf).toString('hex')) {
      return { success: false, message: 'Hash calculation not deterministic' };
    }
    
    // Hash should be 32 bytes (Blake3 output size)
    if (hash1.buf.byteLength !== 32) {
      return { success: false, message: `Expected 32-byte hash, got ${hash1.buf.byteLength}` };
    }
    
    return { success: true, message: `PayloadRootHash calculation valid, 32 bytes: ${Buffer.from(hash1.buf).toString('hex').slice(0, 16)}...` };
  });

  // Test 3: Different ContractTypeID support
  runTest('Different ContractTypeID Support', () => {
    const testCases = [
      { input: '0x01', expected: [0x01] },
      { input: '0x02', expected: [0x02] },
      { input: '0xFF', expected: [0xFF] },
      { input: '0x1234', expected: [0x12, 0x34] }
    ];
    
    for (const testCase of testCases) {
      const contractTypeBuffer = Buffer.from(testCase.input.replace('0x', ''), 'hex');
      const expectedBuffer = Buffer.from(testCase.expected);
      
      if (!contractTypeBuffer.equals(expectedBuffer)) {
        return { success: false, message: `ContractTypeID ${testCase.input} parsing failed` };
      }
    }
    
    return { success: true, message: `All ContractTypeID formats supported: ${testCases.length} tested` };
  });

  // Test 4: Variable payload size handling
  runTest('Variable Payload Size Handling', () => {
    const payloadSizes = [0, 1, 10, 100, 1000, 10000];
    
    for (const size of payloadSizes) {
      const payload = Buffer.alloc(size, 'A');
      const payloadWebBuf = new WebBuf(payload);
      const hash = blake3Hash(payloadWebBuf);
      
      const envelope = Buffer.concat([
        Buffer.from([0x01]), // version
        Buffer.from([0x01]), // contractType
        Buffer.from(hash.buf), // payloadRootHash
        payload // payloadData
      ]);
      
      const expectedLength = 1 + 1 + 32 + size;
      if (envelope.length !== expectedLength) {
        return { success: false, message: `Payload size ${size}: length mismatch` };
      }
    }
    
    return { success: true, message: `Variable payload sizes supported: ${payloadSizes.join(', ')} bytes` };
  });

  // Test 5: Envelope byte order verification
  runTest('Envelope Byte Order Verification', () => {
    const version = 0x01;
    const contractType = 0x02;
    const payload = Buffer.from('order test', 'utf8');
    
    const payloadWebBuf = new WebBuf(payload);
    const hash = blake3Hash(payloadWebBuf);
    
    const envelope = Buffer.concat([
      Buffer.from([version]),
      Buffer.from([contractType]),
      Buffer.from(hash.buf),
      payload
    ]);
    
    // Verify byte positions
    if (envelope[0] !== version) {
      return { success: false, message: 'Version not at position 0' };
    }
    
    if (envelope[1] !== contractType) {
      return { success: false, message: 'ContractType not at position 1' };
    }
    
    // Hash should start at position 2
    const hashFromEnvelope = envelope.slice(2, 34);
    const expectedHash = Buffer.from(hash.buf);
    
    if (!hashFromEnvelope.equals(expectedHash)) {
      return { success: false, message: 'PayloadRootHash not at correct position' };
    }
    
    // Payload should start at position 34
    const payloadFromEnvelope = envelope.slice(34);
    
    if (!payloadFromEnvelope.equals(payload)) {
      return { success: false, message: 'PayloadData not at correct position' };
    }
    
    return { success: true, message: 'Byte order verified: Version||ContractType||Hash||Payload' };
  });

  // Test 6: TxID generation from envelope
  runTest('TxID Generation from Envelope', () => {
    const envelope = Buffer.concat([
      Buffer.from([0x01]), // version
      Buffer.from([0x01]), // contractType
      Buffer.from('a'.repeat(64), 'hex'), // 32-byte hash
      Buffer.from('test payload', 'utf8')
    ]);
    
    // Generate TxID by hashing the envelope
    const envelopeWebBuf = new WebBuf(envelope);
    const txIdHash = blake3Hash(envelopeWebBuf);
    const txId = Buffer.from(txIdHash.buf).toString('hex');
    
    // TxID should be 64 hex characters (32 bytes)
    if (txId.length !== 64) {
      return { success: false, message: `Expected 64-char TxID, got ${txId.length}` };
    }
    
    if (!/^[0-9a-f]+$/.test(txId)) {
      return { success: false, message: 'TxID contains non-hex characters' };
    }
    
    return { success: true, message: `TxID generation successful: ${txId.slice(0, 16)}...` };
  });

  console.log(`\n📊 Envelope Construction Test Summary:`);
  console.log(`   Total Tests: ${results.totalTests}`);
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

  return results;
}

// Export for use in other components
export default testEnvelopeConstruction; 