// Kaspa SDK Initialization Module

import { Buffer } from 'buffer';
import {
  connect,
  disconnect,
  getWalletAddress,
  getUtxosByAddress,
  signPskt,
  sendTransactionWithExtraOutputs,
  isWalletInstalled,
  getNetwork,
  getBalance,
  buildTransaction,
  SignType,
  kaspaWasm
} from '@forbole/kastle-sdk';
import { blake3Hash } from '@webbuf/blake3';
import { WebBuf } from '@webbuf/webbuf';

// Module-scoped variables to track initialization state
let kaspaWasmModuleInternal = null;
let rpcClientInternal = null;
let isKaspaFrameworkInitializedInternal = false;
let kastleWalletFunctionsInternal = null;

/**
 * Initialize the Kaspa framework and dependencies
 * Sets up the Kaspa SDK and required cryptographic components
 * @returns {Promise<Object>} Result object with success status and initialization details
 */
export async function initialiseKaspaFramework() {
  try {
    console.log('🔧 Initializing Kaspa Framework (from sdk-init.js)...');

    // Ensure Buffer is available globally for Kaspa operations
    if (typeof window !== 'undefined') {
      window.Buffer = Buffer;
    }

    // Store Kastle wallet functions for later use
    kastleWalletFunctionsInternal = {
      connect,
      disconnect,
      getWalletAddress,
      getUtxosByAddress,
      signPskt,
      sendTransactionWithExtraOutputs,
      isWalletInstalled,
      getNetwork,
      getBalance,
      buildTransaction,
      SignType,
      kaspaWasm
    };

    // Test Blake3 availability
    const testData = new Uint8Array([1, 2, 3]);
    const testWebBuf = new WebBuf(testData);
    const testHash = blake3Hash(testWebBuf);
    const testHashBuffer = Buffer.from(testHash.buf);

    if (testHashBuffer.length === 32) {
      console.log('✅ Blake3 hash test successful, hash length:', testHashBuffer.length, 'bytes');
    } else {
      console.warn('⚠️ Blake3 hash unexpected length:', testHashBuffer.length, 'bytes (expected 32)');
    }

    // Test WASM loading path
    const wasmPath = '/static/js/secp256k1.wasm'; // This seems like a leftover or incorrect path for kaspa-wasm
    console.log('📦 Kaspa WASM files expected in /kaspa-wasm/ directory, not:', wasmPath);

    // Test wallet availability (this will help verify the import works)
    const walletInstalled = await isWalletInstalled();
    console.log('💰 Kastle Wallet availability:', walletInstalled ? 'Available' : 'Not detected');

    // Initialize WASM32 SDK for direct RPC communication
    console.log('🔧 Initializing Kaspa WASM32 SDK for direct node communication (from sdk-init.js)...');
    const wasmInitResult = await initializeKaspaWasm32Sdk({ verbose: true }); // Force verbose to debug RPC client
    if (wasmInitResult.success) {
      console.log('✅ Kaspa WASM32 SDK initialized successfully');
    } else {
      console.warn('⚠️ Kaspa WASM32 SDK initialization failed (will fallback to fetch-based RPC):', wasmInitResult.error);
    }

    isKaspaFrameworkInitializedInternal = true;
    console.log('✅ Kaspa Framework initialized successfully (from sdk-init.js)');

    return {
      success: true,
      initialized: true,
      walletAvailable: walletInstalled,
      wasmSdkAvailable: wasmInitResult.success,
      message: 'Kaspa Framework initialized successfully'
    };
  } catch (error) {
    console.error('❌ Failed to initialize Kaspa Framework (from sdk-init.js):', error);
    isKaspaFrameworkInitializedInternal = false;
    return {
      success: false,
      initialized: false,
      error: error.message,
      message: 'Failed to initialize Kaspa Framework'
    };
  }
}

/**
 * Initialize Kaspa WASM32 SDK for direct RPC communication
 * Sets up RPC client for direct node interaction bypassing Kastle reconstruction
 * @param {Object} options - Initialization options
 * @param {string} options.nodeUrl - Kaspa node URL (default: local testnet)
 * @param {string} options.network - Network type (default: testnet-10)
 * @param {boolean} options.verbose - Enable detailed logging (default: false)
 * @returns {Promise<Object>} Initialization result with RPC client
 */
