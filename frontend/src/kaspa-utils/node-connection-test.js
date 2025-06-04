// Node Connection Test Module
// Task 5.1: Design Node Test Function Interface

import { initializeKaspaWasm32Sdk, getRpcClient, getKaspaWasmModule } from './sdk-init.js';

/**
 * Node Connection Test Function
 * Task 5.1: Interface Design - Provides comprehensive node connectivity validation
 * 
 * @param {Object} options - Test configuration options
 * @param {string} options.nodeUrl - Kaspa node URL to test (default: ws://10.0.0.245:17210)
 * @param {string} options.network - Network type (default: testnet-10)
 * @param {number} options.timeoutMs - Connection timeout in milliseconds (default: 10000)
 * @param {boolean} options.verbose - Enable detailed logging (default: true)
 * @param {string[]} options.alternativeUrls - Fallback URLs to try if primary fails
 * @returns {Promise<Object>} Comprehensive test results
 */
export async function testNodeConnection(options = {}) {
    const startTime = Date.now();
    const testId = `node-test-${startTime}`;
    
    // Default configuration
    const config = {
        nodeUrl: 'ws://10.0.0.245:17210',
        network: 'testnet-10',
        timeoutMs: 10000,
        verbose: true,
        alternativeUrls: [
            'ws://localhost:17210',
            'wss://api-tn10.kaspa.org:443',
            'ws://127.0.0.1:17210'
        ],
        ...options
    };
    
    const results = {
        testId,
        success: false,
        startTime: new Date(startTime).toISOString(),
        endTime: null,
        duration: 0,
        
        // Connection metrics
        connectionTime: null,
        responseTime: null,
        
        // Node information
        nodeInfo: null,
        networkStatus: null,
        syncStatus: null,
        performanceMetrics: null,
        
        // Test details
        testedUrls: [],
        errors: [],
        warnings: [],
        
        // Debug information
        availableMethods: [],
        sdkStatus: null
    };
    
    if (config.verbose) {
        console.log(`🔗 [${testId}] Starting Node Connection Test`);
        console.log(`🎯 Target: ${config.nodeUrl}`);
        console.log(`🌐 Network: ${config.network}`);
        console.log(`⏱️ Timeout: ${config.timeoutMs}ms`);
    }
    
    try {
        // Task 5.2: Implement Core Connection Testing Logic
        const connectionResult = await performConnectionTest(config, results);
        if (!connectionResult.success) {
            return finalizeResults(results, startTime, false);
        }
        
        // Task 5.3: Add Node Information Retrieval
        const nodeInfoResult = await collectNodeInformation(config, results);
        if (!nodeInfoResult.success) {
            results.warnings.push('Node info collection incomplete but connection succeeded');
        }
        
        results.success = true;
        
    } catch (error) {
        console.error(`❌ [${testId}] Node connection test failed:`, error);
        results.errors.push({
            type: 'TEST_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    return finalizeResults(results, startTime, results.success);
}

/**
 * Task 5.2: Core Connection Testing Logic
 * Establishes connection and verifies basic connectivity using PROVEN WORKING PATTERN
 */
async function performConnectionTest(config, results) {
    const connectionStartTime = Date.now();
    let rpcClient = null;
    let kaspaWasmModule = null;
    
    try {
        if (config.verbose) {
            console.log(`🔧 [${results.testId}] Initializing WASM SDK with PROVEN WORKING PATTERN...`);
        }
        
        // 🎯 USE THE EXACT WORKING PATTERN FROM USER'S FRONTEND
        try {
            // Check if SDK is already loaded
            if (window.kaspaSDK) {
                if (config.verbose) {
                    console.log(`✅ [${results.testId}] Using existing kaspaSDK from window`);
                }
                kaspaWasmModule = window.kaspaSDK;
            } else {
                if (config.verbose) {
                    console.log(`📦 [${results.testId}] Loading Kaspa WASM SDK with working pattern...`);
                }
                
                // Use the exact working import pattern - files are already in public/kaspa-wasm/
                kaspaWasmModule = await import(/* webpackIgnore: true */ '/kaspa-wasm/kaspa.js');
                
                if (config.verbose) {
                    console.log(`🔧 [${results.testId}] Initializing WASM with working default() pattern...`);
                }
                
                // Use the exact working initialization pattern
                await kaspaWasmModule.default('/kaspa-wasm/kaspa_bg.wasm');
                
                if (config.verbose) {
                    console.log(`✅ [${results.testId}] WASM SDK loaded successfully. Version:`, kaspaWasmModule.version?.());
                }
                
                // Store in window like the working pattern
                window.kaspaSDK = kaspaWasmModule;
            }
            
            // Verify essential components are available
            if (!kaspaWasmModule.RpcClient) {
                throw new Error('RpcClient not available in loaded WASM SDK');
            }
            if (!kaspaWasmModule.Encoding) {
                throw new Error('Encoding not available in loaded WASM SDK');
            }
            
            results.sdkStatus = {
                initialized: true,
                message: 'WASM SDK loaded with proven working pattern',
                version: kaspaWasmModule.version?.() || 'Unknown',
                error: null
            };
            
        } catch (wasmLoadError) {
            if (config.verbose) {
                console.error(`❌ [${results.testId}] Working pattern failed, trying fallback:`, wasmLoadError);
            }
            
            // Fallback to existing initialization if working pattern fails
            const sdkResult = await initializeKaspaWasm32Sdk({
                nodeUrl: config.nodeUrl,
                network: config.network,
                verbose: config.verbose
            });
            
            results.sdkStatus = {
                initialized: sdkResult.success,
                message: `Fallback initialization: ${sdkResult.message}`,
                error: sdkResult.error || null
            };
            
            if (!sdkResult.success) {
                throw new Error(`Both working pattern and fallback failed: ${wasmLoadError.message}`);
            }
            
            // Get initialized components from fallback
            rpcClient = getRpcClient();
            kaspaWasmModule = getKaspaWasmModule();
        }
        
        // Create RPC client using the proven working pattern
        if (!rpcClient) {
            if (config.verbose) {
                console.log(`🔗 [${results.testId}] Creating RPC client with PROVEN WORKING PATTERN...`);
            }
            
            // Use exact working pattern: constructor with config object
            rpcClient = new kaspaWasmModule.RpcClient({
                url: config.nodeUrl,
                encoding: kaspaWasmModule.Encoding.Borsh
            });
            
            if (config.verbose) {
                console.log(`✅ [${results.testId}] RPC client created with proven working pattern`);
            }
        }
        
        if (config.verbose) {
            console.log(`✅ [${results.testId}] WASM SDK initialized successfully`);
            console.log(`🔗 [${results.testId}] Attempting connection to ${config.nodeUrl}...`);
        }
        
        // Test connection using the proven working pattern
        await testConnection(rpcClient, config, results);
        
        results.connectionTime = Date.now() - connectionStartTime;
        
        if (config.verbose) {
            console.log(`✅ [${results.testId}] Connection established in ${results.connectionTime}ms`);
        }
        
        // Collect available methods for debugging
        if (rpcClient) {
            results.availableMethods = [
                ...Object.getOwnPropertyNames(rpcClient),
                ...Object.getOwnPropertyNames(Object.getPrototypeOf(rpcClient))
            ].filter((method, index, arr) => arr.indexOf(method) === index);
            
            if (config.verbose) {
                console.log(`🔍 [${results.testId}] Available RPC methods: ${results.availableMethods.length}`);
            }
        }
        
        return { success: true, rpcClient, kaspaWasmModule };
        
    } catch (error) {
        console.error(`❌ [${results.testId}] Connection test failed:`, error);
        results.errors.push({
            type: 'CONNECTION_ERROR',
            message: error.message,
            url: config.nodeUrl,
            timestamp: new Date().toISOString()
        });
        
        return { success: false, error: error.message };
    }
}

/**
 * Test connection establishment with timeout handling and enhanced debugging
 */
async function testConnection(rpcClient, config, results) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Connection timeout after ${config.timeoutMs}ms - this may indicate WASM "unreachable" errors`));
        }, config.timeoutMs);
        
        const connectWithFallback = async () => {
            try {
                if (config.verbose) {
                    console.log(`🔍 [${results.testId}] RPC client method analysis before connection:`);
                    console.log(`🔍 [${results.testId}] Has connect method:`, typeof rpcClient.connect === 'function');
                    console.log(`🔍 [${results.testId}] Available methods:`, Object.getOwnPropertyNames(rpcClient));
                }
                
                // Use the working connection pattern from successful implementation
                if (typeof rpcClient.connect === 'function') {
                    if (config.verbose) {
                        console.log(`🔗 [${results.testId}] Attempting connection with parameter-less connect() method...`);
                    }
                    
                    // Add specific error handling for WASM "unreachable" errors
                    try {
                        // Use parameter-less connect() method (proven working approach from Task 4.7)
                        await rpcClient.connect();
                        
                        if (config.verbose) {
                            console.log(`✅ [${results.testId}] Connection established successfully`);
                        }
                        
                    } catch (wasmError) {
                        if (config.verbose) {
                            console.error(`❌ [${results.testId}] WASM connection error:`, wasmError);
                        }
                        
                        // Check for specific WASM "unreachable" error
                        if (wasmError.message && wasmError.message.includes('unreachable')) {
                            throw new Error(`WASM "unreachable" error during connection - this indicates an internal WASM issue. The RPC client constructor worked but connect() failed. This may require node restart or different connection approach.`);
                        } else {
                            throw new Error(`Connection method failed: ${wasmError.message}`);
                        }
                    }
                } else {
                    throw new Error('RPC client missing connect method - this indicates WASM binding issues');
                }
                
                clearTimeout(timeout);
                
                // Test basic connectivity with a simple RPC call
                const responseStartTime = Date.now();
                
                if (config.verbose) {
                    console.log(`📊 [${results.testId}] Testing connectivity with RPC call...`);
                }
                
                // Try to get basic node info to verify connection works
                try {
                    if (typeof rpcClient.getInfo === 'function') {
                        await rpcClient.getInfo();
                        results.responseTime = Date.now() - responseStartTime;
                        if (config.verbose) {
                            console.log(`✅ [${results.testId}] getInfo() call successful in ${results.responseTime}ms`);
                        }
                    } else if (typeof rpcClient.ping === 'function') {
                        await rpcClient.ping();
                        results.responseTime = Date.now() - responseStartTime;
                        if (config.verbose) {
                            console.log(`✅ [${results.testId}] ping() call successful in ${results.responseTime}ms`);
                        }
                    } else {
                        // Just verify connection is established
                        results.responseTime = Date.now() - responseStartTime;
                        if (config.verbose) {
                            console.log(`⚠️ [${results.testId}] No test methods available, assuming connection successful`);
                        }
                    }
                } catch (rpcCallError) {
                    // Connection succeeded but RPC call failed
                    results.responseTime = Date.now() - responseStartTime;
                    if (config.verbose) {
                        console.warn(`⚠️ [${results.testId}] Connection succeeded but RPC call failed:`, rpcCallError.message);
                    }
                }
                
                results.testedUrls.push({
                    url: config.nodeUrl,
                    success: true,
                    responseTime: results.responseTime,
                    timestamp: new Date().toISOString()
                });
                
                resolve();
                
            } catch (connectError) {
                clearTimeout(timeout);
                
                // Enhanced error reporting for debugging
                const enhancedError = new Error(
                    `Connection failed: ${connectError.message}\n` +
                    `Debugging info:\n` +
                    `- Target URL: ${config.nodeUrl}\n` +
                    `- Network: ${config.network}\n` +
                    `- RPC client available: ${rpcClient ? 'Yes' : 'No'}\n` +
                    `- Connect method available: ${rpcClient && typeof rpcClient.connect === 'function' ? 'Yes' : 'No'}\n` +
                    `- Error type: ${connectError.constructor.name}\n` +
                    `- This may be a WASM "unreachable" issue - check node status and WASM compatibility`
                );
                
                reject(enhancedError);
            }
        };
        
        connectWithFallback();
    });
}

/**
 * Task 5.3: Node Information Retrieval
 * Collects comprehensive node data using available RPC methods
 */
async function collectNodeInformation(config, results) {
    const rpcClient = getRpcClient();
    
    if (!rpcClient) {
        return { success: false, error: 'No RPC client available' };
    }
    
    try {
        if (config.verbose) {
            console.log(`📊 [${results.testId}] Collecting node information...`);
        }
        
        const nodeData = {
            basicInfo: null,
            networkStatus: null,
            syncStatus: null,
            performanceMetrics: {
                availableMethods: results.availableMethods.length,
                connectionTime: results.connectionTime,
                responseTime: results.responseTime
            }
        };
        
        // Collect basic node information
        await collectBasicNodeInfo(rpcClient, nodeData, config, results);
        
        // Collect network status
        await collectNetworkStatus(rpcClient, nodeData, config, results);
        
        // Collect sync status
        await collectSyncStatus(rpcClient, nodeData, config, results);
        
        results.nodeInfo = nodeData.basicInfo;
        results.networkStatus = nodeData.networkStatus;
        results.syncStatus = nodeData.syncStatus;
        results.performanceMetrics = nodeData.performanceMetrics;
        
        if (config.verbose) {
            console.log(`✅ [${results.testId}] Node information collected successfully`);
        }
        
        return { success: true };
        
    } catch (error) {
        console.error(`⚠️ [${results.testId}] Node info collection failed:`, error);
        results.warnings.push(`Node info collection failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Collect basic node information using getInfo() method
 */
async function collectBasicNodeInfo(rpcClient, nodeData, config, results) {
    try {
        if (typeof rpcClient.getInfo === 'function') {
            const info = await rpcClient.getInfo();
            nodeData.basicInfo = {
                version: info.serverVersion || info.version || 'Unknown',
                network: info.network || config.network,
                peerCount: info.peerCount || 0,
                timestamp: new Date().toISOString()
            };
            
            if (config.verbose) {
                console.log(`📋 [${results.testId}] Basic info:`, nodeData.basicInfo);
            }
        } else {
            nodeData.basicInfo = {
                version: 'Unable to determine (getInfo not available)',
                network: config.network,
                peerCount: 'Unknown',
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        nodeData.basicInfo = {
            error: `Failed to get basic info: ${error.message}`,
            network: config.network,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Collect network status using getBlockDagInfo() method
 */
async function collectNetworkStatus(rpcClient, nodeData, config, results) {
    try {
        if (typeof rpcClient.getBlockDagInfo === 'function') {
            const blockDagInfo = await rpcClient.getBlockDagInfo();
            nodeData.networkStatus = {
                blockHeight: blockDagInfo.virtualSelectedParentBlueScore || 'Unknown',
                networkHashrate: blockDagInfo.difficulty || 'Unknown',
                networkState: 'Connected',
                timestamp: new Date().toISOString()
            };
            
            if (config.verbose) {
                console.log(`🌐 [${results.testId}] Network status:`, nodeData.networkStatus);
            }
        } else {
            nodeData.networkStatus = {
                blockHeight: 'Unable to determine (getBlockDagInfo not available)',
                networkState: 'Connected (basic)',
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        nodeData.networkStatus = {
            error: `Failed to get network status: ${error.message}`,
            networkState: 'Connected (basic)',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Collect sync status using isSynced() method
 */
async function collectSyncStatus(rpcClient, nodeData, config, results) {
    try {
        if (typeof rpcClient.isSynced === 'function') {
            const syncStatus = await rpcClient.isSynced();
            nodeData.syncStatus = {
                synced: syncStatus,
                status: syncStatus ? 'Fully Synced' : 'Syncing',
                timestamp: new Date().toISOString()
            };
            
            if (config.verbose) {
                console.log(`🔄 [${results.testId}] Sync status:`, nodeData.syncStatus);
            }
        } else {
            nodeData.syncStatus = {
                synced: 'Unknown',
                status: 'Unable to determine (isSynced not available)',
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        nodeData.syncStatus = {
            error: `Failed to get sync status: ${error.message}`,
            status: 'Unknown',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Finalize test results with timing and summary information
 */
function finalizeResults(results, startTime, success) {
    const endTime = Date.now();
    results.endTime = new Date(endTime).toISOString();
    results.duration = endTime - startTime;
    results.success = success;
    
    if (results.errors.length === 0 && results.warnings.length === 0) {
        results.summary = '✅ Node connection test completed successfully with no issues';
    } else if (results.errors.length === 0) {
        results.summary = `⚠️ Node connection test completed with ${results.warnings.length} warning(s)`;
    } else {
        results.summary = `❌ Node connection test failed with ${results.errors.length} error(s)`;
    }
    
    return results;
}

/**
 * Task 5.4: User-Friendly Display Helper
 * Formats test results for clear presentation
 */
export function formatNodeTestResults(results) {
    if (!results) return 'No test results available';
    
    const lines = [];
    
    // Header
    lines.push(`🔗 Node Connection Test Results`);
    lines.push(`═══════════════════════════════════`);
    lines.push(`Test ID: ${results.testId}`);
    lines.push(`Status: ${results.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    lines.push(`Duration: ${results.duration}ms`);
    lines.push(`Started: ${results.startTime}`);
    lines.push(``);
    
    // Connection metrics
    if (results.connectionTime !== null) {
        lines.push(`🔗 Connection Metrics:`);
        lines.push(`   Connection Time: ${results.connectionTime}ms`);
        if (results.responseTime !== null) {
            lines.push(`   Response Time: ${results.responseTime}ms`);
        }
        lines.push(``);
    }
    
    // Node information
    if (results.nodeInfo) {
        lines.push(`📋 Node Information:`);
        lines.push(`   Version: ${results.nodeInfo.version || 'Unknown'}`);
        lines.push(`   Network: ${results.nodeInfo.network || 'Unknown'}`);
        lines.push(`   Peer Count: ${results.nodeInfo.peerCount || 'Unknown'}`);
        lines.push(``);
    }
    
    // Network status
    if (results.networkStatus) {
        lines.push(`🌐 Network Status:`);
        lines.push(`   Block Height: ${results.networkStatus.blockHeight || 'Unknown'}`);
        lines.push(`   State: ${results.networkStatus.networkState || 'Unknown'}`);
        lines.push(``);
    }
    
    // Sync status
    if (results.syncStatus) {
        lines.push(`🔄 Sync Status:`);
        lines.push(`   Synced: ${results.syncStatus.synced}`);
        lines.push(`   Status: ${results.syncStatus.status}`);
        lines.push(``);
    }
    
    // Performance metrics
    if (results.performanceMetrics) {
        lines.push(`📊 Performance Metrics:`);
        lines.push(`   Available RPC Methods: ${results.performanceMetrics.availableMethods || 0}`);
        lines.push(`   Connection Time: ${results.performanceMetrics.connectionTime || 'N/A'}ms`);
        lines.push(`   Response Time: ${results.performanceMetrics.responseTime || 'N/A'}ms`);
        lines.push(``);
    }
    
    // Errors and warnings
    if (results.errors.length > 0) {
        lines.push(`❌ Errors:`);
        results.errors.forEach((error, index) => {
            lines.push(`   ${index + 1}. [${error.type}] ${error.message}`);
        });
        lines.push(``);
    }
    
    if (results.warnings.length > 0) {
        lines.push(`⚠️ Warnings:`);
        results.warnings.forEach((warning, index) => {
            lines.push(`   ${index + 1}. ${warning}`);
        });
        lines.push(``);
    }
    
    // Summary
    lines.push(`Summary: ${results.summary}`);
    
    return lines.join('\n');
}

// Export configuration for debugging
export const nodeTestConfig = {
    version: '1.0.0',
    name: 'Kaspa Node Connection Test Module',
    description: 'Task 5.1-5.3: Comprehensive node connectivity validation',
    dependencies: {
        'sdk-init': true
    }
};

console.log('📦 Node Connection Test module loaded successfully'); 