export async function initializeKaspaWasm32Sdk(options = {}) {
  try {
    const {
      nodeUrl = 'ws://10.0.0.245:17210', // Use user's testnet-10 node Borsh encoding port
      network = 'testnet-10',
      verbose = false,
      alternativeUrls = [
        'ws://localhost:17210',           // Local node alternative
        'wss://api-tn10.kaspa.org:443',   // Public testnet node
        'ws://127.0.0.1:17210'            // Another local variant
      ]
    } = options;

    if (verbose) console.log('🔧 Initializing Kaspa WASM32 SDK for direct RPC (from sdk-init.js)...');

    // Load kaspa WASM module (full module, not just RPC)
    if (!kaspaWasmModuleInternal) {
      if (verbose) console.log('📦 Loading Kaspa WASM32 SDK full module (from sdk-init.js)...');

      try {
        if (verbose) console.log('🎯 Using IMPROVED APPROACH: Dynamic script loading + improved initialization (from sdk-init.js)...');

        // 🎉 SAFE APPROACH: Load script dynamically but with better initialization
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = `
          import * as kaspaModule from '/kaspa-wasm/kaspa.js';
          
          // Store module using proven working pattern from node test
          window.kaspaWasmModule = kaspaModule;
          
          // Use the working default() initialization pattern instead of __wbg_init
          window.kaspaInitWasm = kaspaModule.default;
          
          // Store individual exports for backward compatibility
          window.RpcClient = kaspaModule.RpcClient;
          window.Encoding = kaspaModule.Encoding;
          window.initWASM32Bindings = kaspaModule.initWASM32Bindings;
          window.Transaction = kaspaModule.Transaction;
          window.Address = kaspaModule.Address;
          
          console.log('🔧 kaspa-wasm32-sdk module loaded with improved pattern (from sdk-init.js)');
          console.log('🔍 Available exports:', Object.keys(kaspaModule));
        `;

        document.head.appendChild(script);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for module to load

        // Use the proven working initialization pattern
        if (typeof window.kaspaInitWasm === 'function') {
          if (verbose) console.log('🔧 Found kaspaInitWasm (default()), initializing WASM with working pattern (from sdk-init.js)...');
          await window.kaspaInitWasm('/kaspa-wasm/kaspa_bg.wasm');
          
          kaspaWasmModuleInternal = {
            RpcClient: window.RpcClient,
            Encoding: window.Encoding,
            initWASM32Bindings: window.initWASM32Bindings,
            Transaction: window.Transaction,
            Address: window.Address,
            ...window.kaspaWasmModule
          };
          
          // Store in window.kaspaSDK for compatibility with working pattern
          window.kaspaSDK = kaspaWasmModuleInternal;
          
          if (verbose) {
            console.log('✅ WASM initialization completed successfully (from sdk-init.js)');
            console.log('🔍 Available classes:', Object.keys(kaspaWasmModuleInternal).filter(k => typeof kaspaWasmModuleInternal[k] === 'function'));
            
            // Detailed debugging of RPC-related exports
            console.log('🔍 All WASM module exports:', Object.keys(kaspaWasmModuleInternal));
            console.log('🔍 RpcClient type:', typeof kaspaWasmModuleInternal.RpcClient);
            console.log('🔍 Encoding type:', typeof kaspaWasmModuleInternal.Encoding);
            
            if (kaspaWasmModuleInternal.RpcClient) {
              console.log('🔍 RpcClient constructor:', kaspaWasmModuleInternal.RpcClient.toString().substring(0, 200));
            }
            if (kaspaWasmModuleInternal.Encoding) {
              console.log('🔍 Encoding options:', kaspaWasmModuleInternal.Encoding);
            }
          }
        } else {
          throw new Error('kaspaInitWasm (default) function not found after module loading (from sdk-init.js)');
        }

        if (verbose) console.log('✅ Kaspa WASM32 SDK module loaded successfully (from sdk-init.js)');
        if (kaspaWasmModuleInternal.RpcClient) {
          if (verbose) console.log('✅ RpcClient available in WASM module (from sdk-init.js)');
        } else {
          console.warn('⚠️ RpcClient not found in WASM module (from sdk-init.js)');
        }
        if (kaspaWasmModuleInternal.Encoding) {
          if (verbose) console.log('✅ Encoding types available:', Object.keys(kaspaWasmModuleInternal.Encoding));
        } else {
          console.warn('⚠️ Encoding not found in WASM module (from sdk-init.js)');
        }

      } catch (importError) {
        console.error('❌ Failed to import Kaspa WASM module (from sdk-init.js):', importError);
        throw new Error(`WASM module import failed: ${importError.message}`);
      }
    }

    if (!rpcClientInternal) {
      if (verbose) console.log('🔗 Creating RPC client with Kaspa WASM32 SDK (from sdk-init.js)...');
      try {
        let wsUrl = nodeUrl;
        if (nodeUrl.startsWith('http://')) {
          wsUrl = nodeUrl.replace('http://', 'ws://');
        } else if (nodeUrl.startsWith('https://')) {
          wsUrl = nodeUrl.replace('https://', 'wss://');
        } else if (!nodeUrl.startsWith('ws://') && !nodeUrl.startsWith('wss://')) {
          wsUrl = `ws://${nodeUrl}`;
        }
        if (verbose) console.log(`🔗 Connecting to: ${wsUrl} (from sdk-init.js)`);

                // 🎯 USE PROVEN WORKING PATTERN: Constructor with configuration object (same as node connection test)
        if (verbose) {
          console.log('🎯 Using PROVEN working RPC client pattern from node connection test success (from sdk-init.js)');
          console.log('📋 Configuration: URL =', wsUrl, ', Encoding = Borsh');
        }
        
        // PROVEN working pattern: new RpcClient({url: wsUrl, encoding: Encoding.Borsh})
        rpcClientInternal = new kaspaWasmModuleInternal.RpcClient({
          url: wsUrl,
          encoding: kaspaWasmModuleInternal.Encoding.Borsh
        });
        
        if (verbose) console.log('✅ RPC client created with PROVEN working pattern (from sdk-init.js)');
        
        // Initialize WASM bindings to ensure methods are properly bound
        if (kaspaWasmModuleInternal.initWASM32Bindings && typeof kaspaWasmModuleInternal.initWASM32Bindings === 'function') {
          if (verbose) console.log('🔧 Initializing WASM32 bindings for RPC client methods (from sdk-init.js)...');
          try {
            await kaspaWasmModuleInternal.initWASM32Bindings();
            if (verbose) console.log('✅ WASM32 bindings initialized successfully (from sdk-init.js)');
          } catch (bindingError) {
            console.warn('⚠️ WASM32 bindings initialization failed (from sdk-init.js):', bindingError);
          }
        }
        
        // Verify RPC client methods are now available
        if (verbose) {
          console.log('🔍 RPC client available methods after binding (from sdk-init.js):', Object.getOwnPropertyNames(rpcClientInternal));
          console.log('🔍 RPC client prototype methods (from sdk-init.js):', Object.getOwnPropertyNames(Object.getPrototypeOf(rpcClientInternal)));
        }
        
        if (typeof rpcClientInternal.connect === 'function') {
          if (verbose) console.log('✅ RPC client has connect method (from sdk-init.js)');
        } else {
          console.warn('⚠️ RPC client still missing connect method after binding (from sdk-init.js)');
          if (verbose) {
            console.log('🔍 Checking for alternative method names...');
            const methods = Object.getOwnPropertyNames(rpcClientInternal).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(rpcClientInternal)));
            const connectMethods = methods.filter(m => m.toLowerCase().includes('connect'));
            console.log('🔍 Found connect-related methods:', connectMethods);
          }
        }
      } catch (clientError) {
        console.error('❌ Failed to create RPC client (from sdk-init.js):', clientError);
        throw new Error(`RPC client creation failed: ${clientError.message}`);
      }
    }

    if (verbose) {
      console.log('✅ Kaspa WASM32 SDK initialized successfully (from sdk-init.js)');
      console.log(`🔗 Node URL: ${nodeUrl}`);
      console.log(`🌐 Network: ${network}`);
      console.log(`📊 Available methods: connect, disconnect, submitTransaction, getInfo`);
    }

    return {
      success: true,
      rpcClient: rpcClientInternal, // Return the module-scoped client
      kaspaWasmModule: kaspaWasmModuleInternal, // Return the module-scoped module
      nodeUrl,
      network,
      message: 'Kaspa WASM32 SDK initialized successfully'
    };

  } catch (error) {
    console.error('❌ Failed to initialize Kaspa WASM32 SDK (from sdk-init.js):', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    return {
      success: false,
      error: error.message,
      message: 'Failed to initialize Kaspa WASM32 SDK',
      troubleshooting: {
        checkFiles: 'Verify /kaspa-wasm/kaspa.js and /kaspa-wasm/kaspa_bg.wasm exist',
        checkNode: 'Ensure local kaspad is running with WebSocket RPC enabled',
        checkCors: 'Verify CORS is configured for browser access'
      }
    };
  }
}

// Utility function to get framework initialization status
export function isFrameworkInitialized() {
  return isKaspaFrameworkInitializedInternal;
}

// Utility function to get available Kastle wallet functions
export function getKastleWalletFunctions() {
  return kastleWalletFunctionsInternal;
}

// Utility function to get the loaded Kaspa WASM module
export function getKaspaWasmModule() {
    return kaspaWasmModuleInternal;
}

// Utility function to get the RPC client
export function getRpcClient() {
    return rpcClientInternal;
}

// Export configuration for debugging
export const config = {
  version: '1.0.0',
  name: 'Kaspa Transaction ID Pattern Generator (SDK Init Module)',
  dependencies: {
    '@forbole/kastle-sdk': true,
    '@webbuf/blake3': true,
    '@webbuf/webbuf': true,
    'buffer': true
  }
};

console.log('📦 Kaspa SDK Init module loaded successfully (sdk-init.js)'); 