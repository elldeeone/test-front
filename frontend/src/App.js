import logo from './logo.svg';
import './App.css';
import React, { useState, useEffect, useCallback } from 'react';
import PatternTransactionGenerator from './PatternTransactionGenerator';
import TestSignPSKTDemo from './TestSignPSKTDemo';

// kaspa-utils main functionalities (ensure these are all exported from ./kaspa-utils/index.js)
import {
  initialiseKaspaFramework,
  getKastleWalletStatus,
  connectKastleWallet,
  disconnectKastleWallet,
  createAndBroadcastPatternTransaction,
  testLeosSimplifiedWorkflow,
  testNodeConnection, // Was imported separately from kaspa-utils/index.js
  formatNodeTestResults // Was imported separately from kaspa-utils/index.js
} from './kaspa-utils.js';

// Test-specific utility functions
import { runKaspaUtilsTest } from './test-kaspa-utils.js';
import { runPatternMatchingTests } from './test-pattern-matching.js';
import { testEnvelopeConstruction } from './test-envelope-construction.js';
import { testNonceIteration } from './test-nonce-iteration.js';
import { testProgressCallbackFix } from './test-progress-callback-fix.js';
import { testPsktGeneration, quickPsktValidationTest, testPsktGenerationFix } from './test-pskt-generation.js'; // Removed quickPsktTest as it's not used in App.js based on previous full read
import { runAllKastleIntegrationTests } from './test-kastle-integration.js';
import { testEnhancedBroadcasting } from './test-enhanced-broadcasting.js';
import { testUtxoWasmInvestigation } from './test-wasm-object-investigation.js';
import { runAllWorkflowSteps1And2Tests } from './test-workflow-steps-1-2.js';

function App() {
  // Application mode state
  const [appMode, setAppMode] = useState('production'); // 'production' or 'testing'

  // Testing state (only used in testing mode)
  const [testResults, setTestResults] = useState(null);
  const [patternTestResults, setPatternTestResults] = useState(null);
  const [envelopeTestResults, setEnvelopeTestResults] = useState(null);
  const [nonceIterationResults, setNonceIterationResults] = useState(null);
  const [progressCallbackFixResults, setProgressCallbackFixResults] = useState(null);
  const [psktTestResults, setPsktTestResults] = useState(null);
  const [kastleIntegrationResults, setKastleIntegrationResults] = useState(null);
  const [enhancedBroadcastingResults, setEnhancedBroadcastingResults] = useState(null);
  const [wasmInvestigationResults, setWasmInvestigationResults] = useState(null);
  const [psktFixResults, setPsktFixResults] = useState(null);
  const [nodeConnectionTestResults, setNodeConnectionTestResults] = useState(null);
  const [workflowSteps1And2Results, setWorkflowSteps1And2Results] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingPattern, setIsTestingPattern] = useState(false);
  const [isTestingEnvelope, setIsTestingEnvelope] = useState(false);
  const [isTestingNonceIteration, setIsTestingNonceIteration] = useState(false);
  const [isTestingProgressCallbackFix, setIsTestingProgressCallbackFix] = useState(false);
  const [isTestingPskt, setIsTestingPskt] = useState(false);
  const [isTestingKastleIntegration, setIsTestingKastleIntegration] = useState(false);
  const [isTestingEnhancedBroadcasting, setIsTestingEnhancedBroadcasting] = useState(false);
  const [isTestingWasmInvestigation, setIsTestingWasmInvestigation] = useState(false);
  const [isTestingPsktFix, setIsTestingPsktFix] = useState(false);
  const [isTestingNodeConnection, setIsTestingNodeConnection] = useState(false);
  const [isTestingWorkflowSteps1And2, setIsTestingWorkflowSteps1And2] = useState(false);

  // --- START: State and functions for relocated Dev Mode features (formerly DevModeContainer) ---
  const [dev_frameworkReady, setDev_frameworkReady] = useState(false);
  const [dev_walletStatus, setDev_walletStatus] = useState({ installed: false, connected: false, address: null, network: null, balance: null });
  const [dev_logs, setDev_logs] = useState([]);
  const [dev_patternBits, setDev_patternBits] = useState(8);
  const [dev_toAddress, setDev_toAddress] = useState('kaspatest:qqkqkzjvqy5ud3lktkfdkf4fxhyqfcpq52k9xcmqsdf0rvx599jtr05anl0vz');
  const [dev_amount, setDev_amount] = useState('1000000');
  const [dev_fee, setDev_fee] = useState('1000');
  const [dev_isBroadcasting, setDev_isBroadcasting] = useState(false);
  const [dev_broadcastResult, setDev_broadcastResult] = useState(null);
  const [dev_isTestingTheory, setDev_isTestingTheory] = useState(false);
  const [dev_theoryTestResult, setDev_theoryTestResult] = useState(null);

  const dev_addLog = useCallback((message, type = 'info', data = null) => {
    console.log(`[APP_DEV_TEST_LOG][${type.toUpperCase()}]`, message, data || '');
    setDev_logs(prevLogs => [
      { id: Date.now() + Math.random(), time: new Date().toISOString(), message, type, data },
      ...prevLogs
    ].slice(0, 100));
  }, []);

  useEffect(() => {
    if (appMode === 'testing') {
      const initFrameworkForDev = async () => {
        try {
          dev_addLog('Initializing Kaspa Framework for Developer Testing Mode...', 'info');
          const result = await initialiseKaspaFramework(); 
          if (result.success) {
            setDev_frameworkReady(true);
            dev_addLog('✅ Kaspa Framework initialized (Developer Testing Mode)', 'success');
          } else {
            dev_addLog(`❌ Failed to initialize Kaspa Framework (Developer Testing Mode): ${result.error}`, 'error');
          }
        } catch (error) {
          dev_addLog(`❌ Framework initialization error (Developer Testing Mode): ${error.message}`, 'error');
        }
      };
      initFrameworkForDev();
    }
  }, [appMode, dev_addLog]); // Rerun if appMode changes to testing

  const dev_checkWalletStatus = useCallback(async () => {
    if (!dev_frameworkReady) return;
    try {
      const status = await getKastleWalletStatus(false);
      if (status.success) {
        setDev_walletStatus({
          installed: status.walletInstalled, connected: status.connected,
          address: status.walletAddress, network: status.network, balance: status.balance
        });
      } else {
        dev_addLog('Failed to get wallet status (Developer Testing Mode)', 'warn', status.error);
      }
    } catch (error) {
      dev_addLog('Error checking wallet status (Developer Testing Mode)', 'error', error);
    }
  }, [dev_frameworkReady, dev_addLog]);

  useEffect(() => {
    if (appMode === 'testing' && dev_frameworkReady) {
      dev_checkWalletStatus();
      const interval = setInterval(dev_checkWalletStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [appMode, dev_frameworkReady, dev_checkWalletStatus]);

  const dev_handleWalletConnect = async () => {
    try {
      dev_addLog('Connecting to Kastle Wallet (Developer Testing Mode)...', 'info');
      const result = await connectKastleWallet(true);
      if (result.success) {
        dev_addLog('✅ Wallet connected successfully (Developer Testing Mode)', 'success');
        await dev_checkWalletStatus();
      } else {
        dev_addLog(`❌ Wallet connection failed (Developer Testing Mode): ${result.error}`, 'error');
      }
    } catch (error) {
      dev_addLog(`❌ Wallet connection error (Developer Testing Mode): ${error.message}`, 'error');
    }
  };

  const dev_handleWalletDisconnect = async () => {
    try {
      dev_addLog('Disconnecting from Kastle Wallet (Developer Testing Mode)...', 'info');
      const result = await disconnectKastleWallet(true);
      if (result.success) {
        dev_addLog('✅ Wallet disconnected successfully (Developer Testing Mode)', 'success');
        await dev_checkWalletStatus();
      } else {
        dev_addLog(`❌ Wallet disconnection failed (Developer Testing Mode): ${result.error}`, 'error');
      }
    } catch (error) {
      dev_addLog(`❌ Wallet disconnection error (Developer Testing Mode): ${error.message}`, 'error');
    }
  };

  const dev_handleBroadcastTransaction = async () => {
    if (!dev_walletStatus.connected) {
      dev_addLog('❌ Wallet not connected (Developer Testing Mode)', 'error'); return;
    }
    if (!dev_toAddress || !dev_amount) {
      dev_addLog('❌ Please provide destination address and amount (Developer Testing Mode)', 'error'); return;
    }
    setDev_isBroadcasting(true); setDev_broadcastResult(null);
    try {
      dev_addLog('📡 Starting transaction flow (Old Method - Developer Testing Mode)...', 'info');
      const result = await createAndBroadcastPatternTransaction({
        zeroBits: dev_patternBits, toAddress: dev_toAddress,
        amount: parseInt(dev_amount), fee: parseInt(dev_fee), verbose: true
      });
      if (result.success) {
        setDev_broadcastResult(result);
        dev_addLog(`🎉 Tx Broadcasted! TxID: ${result.finalTxId} (Old Method - Developer Testing Mode)`, 'success');
      } else {
        setDev_broadcastResult({ success: false, error: result.error });
        dev_addLog(`❌ Tx Failed: ${result.error} (Old Method - Developer Testing Mode)`, 'error');
      }
    } catch (error) {
      setDev_broadcastResult({ success: false, error: error.message });
      dev_addLog(`❌ Tx Error: ${error.message} (Old Method - Developer Testing Mode)`, 'error');
    } finally { setDev_isBroadcasting(false); }
  };

  const dev_handleTestTheory = async () => {
    if (!dev_walletStatus.connected) {
      dev_addLog('❌ Wallet not connected (Developer Testing Mode)', 'error'); return;
    }
    setDev_isTestingTheory(true); setDev_theoryTestResult(null);
    try {
      dev_addLog('🧪 Testing Leo\'s Simplified Workflow Theory (Developer Testing Mode)...', 'info');
      const result = await testLeosSimplifiedWorkflow({
        zeroBits: dev_patternBits, networkId: "testnet-10", verbose: true
      });
      setDev_theoryTestResult(result);
      if (result.success && result.theoryConfirmed) {
        dev_addLog('🎉 THEORY CONFIRMED! (Developer Testing Mode)', 'success', result);
      } else {
        dev_addLog('❌ Theory test failed or not confirmed (Developer Testing Mode)', 'error', result);
      }
    } catch (error) {
      setDev_theoryTestResult({ success: false, error: error.message });
      dev_addLog(`❌ Theory test error: ${error.message} (Developer Testing Mode)`, 'error');
    } finally { setDev_isTestingTheory(false); }
  };

  const dev_formatAddress = (address) => {
    if (!address) return 'Not connected';
    return `${address.slice(0, 12)}...${address.slice(-8)}`;
  };

  const dev_formatBalance = (balance) => {
    if (balance === null || balance === undefined) return 'N/A';
    const balanceNumber = typeof balance === 'bigint' ? Number(balance) : balance;
    return `${(balanceNumber / 100000000).toFixed(8)} KAS`;
  };
  // --- END: State and functions for relocated Dev Mode features ---

  if (appMode === 'production') {
    return (
      <div>
        {/* Tab Navigation - REMOVED */}
        {/* <div style={{ 
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderBottom: '2px solid #ddd',
          textAlign: 'center'
        }}>
          <button
            onClick={() => setActiveMainTab('createBroadcast')}
            style={{
              padding: '12px 24px',
              margin: '0 10px',
              backgroundColor: activeMainTab === 'createBroadcast' ? '#4CAF50' : '#ddd',
              color: activeMainTab === 'createBroadcast' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ⚙️ Create & Broadcast Transaction
          </button>
          <button
            onClick={() => setActiveMainTab('devMode')}
            style={{
              padding: '12px 24px',
              margin: '0 10px',
              backgroundColor: activeMainTab === 'devMode' ? '#2196F3' : '#ddd',
              color: activeMainTab === 'devMode' ? 'white' : '#666',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            🛠️ Dev Mode
          </button>
        </div> */}

        {/* Tab Content - Now only PatternTransactionGenerator */}
        {/* {activeMainTab === 'createBroadcast' && <PatternTransactionGenerator />} */}
        {/* {activeMainTab === 'devMode' && <DevModeContainer />} */}
        <PatternTransactionGenerator />
        
        {/* Developer Mode Toggle (switches to the comprehensive test suite page) */}
        <div style={{ 
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setAppMode('testing')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
            title="Switch to Developer Testing Mode"
          >
            🧪 Dev Mode
          </button>
        </div>
      </div>
    );
  }

  // Testing Mode: Development Test Interface
  const handleTestKaspaUtils = async () => {
    setIsLoading(true);
    console.log('🧪 Starting kaspa-utils test from App component...');
    
    try {
      const results = await runKaspaUtilsTest();
      setTestResults(results);
      console.log('✅ Test completed:', results);
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const runPatternTests = async () => {
    setIsTestingPattern(true);
    setPatternTestResults(null);
    try {
      const results = await runPatternMatchingTests();
      setPatternTestResults(results);
    } catch (error) {
      setPatternTestResults({
        totalTests: 0,
        passed: 0,
        failed: 1,
        testDetails: [{ test: 'Pattern Matching', status: 'ERROR', details: error.message }]
      });
    }
    setIsTestingPattern(false);
  };

  const runEnvelopeTests = async () => {
    setIsTestingEnvelope(true);
    setEnvelopeTestResults(null);
    try {
      const results = await testEnvelopeConstruction();
      setEnvelopeTestResults(results);
    } catch (error) {
      setEnvelopeTestResults({
        totalTests: 0,
        passed: 0,
        failed: 1,
        testDetails: [{ test: 'Envelope Construction', status: 'ERROR', details: error.message }]
      });
    }
    setIsTestingEnvelope(false);
  };

  const runNonceIterationTests = async () => {
    setIsTestingNonceIteration(true);
    setNonceIterationResults(null);
    try {
      const results = await testNonceIteration();
      setNonceIterationResults(results);
    } catch (error) {
      setNonceIterationResults({
        totalTests: 0,
        passed: 0,
        failed: 1,
        testDetails: [{ test: 'Nonce Iteration', status: 'ERROR', details: error.message }]
      });
    }
    setIsTestingNonceIteration(false);
  };

  const runProgressCallbackFixTests = async () => {
    setIsTestingProgressCallbackFix(true);
    setProgressCallbackFixResults(null);
    try {
      const results = await testProgressCallbackFix();
      setProgressCallbackFixResults(results);
    } catch (error) {
      setProgressCallbackFixResults({
        success: false,
        error: error.message,
        test1: null,
        test2: null
      });
    }
    setIsTestingProgressCallbackFix(false);
  };

  const runPsktGenerationTests = async () => {
    setIsTestingPskt(true);
    setPsktTestResults(null);
    try {
      const results = await testPsktGeneration();
      setPsktTestResults(results);
    } catch (error) {
      setPsktTestResults({
        success: false,
        error: error.message,
        totalTests: 0,
        passedTests: 0,
        testDetails: []
      });
    }
    setIsTestingPskt(false);
  };

  const runQuickPsktValidation = () => {
    try {
      const result = quickPsktValidationTest();
      console.log('🚀 Quick PSKT Validation Result:', result);
      setPsktTestResults({
        success: result.status === 'PASS',
        totalTests: 1,
        passedTests: result.status === 'PASS' ? 1 : 0,
        testDetails: [result],
        quickValidation: true
      });
    } catch (error) {
      setPsktTestResults({
        success: false,
        error: error.message,
        totalTests: 1,
        passedTests: 0,
        testDetails: []
      });
    }
  };

  const runKastleIntegrationTests = async () => {
    setIsTestingKastleIntegration(true);
    setKastleIntegrationResults(null);
    try {
      const results = await runAllKastleIntegrationTests();
      setKastleIntegrationResults(results);
    } catch (error) {
      setKastleIntegrationResults({
        success: false,
        error: error.message,
        summary: {
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0
        },
        results: []
      });
    }
    setIsTestingKastleIntegration(false);
  };

  const runEnhancedBroadcastingTests = async () => {
    setIsTestingEnhancedBroadcasting(true);
    setEnhancedBroadcastingResults(null);
    try {
      const results = await testEnhancedBroadcasting();
      setEnhancedBroadcastingResults(results);
    } catch (error) {
      setEnhancedBroadcastingResults({
        success: false,
        error: error.message,
        summary: {
          total: 0,
          passed: 0,
          failed: 1,
          passRate: '0.0'
        },
        results: []
      });
    }
    setIsTestingEnhancedBroadcasting(false);
  };

  const runWasmInvestigationTest = async () => {
    setIsTestingWasmInvestigation(true);
    setWasmInvestigationResults(null);
    try {
      const results = await testUtxoWasmInvestigation(true);
      setWasmInvestigationResults(results);
    } catch (error) {
      setWasmInvestigationResults({
        success: false,
        error: error.message,
        status: 'failed',
        summary: {
          totalUtxos: 0,
          successfulExtractions: 0,
          failedExtractions: 0,
          successRate: 0
        },
        results: {}
      });
    }
    setIsTestingWasmInvestigation(false);
  };

  const runPsktGenerationFixTest = async () => {
    setIsTestingPsktFix(true);
    setPsktFixResults(null);
    try {
      const results = await testPsktGenerationFix(true);
      setPsktFixResults(results);
    } catch (error) {
      setPsktFixResults({
        overall: { success: false, message: `Test failed: ${error.message}` },
        steps: [],
        timestamp: new Date().toISOString(),
        testName: "PSKT Generation Fix Validation",
        taskId: "3.5.4"
      });
    }
    setIsTestingPsktFix(false);
  };

  const runNodeConnectionTest = async () => {
    setIsTestingNodeConnection(true);
    setNodeConnectionTestResults(null);
    try {
      const results = await testNodeConnection({
        verbose: true,
        timeoutMs: 15000 // 15 second timeout for thorough testing
      });
      setNodeConnectionTestResults(results);
    } catch (error) {
      setNodeConnectionTestResults({
        success: false,
        error: error.message,
        testId: `node-test-error-${Date.now()}`,
        duration: 0,
        errors: [{ type: 'TEST_ERROR', message: error.message, timestamp: new Date().toISOString() }],
        summary: `❌ Node connection test failed: ${error.message}`
      });
    }
    setIsTestingNodeConnection(false);
  };

  const runWorkflowSteps1And2Tests = async () => {
    setIsTestingWorkflowSteps1And2(true);
    setWorkflowSteps1And2Results(null);
    try {
      const results = await runAllWorkflowSteps1And2Tests();
      setWorkflowSteps1And2Results(results);
    } catch (error) {
      setWorkflowSteps1And2Results({
        success: false,
        error: error.message,
        summary: {
          total: 0,
          passed: 0,
          failed: 1,
          duration: 0,
          passRate: '0%'
        },
        results: [],
        taskId: 'Task 1.2',
        taskName: '5-Step Workflow Steps 1-2 Implementation'
      });
    }
    setIsTestingWorkflowSteps1And2(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* Mode Switch */}
        <div style={{ 
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#666' }}>🧪 Developer Testing Mode</span>
          <button
            onClick={() => setAppMode('production')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            🚀 Production Mode
          </button>
        </div>

        <img src={logo} className="App-logo" alt="logo" />
        <h1>Kaspa Transaction ID Pattern Generator</h1>
        <p>
          Development Test Interface - Task Implementation Validation
        </p>
        
        {/* --- START: Relocated Dev Mode Features & TestSignPSKTDemo for appMode === 'testing' --- */}
        <div style={{ border: '2px dashed #ccc', padding: '20px', margin: '20px 0', borderRadius: '10px' }}>
          <h2 style={{textAlign: 'center', color: '#ff5722'}}>--- Developer Tools Section ---</h2>

          {/* Wallet Status & Connect/Disconnect for Dev Tools */}
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px',
            backgroundColor: dev_frameworkReady ? (dev_walletStatus.connected ? '#e8f5e8' : '#fff3cd') : '#ffebee',
            borderRadius: '8px', marginBottom: '20px', border: `1px solid ${dev_frameworkReady ? (dev_walletStatus.connected ? '#c8e6c9' : '#ffeaa7') : '#f5c6cb'}`
          }}>
            <div>
              <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Framework: {dev_frameworkReady ? '✅' : '❌'}</span>
              <span style={{ fontWeight: 'bold', marginRight: '10px' }}>Wallet: {dev_walletStatus.installed ? '✅' : '❌'}</span>
              <span style={{ fontWeight: 'bold' }}>Connection: {dev_walletStatus.connected ? `✅ (${dev_formatAddress(dev_walletStatus.address)})` : '❌'}</span>
              {dev_walletStatus.connected && <span style={{ marginLeft: '10px' }}>Balance: {dev_formatBalance(dev_walletStatus.balance)}</span>}
            </div>
            <div>
              {dev_walletStatus.installed && dev_frameworkReady && (
                <>
                  {!dev_walletStatus.connected ? (
                    <button onClick={dev_handleWalletConnect} style={{ padding: '8px 12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Connect Wallet</button>
                  ) : (
                    <button onClick={dev_handleWalletDisconnect} style={{ padding: '8px 12px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Disconnect Wallet</button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Section for Old Create & Broadcast Functionality */}
          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ff9800', borderRadius: '8px' }}>
            <h3 style={{color: '#e65100', borderBottom: '1px solid #ffcc80', paddingBottom: '10px'}}>Old "Create & Broadcast" Functionality (Kastle-based)</h3>
            {!dev_walletStatus.connected && (
              <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #ffeaa7', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ Please connect wallet to use this feature.</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div><label>Pattern Bits: <select value={dev_patternBits} onChange={(e) => setDev_patternBits(parseInt(e.target.value))} style={{width: '100%', padding: '6px'}}>{[4,6,8,10,12,14,16].map(b => <option key={b} value={b}>{b} bits</option>)}</select></label></div>
              <div><label>To Address: <input type="text" value={dev_toAddress} onChange={(e) => setDev_toAddress(e.target.value)} style={{width: '100%', padding: '6px'}} /></label></div>
              <div><label>Amount (sompi): <input type="number" value={dev_amount} onChange={(e) => setDev_amount(e.target.value)} style={{width: '100%', padding: '6px'}} /></label></div>
              <div><label>Fee (sompi): <input type="number" value={dev_fee} onChange={(e) => setDev_fee(e.target.value)} style={{width: '100%', padding: '6px'}} /></label></div>
            </div>
            <button onClick={dev_handleBroadcastTransaction} disabled={!dev_walletStatus.connected || dev_isBroadcasting} style={{ width: '100%', padding: '10px', fontSize: '16px', backgroundColor: dev_isBroadcasting ? '#ccc' : '#ff5722', color: 'white', border: 'none', borderRadius: '5px' }}>
              {dev_isBroadcasting ? '📡 Broadcasting...' : '📡 Create & Broadcast (Old Method)'}
            </button>
            {dev_broadcastResult && (
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: dev_broadcastResult.success ? '#e8f5e8' : '#ffebee', borderRadius: '5px', border: `1px solid ${dev_broadcastResult.success ? '#c3e6cb' : '#f5c6cb'}` }}>
                <h4>{dev_broadcastResult.success ? '🎉 Success!' : '❌ Failed'}</h4>
                {dev_broadcastResult.success ? <p>TxID: {dev_broadcastResult.finalTxId}</p> : <p>Error: {dev_broadcastResult.error}</p>}
              </div>
            )}
          </div>

          {/* Section for Test WASM SDK + Kastle API Theory */}
          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #673ab7', borderRadius: '8px' }}>
            <h3 style={{color: '#311b92', borderBottom: '1px solid #b39ddb', paddingBottom: '10px'}}>Test WASM SDK + Kastle API Theory (Leo's Simplified Workflow)</h3>
            <button onClick={dev_handleTestTheory} disabled={!dev_walletStatus.connected || dev_isTestingTheory} style={{ width: '100%', padding: '10px', fontSize: '16px', backgroundColor: dev_isTestingTheory ? '#ccc' : '#673ab7', color: 'white', border: 'none', borderRadius: '5px' }}>
              {dev_isTestingTheory ? '🧪 Testing...' : '🧪 Run Theory Test'}
            </button>
            {dev_theoryTestResult && (
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: dev_theoryTestResult.success ? '#e8f5e8' : '#ffebee', borderRadius: '5px', border: `1px solid ${dev_theoryTestResult.success ? '#c3e6cb' : '#f5c6cb'}` }}>
                <h4>{dev_theoryTestResult.success && dev_theoryTestResult.theoryConfirmed ? '🎉 Theory Confirmed!' : (dev_theoryTestResult.success ? '🤔 Theory Not Confirmed' : '❌ Test Failed')}</h4>
                <p>Recommendation: {dev_theoryTestResult.recommendation}</p>
                {dev_theoryTestResult.testResult && <p>TxID Preserved: {dev_theoryTestResult.testResult.txIdPreserved ? '✅ Yes' : '❌ No'}</p>}
                {dev_theoryTestResult.error && <p>Error: {dev_theoryTestResult.error}</p>}
              </div>
            )}
          </div>

          {/* Section for Test Official SDK Example (TestSignPSKTDemo) */}
          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #009688', borderRadius: '8px' }}>
            <h3 style={{color: '#004d40', borderBottom: '1px solid #80cbc4', paddingBottom: '10px'}}>Test Official SDK Example (PSKT Demo)</h3>
            <TestSignPSKTDemo />
          </div>

          {/* Developer Testing Mode Logs */}
          <div style={{ marginTop: '20px' }}>
            <h4>Developer Testing Mode Activity Logs:</h4>
            <div style={{ backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '5px', maxHeight: '300px', overflowY: 'auto', fontSize: '12px', fontFamily: 'monospace' }}>
              {dev_logs.length === 0 ? <p>No logs yet for this section.</p> :
                dev_logs.map(log => (
                  <div key={log.id} style={{ borderBottom: '1px solid #555', marginBottom: '5px', paddingBottom: '5px', color: log.type === 'error' ? '#ff8a80' : (log.type === 'success' ? '#b9f6ca' : (log.type === 'warn' ? '#ffe57f' : '#fff')) }}>
                    <span>[{new Date(log.time).toLocaleTimeString()}] {log.message}</span>
                    {log.data && <pre style={{fontSize: '10px', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{JSON.stringify(log.data, null, 2)}</pre>}
                  </div>
              ))}
            </div>
          </div>
        </div>
        {/* --- END: Relocated Dev Mode Features --- */}

        {/* Task 2.1 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #61dafb', borderRadius: '10px' }}>
          <h2>Task 2.1: Kaspa Utilities Module</h2>
          <button 
            onClick={handleTestKaspaUtils}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#61dafb',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              margin: '10px 0'
            }}
          >
            {isLoading ? '🔄 Testing...' : '🧪 Test Kaspa Utils Module'}
          </button>

          {testResults && (
            <div style={{ 
              margin: '10px 0', 
              padding: '15px', 
              backgroundColor: testResults.success ? '#4CAF50' : '#f44336',
              borderRadius: '5px',
              color: 'white',
              textAlign: 'left',
              maxWidth: '600px'
            }}>
              <h3>{testResults.success ? '✅ Task 2.1 Passed' : '❌ Task 2.1 Failed'}</h3>
              {testResults.error ? (
                <p>Error: {testResults.error}</p>
              ) : (
                <div>
                  <p><strong>Module Import:</strong> ✅ Success</p>
                  <p><strong>Functions Callable:</strong> ✅ Success</p>
                  <p><strong>Framework Init:</strong> {testResults.tests?.initialization ? '✅' : '❌'}</p>
                  <p><strong>Pattern Creation:</strong> {testResults.tests?.patternCreation?.success ? '✅' : '❌'}</p>
                  <p><strong>Signing Function:</strong> {testResults.tests?.signing?.success ? '✅' : '❌'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 2.2 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ff9800', borderRadius: '10px' }}>
          <h2>Task 2.2: Transaction ID Pattern Matching</h2>
          <button 
            onClick={runPatternTests}
            disabled={isTestingPattern}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#ff9800',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingPattern ? 'not-allowed' : 'pointer',
              opacity: isTestingPattern ? 0.6 : 1,
              margin: '10px 0'
            }}
          >
            {isTestingPattern ? '🔄 Testing...' : '🎯 Test Pattern Matching'}
          </button>

          {patternTestResults && (
            <div style={{ 
              margin: '10px 0', 
              padding: '15px', 
              backgroundColor: patternTestResults.summary?.successRate === '100.0%' ? '#4CAF50' : '#f44336',
              borderRadius: '5px',
              color: 'white',
              textAlign: 'left',
              maxWidth: '600px'
            }}>
              <h3>{patternTestResults.summary?.successRate === '100.0%' ? '✅ Task 2.2 Passed' : '❌ Task 2.2 Failed'}</h3>
              {patternTestResults.error ? (
                <p>Error: {patternTestResults.error}</p>
              ) : (
                <div>
                  <p><strong>Total Tests:</strong> {patternTestResults.summary?.totalTests}</p>
                  <p><strong>Passed:</strong> {patternTestResults.summary?.passed}</p>
                  <p><strong>Failed:</strong> {patternTestResults.summary?.failed}</p>
                  <p><strong>Success Rate:</strong> {patternTestResults.summary?.successRate}</p>
                  <div style={{ fontSize: '12px', marginTop: '10px' }}>
                    <p>✅ Basic Validation: {patternTestResults.basicValidation?.filter(t => t.passed).length}/{patternTestResults.basicValidation?.length}</p>
                    <p>✅ Edge Cases: {patternTestResults.edgeCases?.filter(t => t.passed).length}/{patternTestResults.edgeCases?.length}</p>
                    <p>✅ 4-bit Patterns: {patternTestResults.fourBitPattern?.filter(t => t.passed).length}/{patternTestResults.fourBitPattern?.length}</p>
                    <p>✅ 8-bit Patterns: {patternTestResults.eightBitPattern?.filter(t => t.passed).length}/{patternTestResults.eightBitPattern?.length}</p>
                    <p>✅ Performance: {patternTestResults.performanceOptimization?.filter(t => t.passed).length}/{patternTestResults.performanceOptimization?.length}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 2.3 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #4CAF50', borderRadius: '10px' }}>
          <h2>Task 2.3: Envelope Construction</h2>
          <button 
            onClick={runEnvelopeTests}
            disabled={isTestingEnvelope}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingEnvelope ? 'not-allowed' : 'pointer',
              opacity: isTestingEnvelope ? 0.6 : 1,
              margin: '10px 0'
            }}
          >
            {isTestingEnvelope ? '🔄 Testing...' : '📦 Test Envelope Construction'}
          </button>

          {envelopeTestResults && (
            <div style={{ 
              margin: '10px 0', 
              padding: '15px', 
              backgroundColor: envelopeTestResults.failed === 0 ? '#4CAF50' : '#f44336',
              borderRadius: '5px',
              color: 'white',
              textAlign: 'left',
              maxWidth: '600px'
            }}>
              <h3>{envelopeTestResults.failed === 0 ? '✅ Task 2.3 Passed' : '❌ Task 2.3 Failed'}</h3>
              {envelopeTestResults.error ? (
                <p>Error: {envelopeTestResults.error}</p>
              ) : (
                <div>
                  <p><strong>Total Tests:</strong> {envelopeTestResults.totalTests}</p>
                  <p><strong>Passed:</strong> {envelopeTestResults.passed}</p>
                  <p><strong>Failed:</strong> {envelopeTestResults.failed}</p>
                  <p><strong>Success Rate:</strong> {((envelopeTestResults.passed / envelopeTestResults.totalTests) * 100).toFixed(1)}%</p>
                  <div style={{ fontSize: '12px', marginTop: '10px' }}>
                    {envelopeTestResults.testDetails.map((test, index) => (
                      <p key={index}>
                        {test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '💥'} {test.test}: {test.details}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 2.4 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ffd700', borderRadius: '10px' }}>
          <h2>Task 2.4: Enhanced Nonce Iteration</h2>
          <button 
            onClick={runNonceIterationTests}
            disabled={isTestingNonceIteration}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#ffd700',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingNonceIteration ? 'not-allowed' : 'pointer',
              opacity: isTestingNonceIteration ? 0.6 : 1,
              margin: '10px 0'
            }}
          >
            {isTestingNonceIteration ? '🔄 Testing...' : '⚡ Test Enhanced Nonce Iteration'}
          </button>

          {isTestingNonceIteration && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e6f3ff', borderRadius: '5px', color: '#000' }}>
              <p>🔄 Running comprehensive nonce iteration tests...</p>
              <p>⏱️ This includes 4-bit, 8-bit pattern generation and performance validation</p>
              <p>📊 Progress updates will appear in browser console</p>
            </div>
          )}
          
          {nonceIterationResults && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px', color: '#000' }}>
              <h3>Enhanced Nonce Iteration Test Results:</h3>
              <p><strong>Total Tests:</strong> {nonceIterationResults.totalTests}</p>
              <p><strong>Passed:</strong> <span style={{color: 'green'}}>{nonceIterationResults.passed}</span></p>
              <p><strong>Failed:</strong> <span style={{color: 'red'}}>{nonceIterationResults.failed}</span></p>
              <p><strong>Success Rate:</strong> {((nonceIterationResults.passed / nonceIterationResults.totalTests) * 100).toFixed(1)}%</p>
              
              {/* Performance Summary */}
              {nonceIterationResults.performanceResults && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '5px' }}>
                  <h4>⚡ Performance Summary:</h4>
                  {nonceIterationResults.performanceResults.fourBit && (
                    <p><strong>4-bit Pattern:</strong> {nonceIterationResults.performanceResults.fourBit.duration}ms, {nonceIterationResults.performanceResults.fourBit.iterationsPerSecond.toLocaleString()}/sec</p>
                  )}
                  {nonceIterationResults.performanceResults.eightBit && (
                    <div>
                      <p><strong>8-bit Pattern:</strong> {nonceIterationResults.performanceResults.eightBit.duration}ms, {nonceIterationResults.performanceResults.eightBit.iterationsPerSecond.toLocaleString()}/sec</p>
                      {nonceIterationResults.performanceResults.eightBit.duration <= 5000 && (
                        <p style={{ color: 'green', fontWeight: 'bold' }}>🎯 SUCCESS: Meets 5-second target!</p>
                      )}
                      {nonceIterationResults.performanceResults.eightBit.duration > 5000 && nonceIterationResults.performanceResults.eightBit.duration <= 10000 && (
                        <p style={{ color: 'orange', fontWeight: 'bold' }}>⚠️ ACCEPTABLE: Within 10 seconds (target was 5)</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📋 Detailed Results</summary>
                <div style={{ marginTop: '10px' }}>
                  {nonceIterationResults.testDetails.map((test, index) => (
                    <div key={index} style={{ margin: '5px 0', padding: '5px', backgroundColor: test.status.includes('PASS') ? '#d4edda' : '#f8d7da', borderRadius: '3px' }}>
                      <strong>{test.status.includes('PASS') ? '✅' : '❌'} {test.test}:</strong> {test.details}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Progress Callback Fix Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #ff6b6b', borderRadius: '10px' }}>
          <h2>🔧 Progress Callback Fix Testing</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
            Testing the fix for "success failure" scenarios where performance exceeds expectations
          </p>
          <button 
            onClick={runProgressCallbackFixTests}
            disabled={isTestingProgressCallbackFix}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#ff6b6b',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingProgressCallbackFix ? 'not-allowed' : 'pointer',
              opacity: isTestingProgressCallbackFix ? 0.6 : 1,
              margin: '10px 0',
              color: 'white'
            }}
          >
            {isTestingProgressCallbackFix ? '🔄 Testing Fix...' : '🔧 Test Progress Callback Fix'}
          </button>

          {isTestingProgressCallbackFix && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e6f3ff', borderRadius: '5px', color: '#000' }}>
              <p>🔧 Testing progress callback fix for exceptional performance scenarios...</p>
              <p>⚡ This validates that callbacks work both when triggered and when performance is too good</p>
              <p>📊 Progress updates will appear in browser console</p>
            </div>
          )}
          
          {progressCallbackFixResults && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: progressCallbackFixResults.success ? '#d4edda' : '#f8d7da', 
              borderRadius: '5px', 
              color: '#000',
              border: progressCallbackFixResults.success ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
            }}>
              <h3>{progressCallbackFixResults.success ? '✅ Progress Callback Fix Successful' : '❌ Progress Callback Fix Failed'}</h3>
              
              {progressCallbackFixResults.error ? (
                <p><strong>Error:</strong> {progressCallbackFixResults.error}</p>
              ) : (
                <div>
                  {progressCallbackFixResults.test1 && (
                    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                      <h4>📊 Test 1 (4-bit Pattern):</h4>
                      <p><strong>Duration:</strong> {progressCallbackFixResults.test1.duration}ms</p>
                      <p><strong>Attempts:</strong> {progressCallbackFixResults.test1.attempts}</p>
                      <p><strong>Callbacks Triggered:</strong> {progressCallbackFixResults.test1.callbacks}</p>
                      <p><strong>Pattern Found:</strong> {progressCallbackFixResults.test1.success ? '✅' : '❌'}</p>
                      {progressCallbackFixResults.test1.callbacks === 0 && progressCallbackFixResults.test1.success && (
                        <p style={{ color: '#28a745', fontWeight: 'bold' }}>🚀 Exceptional Performance: Pattern found before callbacks could trigger!</p>
                      )}
                    </div>
                  )}
                  
                  {progressCallbackFixResults.test2 && (
                    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                      <h4>📊 Test 2 (8-bit Pattern):</h4>
                      <p><strong>Duration:</strong> {progressCallbackFixResults.test2.duration}ms</p>
                      <p><strong>Attempts:</strong> {progressCallbackFixResults.test2.attempts}</p>
                      <p><strong>Callbacks Triggered:</strong> {progressCallbackFixResults.test2.callbacks}</p>
                      <p><strong>Pattern Found:</strong> {progressCallbackFixResults.test2.success ? '✅' : '❌'}</p>
                      {progressCallbackFixResults.test2.callbacks === 0 && progressCallbackFixResults.test2.success && (
                        <p style={{ color: '#28a745', fontWeight: 'bold' }}>🚀 Exceptional Performance: Pattern found before callbacks could trigger!</p>
                      )}
                    </div>
                  )}
                  
                  {progressCallbackFixResults.success && (
                    <div style={{ padding: '10px', backgroundColor: '#d1ecf1', borderRadius: '5px', marginTop: '10px' }}>
                      <p style={{ color: '#0c5460', fontWeight: 'bold', margin: 0 }}>
                        🏆 SUCCESS: Progress callback fix handles both normal operation and exceptional performance scenarios!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 1.2 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '3px solid #2196F3', borderRadius: '10px', backgroundColor: '#f3f8ff' }}>
          <h2 style={{ color: '#1976D2', margin: '0 0 10px 0' }}>🚀 Task 1.2: 5-Step Workflow Steps 1-2 Implementation</h2>
          <p style={{ fontSize: '14px', color: '#1565C0', margin: '10px 0', fontWeight: 'bold' }}>
            NEW WORKFLOW: Implementing Steps 1-2 of the target 5-step workflow integration
          </p>
          <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px', margin: '10px 0', border: '1px solid #bbdefb' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#0d47a1' }}>
              <strong>TARGET WORKFLOW:</strong> Step 1: kastle - Connect wallet, get address | 
              Step 2: Kastle - Get UTXOs | Includes UTXO format compatibility verification with kaspa-wasm createTransactions()
            </p>
          </div>
          
          <button 
            onClick={runWorkflowSteps1And2Tests}
            disabled={isTestingWorkflowSteps1And2}
            style={{
              padding: '15px 25px',
              fontSize: '16px',
              backgroundColor: '#2196F3',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingWorkflowSteps1And2 ? 'not-allowed' : 'pointer',
              opacity: isTestingWorkflowSteps1And2 ? 0.6 : 1,
              color: 'white',
              margin: '10px 0',
              fontWeight: 'bold'
            }}
          >
            {isTestingWorkflowSteps1And2 ? '🔄 Testing 5-Step Workflow Steps 1-2...' : '🚀 TEST WORKFLOW STEPS 1-2'}
          </button>

          {isTestingWorkflowSteps1And2 && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#e8f4fd', borderRadius: '5px', color: '#000', border: '1px solid #90caf9' }}>
              <p><strong>🔄 Running 5-Step Workflow Steps 1-2 Implementation Tests...</strong></p>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <p>🔌 Step 1: Kastle wallet connection and address retrieval</p>
                <p>💰 Step 2: UTXO fetching from Kastle wallet</p>
                <p>🔍 UTXO format compatibility analysis with kaspa-wasm createTransactions()</p>
                <p>📊 Workflow state validation and error handling</p>
                <p>✅ Success criteria validation for Task 1.2</p>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#1565C0' }}>
                📊 Comprehensive test results and workflow validation will appear in browser console
              </p>
            </div>
          )}
          
          {workflowSteps1And2Results && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: workflowSteps1And2Results.success ? '#e8f5e8' : '#ffebee', 
              borderRadius: '5px', 
              color: '#000',
              border: workflowSteps1And2Results.success ? '3px solid #4CAF50' : '3px solid #f44336'
            }}>
              <h3 style={{ 
                color: workflowSteps1And2Results.success ? '#2e7d32' : '#c62828',
                margin: '0 0 15px 0'
              }}>
                {workflowSteps1And2Results.success ? '🎉 Task 1.2: Workflow Steps 1-2 - SUCCESS!' : '❌ Task 1.2: Workflow Steps 1-2 - FAILED'}
              </h3>
              
              {workflowSteps1And2Results.error ? (
                <div style={{ padding: '10px', backgroundColor: '#ffcdd2', borderRadius: '5px', marginBottom: '10px' }}>
                  <p><strong>Error:</strong> {workflowSteps1And2Results.error}</p>
                </div>
              ) : (
                <div>
                  {/* Summary Stats */}
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px', minWidth: '120px', border: '1px solid #dee2e6' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>🧪 Total Tests</p>
                      <p style={{ margin: 0, fontSize: '20px', color: '#333' }}>{workflowSteps1And2Results.summary?.total || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: workflowSteps1And2Results.summary?.passed === workflowSteps1And2Results.summary?.total ? '#d4edda' : '#f8d7da', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>✅ Passed</p>
                      <p style={{ margin: 0, fontSize: '20px', color: workflowSteps1And2Results.summary?.passed === workflowSteps1And2Results.summary?.total ? '#155724' : '#721c24' }}>
                        {workflowSteps1And2Results.summary?.passed || 0}
                      </p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>❌ Failed</p>
                      <p style={{ margin: 0, fontSize: '20px', color: '#721c24' }}>{workflowSteps1And2Results.summary?.failed || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#e1f5fe', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>📈 Pass Rate</p>
                      <p style={{ margin: 0, fontSize: '18px', color: '#0277bd' }}>{workflowSteps1And2Results.summary?.passRate || '0%'}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>⏱️ Duration</p>
                      <p style={{ margin: 0, fontSize: '16px', color: '#f57c00' }}>{workflowSteps1And2Results.summary?.duration || 0}ms</p>
                    </div>
                  </div>

                  {/* Success Rate Indicator */}
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Task 1.2 Implementation Success Rate:</p>
                    <div style={{ 
                      width: '100%', 
                      height: '25px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{
                        width: `${workflowSteps1And2Results.summary?.passRate?.replace('%', '') || 0}%`,
                        height: '100%',
                        backgroundColor: workflowSteps1And2Results.success ? '#4CAF50' : '#f44336',
                        transition: 'width 0.5s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {workflowSteps1And2Results.summary?.passRate || '0%'}
                      </div>
                    </div>
                  </div>

                  {/* Workflow Implementation Status */}
                  <div style={{ 
                    marginBottom: '15px', 
                    padding: '12px', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '5px',
                    border: '1px solid #bbdefb'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1565C0' }}>🎯 Workflow Implementation Status:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>🔌 Step 1: Wallet Connection</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>Connect kastle, get address</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>💰 Step 2: UTXO Fetching</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>Get UTXOs from Kastle</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>🔍 UTXO Compatibility</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>kaspa-wasm integration check</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>📊 Workflow State</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>State tracking validation</p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Test Results */}
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '5px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                      📋 Detailed Test Results ({workflowSteps1And2Results.results?.length || 0} tests)
                    </summary>
                    <div style={{ marginTop: '10px' }}>
                      {workflowSteps1And2Results.results?.map((test, index) => (
                        <div key={index} style={{ 
                          margin: '8px 0', 
                          padding: '10px', 
                          backgroundColor: test.success ? '#e8f5e8' : '#ffebee', 
                          borderLeft: test.success ? '4px solid #4CAF50' : '4px solid #f44336',
                          borderRadius: '0 5px 5px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                              {test.success ? '✅' : '❌'}
                            </span>
                            <strong style={{ color: test.success ? '#2e7d32' : '#c62828' }}>
                              {test.name}
                            </strong>
                          </div>
                          
                          {test.error && (
                            <p style={{ color: '#c62828', margin: '5px 0', fontStyle: 'italic' }}>
                              Error: {test.error}
                            </p>
                          )}
                          
                          {test.details && (
                            <div style={{ fontSize: '12px', marginTop: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '3px' }}>
                              <details>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Technical Details</summary>
                                <pre style={{ fontSize: '11px', marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(test.details, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      )) || []}
                    </div>
                  </details>

                  {/* Task Status */}
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    backgroundColor: workflowSteps1And2Results.success ? '#c8e6c9' : '#ffcdd2', 
                    borderRadius: '5px',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: 'bold', 
                      color: workflowSteps1And2Results.success ? '#1b5e20' : '#b71c1c',
                      fontSize: '16px'
                    }}>
                      {workflowSteps1And2Results.success ? 
                        '🚀 Task 1.2 COMPLETE - Ready for Task 1.3 (Step 3: kaspa-wasm pattern generation)!' : 
                        '🔧 Review failed tests and fix issues before proceeding to Task 1.3'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

                 {/* Task 3.1 Testing */}
         <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #9c27b0', borderRadius: '10px' }}>
           <h2>📋 Task 3.1: PSKT JSON Generation</h2>
           <p style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
             Testing PSKT (Partially Signed Kaspa Transaction) generation with correct field names and Kastle Wallet compatibility
           </p>
           
           <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '10px 0' }}>
             <button 
               onClick={runPsktGenerationTests}
               disabled={isTestingPskt}
               style={{
                 padding: '10px 20px',
                 fontSize: '16px',
                 backgroundColor: '#9c27b0',
                 border: 'none',
                 borderRadius: '5px',
                 cursor: isTestingPskt ? 'not-allowed' : 'pointer',
                 opacity: isTestingPskt ? 0.6 : 1,
                 color: 'white'
               }}
             >
               {isTestingPskt ? '🔄 Testing...' : '🧪 Full PSKT Tests'}
             </button>
             
             <button 
               onClick={runQuickPsktValidation}
               disabled={isTestingPskt}
               style={{
                 padding: '10px 20px',
                 fontSize: '16px',
                 backgroundColor: '#673ab7',
                 border: 'none',
                 borderRadius: '5px',
                 cursor: isTestingPskt ? 'not-allowed' : 'pointer',
                 opacity: isTestingPskt ? 0.6 : 1,
                 color: 'white'
               }}
             >
               ⚡ Quick Validation
             </button>
           </div>

          {isTestingPskt && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e6f3ff', borderRadius: '5px', color: '#000' }}>
              <p>🔄 Running PSKT generation tests...</p>
              <p>⏱️ This includes generating PSKT and validating its validity</p>
              <p>📊 Progress updates will appear in browser console</p>
            </div>
          )}
          
          {psktTestResults && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px', color: '#000' }}>
              <h3>PSKT Generation Test Results:</h3>
              <p><strong>Total Tests:</strong> {psktTestResults.totalTests}</p>
              <p><strong>Passed Tests:</strong> {psktTestResults.passedTests}</p>
              <p><strong>Success Rate:</strong> {((psktTestResults.passedTests / psktTestResults.totalTests) * 100).toFixed(1)}%</p>
              
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📋 Detailed Results</summary>
                <div style={{ marginTop: '10px' }}>
                  {psktTestResults.testDetails.map((test, index) => (
                    <div key={index} style={{ margin: '5px 0', padding: '5px', backgroundColor: test.status === 'PASS' ? '#d4edda' : '#f8d7da', borderRadius: '3px' }}>
                      <strong>{test.status === 'PASS' ? '✅' : '❌'} {test.test}:</strong> {test.details}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Task 3.2 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #00bcd4', borderRadius: '10px' }}>
          <h2>💰 Task 3.2: Kastle Wallet Integration</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
            Testing comprehensive Kastle Wallet integration: connection, UTXO fetching, transaction signing, and broadcasting
          </p>
          
          <button 
            onClick={runKastleIntegrationTests}
            disabled={isTestingKastleIntegration}
            style={{
              padding: '15px 25px',
              fontSize: '16px',
              backgroundColor: '#00bcd4',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingKastleIntegration ? 'not-allowed' : 'pointer',
              opacity: isTestingKastleIntegration ? 0.6 : 1,
              color: 'white',
              margin: '10px 0'
            }}
          >
            {isTestingKastleIntegration ? '🔄 Testing Wallet Integration...' : '💰 Test Kastle Wallet Integration'}
          </button>

          {isTestingKastleIntegration && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#e0f2f1', borderRadius: '5px', color: '#000' }}>
              <p><strong>🔄 Running comprehensive Kastle Wallet integration tests...</strong></p>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <p>🔍 Testing wallet status and availability detection</p>
                <p>🔌 Testing wallet connection and disconnection</p>
                <p>💰 Testing UTXO fetching functionality</p>
                <p>📝 Testing PSKT generation and validation</p>
                <p>✍️ Testing signing workflow (mock)</p>
                <p>🏗️ Testing complete integration readiness</p>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                📊 Progress updates and detailed logs appear in browser console
              </p>
            </div>
          )}
          
          {kastleIntegrationResults && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: kastleIntegrationResults.success ? '#e8f5e8' : '#ffebee', 
              borderRadius: '5px', 
              color: '#000',
              border: kastleIntegrationResults.success ? '2px solid #4CAF50' : '2px solid #f44336'
            }}>
              <h3 style={{ 
                color: kastleIntegrationResults.success ? '#2e7d32' : '#c62828',
                margin: '0 0 15px 0'
              }}>
                {kastleIntegrationResults.success ? '🎉 Task 3.2: Kastle Wallet Integration - SUCCESS' : '❌ Task 3.2: Kastle Wallet Integration - FAILED'}
              </h3>
              
              {kastleIntegrationResults.error ? (
                <div style={{ padding: '10px', backgroundColor: '#ffcdd2', borderRadius: '5px', marginBottom: '10px' }}>
                  <p><strong>Error:</strong> {kastleIntegrationResults.error}</p>
                </div>
              ) : (
                <div>
                  {/* Summary Stats */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>📊 Total Tests</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#333' }}>{kastleIntegrationResults.summary?.total || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#c8e6c9', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✅ Passed</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#2e7d32' }}>{kastleIntegrationResults.summary?.passed || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#ffcdd2', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>❌ Failed</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#c62828' }}>{kastleIntegrationResults.summary?.failed || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>⚠️ Skipped</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#f57c00' }}>{kastleIntegrationResults.summary?.skipped || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#e1f5fe', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>⏱️ Duration</p>
                      <p style={{ margin: 0, fontSize: '18px', color: '#0277bd' }}>{kastleIntegrationResults.summary?.duration || 0}ms</p>
                    </div>
                  </div>

                  {/* Success Rate Indicator */}
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Success Rate:</p>
                    <div style={{ 
                      width: '100%', 
                      height: '20px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${kastleIntegrationResults.summary?.total > 0 ? (kastleIntegrationResults.summary.passed / kastleIntegrationResults.summary.total) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: kastleIntegrationResults.success ? '#4CAF50' : '#f44336',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <p style={{ margin: '5px 0 0 0', textAlign: 'center', fontWeight: 'bold' }}>
                      {kastleIntegrationResults.summary?.total > 0 ? 
                        ((kastleIntegrationResults.summary.passed / kastleIntegrationResults.summary.total) * 100).toFixed(1) : 0}%
                    </p>
                  </div>

                  {/* Detailed Test Results */}
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '5px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                      📋 Detailed Test Results ({kastleIntegrationResults.results?.length || 0} tests)
                    </summary>
                    <div style={{ marginTop: '10px' }}>
                      {kastleIntegrationResults.results?.map((test, index) => (
                        <div key={index} style={{ 
                          margin: '8px 0', 
                          padding: '10px', 
                          backgroundColor: test.skipped ? '#fff8e1' : (test.success ? '#e8f5e8' : '#ffebee'), 
                          borderLeft: test.skipped ? '4px solid #ffc107' : (test.success ? '4px solid #4CAF50' : '4px solid #f44336'),
                          borderRadius: '0 5px 5px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                              {test.skipped ? '⚠️' : (test.success ? '✅' : '❌')}
                            </span>
                            <strong style={{ color: test.skipped ? '#e65100' : (test.success ? '#2e7d32' : '#c62828') }}>
                              {test.name}
                            </strong>
                          </div>
                          
                          {test.error && (
                            <p style={{ color: '#c62828', margin: '5px 0', fontStyle: 'italic' }}>
                              Error: {test.error}
                            </p>
                          )}
                          
                          {test.skipped && (
                            <p style={{ color: '#e65100', margin: '5px 0', fontStyle: 'italic' }}>
                              Reason: {test.reason}
                            </p>
                          )}
                          
                          {test.details && (
                            <div style={{ fontSize: '12px', marginTop: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '3px' }}>
                              <details>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Technical Details</summary>
                                <pre style={{ fontSize: '11px', marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(test.details, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      )) || []}
                    </div>
                  </details>

                  {/* Summary Status */}
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    backgroundColor: kastleIntegrationResults.success ? '#c8e6c9' : '#ffcdd2', 
                    borderRadius: '5px',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: 'bold', 
                      color: kastleIntegrationResults.success ? '#1b5e20' : '#b71c1c',
                      fontSize: '16px'
                    }}>
                      {kastleIntegrationResults.success ? 
                        '🚀 Task 3.2 Implementation Ready for Production!' : 
                        '🔧 Review failed tests and fix issues before proceeding to Task 3.3'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 3.3 Testing */}
        <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #ff5722', borderRadius: '10px' }}>
          <h2>📡 Task 3.3: Enhanced Broadcasting Functionality</h2>
          <p style={{ fontSize: '14px', color: '#666', margin: '10px 0' }}>
            Testing enhanced transaction broadcasting with multiple methods, confirmation monitoring, retry mechanisms, and error recovery
          </p>
          
          <button 
            onClick={runEnhancedBroadcastingTests}
            disabled={isTestingEnhancedBroadcasting}
            style={{
              padding: '15px 25px',
              fontSize: '16px',
              backgroundColor: '#ff5722',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingEnhancedBroadcasting ? 'not-allowed' : 'pointer',
              opacity: isTestingEnhancedBroadcasting ? 0.6 : 1,
              color: 'white',
              margin: '10px 0'
            }}
          >
            {isTestingEnhancedBroadcasting ? '🔄 Testing Enhanced Broadcasting...' : '📡 Test Enhanced Broadcasting'}
          </button>

          {isTestingEnhancedBroadcasting && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fff3e0', borderRadius: '5px', color: '#000' }}>
              <p><strong>🔄 Running enhanced broadcasting functionality tests...</strong></p>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <p>🎯 Auto broadcasting method selection</p>
                <p>📡 Multiple broadcasting methods (sendTransactionWithExtraOutputs, sendPskt)</p>
                <p>🔄 Retry mechanism and error recovery</p>
                <p>⏳ Transaction confirmation monitoring</p>
                <p>📊 Enhanced progress callbacks and status tracking</p>
                <p>🛡️ Error handling and validation</p>
                <p>🚀 Complete enhanced broadcasting flow</p>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                📊 Progress updates and detailed logs appear in browser console
              </p>
            </div>
          )}
          
          {enhancedBroadcastingResults && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: enhancedBroadcastingResults.success ? '#e8f5e8' : '#ffebee', 
              borderRadius: '5px', 
              color: '#000',
              border: enhancedBroadcastingResults.success ? '2px solid #4CAF50' : '2px solid #f44336'
            }}>
              <h3 style={{ 
                color: enhancedBroadcastingResults.success ? '#2e7d32' : '#c62828',
                margin: '0 0 15px 0'
              }}>
                {enhancedBroadcastingResults.success ? '🎉 Task 3.3: Enhanced Broadcasting - SUCCESS' : '❌ Task 3.3: Enhanced Broadcasting - FAILED'}
              </h3>
              
              {enhancedBroadcastingResults.error ? (
                <div style={{ padding: '10px', backgroundColor: '#ffcdd2', borderRadius: '5px', marginBottom: '10px' }}>
                  <p><strong>Error:</strong> {enhancedBroadcastingResults.error}</p>
                </div>
              ) : (
                <div>
                  {/* Summary Stats */}
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>📊 Total Tests</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#333' }}>{enhancedBroadcastingResults.summary?.total || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#c8e6c9', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✅ Passed</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#2e7d32' }}>{enhancedBroadcastingResults.summary?.passed || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#ffcdd2', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>❌ Failed</p>
                      <p style={{ margin: 0, fontSize: '24px', color: '#c62828' }}>{enhancedBroadcastingResults.summary?.failed || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#e1f5fe', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>📈 Pass Rate</p>
                      <p style={{ margin: 0, fontSize: '18px', color: '#0277bd' }}>{enhancedBroadcastingResults.summary?.passRate || '0.0'}%</p>
                    </div>
                  </div>

                  {/* Success Rate Indicator */}
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Success Rate:</p>
                    <div style={{ 
                      width: '100%', 
                      height: '20px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${enhancedBroadcastingResults.summary?.passRate || 0}%`,
                        height: '100%',
                        backgroundColor: enhancedBroadcastingResults.success ? '#4CAF50' : '#f44336',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <p style={{ margin: '5px 0 0 0', textAlign: 'center', fontWeight: 'bold' }}>
                      {enhancedBroadcastingResults.summary?.passRate || 0}%
                    </p>
                  </div>

                  {/* Test Categories */}
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🧪 Test Categories:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>📡 Broadcasting Methods</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>Auto selection, sendTransactionWithExtraOutputs, sendPskt</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>🔄 Retry Mechanisms</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>Retry logic, timing, and error recovery</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>⏳ Confirmation Monitoring</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>Transaction status polling and timeout handling</p>
                      </div>
                      <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>📊 Progress Callbacks</p>
                        <p style={{ margin: 0, fontSize: '11px' }}>Real-time status updates and event tracking</p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Test Results */}
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '5px', backgroundColor: '#fff3e0', borderRadius: '5px' }}>
                      📋 Detailed Test Results ({enhancedBroadcastingResults.results?.length || 0} tests)
                    </summary>
                    <div style={{ marginTop: '10px' }}>
                      {enhancedBroadcastingResults.results?.map((test, index) => (
                        <div key={index} style={{ 
                          margin: '8px 0', 
                          padding: '10px', 
                          backgroundColor: test.success ? '#e8f5e8' : '#ffebee', 
                          borderLeft: test.success ? '4px solid #4CAF50' : '4px solid #f44336',
                          borderRadius: '0 5px 5px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                              {test.success ? '✅' : '❌'}
                            </span>
                            <strong style={{ color: test.success ? '#2e7d32' : '#c62828' }}>
                              {test.test}
                            </strong>
                          </div>
                          
                          {test.message && (
                            <p style={{ color: '#333', margin: '5px 0', fontStyle: 'italic' }}>
                              {test.message}
                            </p>
                          )}
                          
                          {test.error && (
                            <p style={{ color: '#c62828', margin: '5px 0', fontWeight: 'bold' }}>
                              Error: {test.error}
                            </p>
                          )}
                          
                          {test.details && (
                            <div style={{ fontSize: '12px', marginTop: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '3px' }}>
                              <details>
                                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Technical Details</summary>
                                <pre style={{ fontSize: '11px', marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(test.details, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      )) || []}
                    </div>
                  </details>

                  {/* Summary Status */}
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    backgroundColor: enhancedBroadcastingResults.success ? '#c8e6c9' : '#ffcdd2', 
                    borderRadius: '5px',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: 'bold', 
                      color: enhancedBroadcastingResults.success ? '#1b5e20' : '#b71c1c',
                      fontSize: '16px'
                    }}>
                      {enhancedBroadcastingResults.success ? 
                        '🚀 Task 3.3 Enhanced Broadcasting Complete - Ready for Task 4.1!' : 
                        '🔧 Review failed tests and fix issues before proceeding'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 3.5.1 - CRITICAL WASM Investigation */}
        <div style={{ margin: '20px 0', padding: '20px', border: '3px solid #dc3545', borderRadius: '10px', backgroundColor: '#fff5f5' }}>
          <h2 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>🚨 Task 3.5.1: CRITICAL WASM Object Investigation</h2>
          <p style={{ fontSize: '14px', color: '#721c24', margin: '10px 0', fontWeight: 'bold' }}>
            EMERGENCY TASK: Deep investigation of _UtxoEntryReference WASM objects to solve transaction ID extraction failure
          </p>
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px', margin: '10px 0', border: '1px solid #f5c6cb' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#721c24' }}>
              <strong>CRITICAL ISSUE:</strong> UTXO transaction ID extraction from Kastle Wallet WASM objects is failing, 
              blocking all transaction broadcasting functionality. This investigation will identify the correct method 
              signatures and access patterns for _UtxoEntryReference objects.
            </p>
          </div>
          
          <button 
            onClick={runWasmInvestigationTest}
            disabled={isTestingWasmInvestigation}
            style={{
              padding: '15px 25px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingWasmInvestigation ? 'not-allowed' : 'pointer',
              opacity: isTestingWasmInvestigation ? 0.6 : 1,
              color: 'white',
              margin: '10px 0',
              fontWeight: 'bold'
            }}
          >
            {isTestingWasmInvestigation ? '🔍 Investigating WASM Objects...' : '🚨 START CRITICAL WASM INVESTIGATION'}
          </button>

          {isTestingWasmInvestigation && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', color: '#000', border: '1px solid #ffeaa7' }}>
              <p><strong>🔍 Running Deep WASM Object Investigation...</strong></p>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <p>🔧 Connecting to Kastle Wallet and fetching real UTXO objects</p>
                <p>🔍 Analyzing _UtxoEntryReference WASM object structure using multiple inspection techniques</p>
                <p>📊 Object.getOwnPropertyNames() and Object.getOwnPropertyDescriptors() analysis</p>
                <p>🔗 Prototype chain analysis with Object.getPrototypeOf()</p>
                <p>⚙️ WASM method enumeration and reflection</p>
                <p>🎯 Transaction ID extraction attempts using multiple strategies</p>
                <p>💡 Generating recommendations for proper UTXO data access</p>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#856404' }}>
                📊 Comprehensive investigation results and debugging data will appear in browser console
              </p>
            </div>
          )}
          
          {wasmInvestigationResults && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: wasmInvestigationResults.status === 'completed' && wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#d4edda' : '#f8d7da', 
              borderRadius: '5px', 
              color: '#000',
              border: wasmInvestigationResults.status === 'completed' && wasmInvestigationResults.summary?.successfulExtractions > 0 ? '2px solid #28a745' : '2px solid #dc3545'
            }}>
              <h3 style={{ 
                color: wasmInvestigationResults.status === 'completed' && wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#155724' : '#721c24',
                margin: '0 0 15px 0'
              }}>
                {wasmInvestigationResults.status === 'completed' && wasmInvestigationResults.summary?.successfulExtractions > 0 ? 
                  '🎉 Task 3.5.1: WASM Investigation - SOLUTION FOUND!' : 
                  '❌ Task 3.5.1: WASM Investigation - ISSUE PERSISTS'}
              </h3>
              
              {wasmInvestigationResults.error ? (
                <div style={{ padding: '10px', backgroundColor: '#f5c6cb', borderRadius: '5px', marginBottom: '10px' }}>
                  <p><strong>Investigation Error:</strong> {wasmInvestigationResults.error}</p>
                </div>
              ) : (
                <div>
                  {/* Investigation Summary */}
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', minWidth: '120px', border: '1px solid #dee2e6' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>🔍 UTXOs Analyzed</p>
                      <p style={{ margin: 0, fontSize: '20px', color: '#333' }}>{wasmInvestigationResults.summary?.totalUtxos || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#d4edda' : '#f8d7da', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>✅ Successful Extractions</p>
                      <p style={{ margin: 0, fontSize: '20px', color: wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#155724' : '#721c24' }}>
                        {wasmInvestigationResults.summary?.successfulExtractions || 0}
                      </p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>❌ Failed Extractions</p>
                      <p style={{ margin: 0, fontSize: '20px', color: '#721c24' }}>{wasmInvestigationResults.summary?.failedExtractions || 0}</p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#e1f5fe', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>📈 Success Rate</p>
                      <p style={{ margin: 0, fontSize: '18px', color: '#0277bd' }}>
                        {wasmInvestigationResults.summary?.successRate ? (wasmInvestigationResults.summary.successRate * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px', minWidth: '120px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>⏱️ Duration</p>
                      <p style={{ margin: 0, fontSize: '16px', color: '#f57c00' }}>{wasmInvestigationResults.duration || 0}ms</p>
                    </div>
                  </div>

                  {/* Success Rate Indicator */}
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Investigation Success Rate:</p>
                    <div style={{ 
                      width: '100%', 
                      height: '25px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{
                        width: `${wasmInvestigationResults.summary?.successRate ? wasmInvestigationResults.summary.successRate * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#28a745' : '#dc3545',
                        transition: 'width 0.5s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {wasmInvestigationResults.summary?.successRate ? (wasmInvestigationResults.summary.successRate * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>

                  {/* Recommended Solution */}
                  {wasmInvestigationResults.summary?.recommendedApproaches && (
                    <div style={{ 
                      marginBottom: '15px', 
                      padding: '12px', 
                      backgroundColor: '#d1ecf1', 
                      borderRadius: '5px',
                      border: '1px solid #b8daff'
                    }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>💡 RECOMMENDED SOLUTION:</h4>
                      <p style={{ margin: '0 0 5px 0', color: '#0c5460', fontWeight: 'bold' }}>
                        Strategy: {wasmInvestigationResults.summary.recommendedApproaches.strategy}
                      </p>
                      <p style={{ margin: '0', color: '#0c5460', fontFamily: 'monospace', fontSize: '13px' }}>
                        Implementation: {wasmInvestigationResults.summary.recommendedApproaches.method || wasmInvestigationResults.summary.recommendedApproaches.property}
                      </p>
                    </div>
                  )}

                  {/* Detailed Investigation Results */}
                  <details style={{ marginTop: '15px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
                      🔬 Detailed WASM Investigation Results ({wasmInvestigationResults.results?.wasmInvestigation?.length || 0} objects analyzed)
                    </summary>
                    <div style={{ marginTop: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                      {wasmInvestigationResults.results?.wasmInvestigation?.map((investigation, index) => (
                        <div key={index} style={{ 
                          margin: '8px 0', 
                          padding: '12px', 
                          backgroundColor: investigation.extractionAttempts?.successful?.length > 0 ? '#d4edda' : '#f8d7da', 
                          borderLeft: investigation.extractionAttempts?.successful?.length > 0 ? '4px solid #28a745' : '4px solid #dc3545',
                          borderRadius: '0 5px 5px 0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                              {investigation.extractionAttempts?.successful?.length > 0 ? '✅' : '❌'}
                            </span>
                            <strong style={{ color: investigation.extractionAttempts?.successful?.length > 0 ? '#155724' : '#721c24' }}>
                              {investigation.objectName}
                            </strong>
                          </div>
                          
                          <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                            <p style={{ margin: '2px 0' }}>
                              <strong>Constructor:</strong> {investigation.analysis?.basicInfo?.constructor}
                            </p>
                            <p style={{ margin: '2px 0' }}>
                              <strong>WASM Object:</strong> {investigation.analysis?.basicInfo?.isWasmObject ? 'Yes' : 'No'}
                            </p>
                            <p style={{ margin: '2px 0' }}>
                              <strong>Methods Found:</strong> {investigation.analysis?.methods?.totalCount || 0}
                            </p>
                            <p style={{ margin: '2px 0' }}>
                              <strong>Extraction Attempts:</strong> {investigation.extractionAttempts?.successful?.length || 0} successful, {investigation.extractionAttempts?.failed?.length || 0} failed
                            </p>
                          </div>

                          {investigation.extractionAttempts?.bestResult && (
                            <div style={{ 
                              padding: '8px', 
                              backgroundColor: 'rgba(40, 167, 69, 0.1)', 
                              borderRadius: '3px',
                              marginTop: '8px'
                            }}>
                              <p style={{ margin: '0', fontSize: '12px', color: '#155724', fontWeight: 'bold' }}>
                                ✅ Working Solution: {investigation.extractionAttempts.bestResult.strategy} - {
                                  typeof investigation.extractionAttempts.bestResult.value === 'object' 
                                    ? JSON.stringify(investigation.extractionAttempts.bestResult.value) 
                                    : investigation.extractionAttempts.bestResult.value
                                }
                              </p>
                            </div>
                          )}

                          {investigation.recommendations?.length > 0 && (
                            <details style={{ marginTop: '8px' }}>
                              <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                                💡 Recommendations ({investigation.recommendations.length})
                              </summary>
                              <div style={{ marginTop: '5px', paddingLeft: '10px' }}>
                                {investigation.recommendations.map((rec, recIndex) => (
                                  <div key={recIndex} style={{ margin: '3px 0', fontSize: '11px' }}>
                                    <span style={{ fontWeight: 'bold', color: rec.priority === 'CRITICAL' ? '#dc3545' : rec.priority === 'HIGH' ? '#fd7e14' : '#6c757d' }}>
                                      [{rec.priority}]
                                    </span> {rec.title}: {rec.description}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )) || []}
                    </div>
                  </details>

                  {/* Action Required Summary */}
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#d1ecf1' : '#f8d7da', 
                    borderRadius: '5px',
                    textAlign: 'center',
                    border: wasmInvestigationResults.summary?.successfulExtractions > 0 ? '1px solid #bee5eb' : '1px solid #f5c6cb'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontWeight: 'bold', 
                      color: wasmInvestigationResults.summary?.successfulExtractions > 0 ? '#0c5460' : '#721c24',
                      fontSize: '16px'
                    }}>
                      {wasmInvestigationResults.summary?.successfulExtractions > 0 ? 
                        '🚀 CRITICAL ISSUE RESOLVED! Proceed to implement the recommended solution in kaspa-utils.js' : 
                        '🔧 INVESTIGATION COMPLETE - Alternative solutions required. Check console for detailed analysis.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task 3.5.4 - PSKT Generation Fix and Validation */}
        <div style={{ margin: '20px 0', padding: '20px', border: '3px solid #28a745', borderRadius: '10px', backgroundColor: '#f8fff9' }}>
          <h2 style={{ color: '#28a745', margin: '0 0 10px 0' }}>🎯 Task 3.5.4: PSKT Generation Fix and Validation</h2>
          <p style={{ fontSize: '14px', color: '#155724', margin: '10px 0', fontWeight: 'bold' }}>
            CRITICAL VALIDATION: Test the fixed WASM UTXO extraction with real wallet data and validate end-to-end PSKT generation
          </p>
          <div style={{ padding: '10px', backgroundColor: '#d4edda', borderRadius: '5px', margin: '10px 0', border: '1px solid #c3e6cb' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#155724' }}>
              <strong>VALIDATION SCOPE:</strong> Tests the complete PSKT generation pipeline with the implemented fix from Task 3.5.3, 
              including UTXO field extraction, PSKT JSON structure validation, and Kastle Wallet compatibility checks.
            </p>
          </div>
          
          <button 
            onClick={runPsktGenerationFixTest}
            disabled={isTestingPsktFix}
            style={{
              padding: '15px 25px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingPsktFix ? 'not-allowed' : 'pointer',
              opacity: isTestingPsktFix ? 0.6 : 1,
              color: 'white',
              margin: '10px 0',
              fontWeight: 'bold'
            }}
          >
            {isTestingPsktFix ? '🔧 Validating PSKT Fix...' : '🎯 VALIDATE PSKT GENERATION FIX'}
          </button>

          {isTestingPsktFix && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', color: '#000', border: '1px solid #ffeaa7' }}>
              <p><strong>🔧 Validating PSKT Generation with Fixed UTXO Extraction...</strong></p>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <p>🔌 Connecting to Kastle Wallet and fetching UTXOs</p>
                <p>🔍 Testing WASM UTXO field extraction with proven JSON method from Task 3.5.3</p>
                <p>🎯 Validating all critical fields: transaction ID, output index, value, script public key</p>
                <p>📋 Generating PSKT JSON with real wallet data</p>
                <p>✅ Validating PSKT structure for Kastle Wallet compatibility</p>
                <p>🧪 Testing complete end-to-end PSKT generation pipeline</p>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#856404' }}>
                📊 Step-by-step validation progress and detailed results will appear in browser console
              </p>
            </div>
          )}
          
          {psktFixResults && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: psktFixResults.overall.success ? '#d4edda' : '#f8d7da', 
              borderRadius: '5px', 
              color: '#000',
              border: psktFixResults.overall.success ? '2px solid #28a745' : '2px solid #dc3545'
            }}>
              <h3 style={{ 
                color: psktFixResults.overall.success ? '#155724' : '#721c24',
                margin: '0 0 15px 0'
              }}>
                {psktFixResults.overall.success ? 
                  '🎉 Task 3.5.4: PSKT Generation Fix - VALIDATION SUCCESSFUL!' : 
                  '❌ Task 3.5.4: PSKT Generation Fix - VALIDATION FAILED'}
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <p style={{ 
                  margin: '0', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: psktFixResults.overall.success ? '#155724' : '#721c24'
                }}>
                  {psktFixResults.overall.message}
                </p>
              </div>

              {/* Test Steps Progress */}
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🧪 Validation Steps Progress:</h4>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <div style={{ padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '5px', minWidth: '100px', border: '1px solid #dee2e6' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>📊 Total Steps</p>
                    <p style={{ margin: 0, fontSize: '20px', color: '#333' }}>{psktFixResults.steps?.length || 0}</p>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#d4edda', borderRadius: '5px', minWidth: '100px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>✅ Passed</p>
                    <p style={{ margin: 0, fontSize: '20px', color: '#155724' }}>
                      {psktFixResults.steps?.filter(s => s.success).length || 0}
                    </p>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#f8d7da', borderRadius: '5px', minWidth: '100px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>❌ Failed</p>
                    <p style={{ margin: 0, fontSize: '20px', color: '#721c24' }}>
                      {psktFixResults.steps?.filter(s => !s.success).length || 0}
                    </p>
                  </div>
                  <div style={{ padding: '8px', backgroundColor: '#e1f5fe', borderRadius: '5px', minWidth: '120px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>📈 Success Rate</p>
                    <p style={{ margin: 0, fontSize: '18px', color: '#0277bd' }}>
                      {psktFixResults.steps?.length > 0 ? 
                        ((psktFixResults.steps.filter(s => s.success).length / psktFixResults.steps.length) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Validation Results */}
              {psktFixResults.overall.success && (
                <div style={{ 
                  marginBottom: '15px', 
                  padding: '12px', 
                  backgroundColor: '#d1ecf1', 
                  borderRadius: '5px',
                  border: '1px solid #b8daff'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>🎯 KEY VALIDATION RESULTS:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✅ WASM UTXO Extraction</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>Transaction IDs successfully extracted</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✅ PSKT JSON Generation</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>Valid structure with all required fields</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✅ Structure Validation</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>Kastle Wallet compatibility confirmed</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>✅ End-to-End Pipeline</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>Complete PSKT flow working</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Step Results */}
              <details style={{ marginTop: '15px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
                  📋 Detailed Validation Steps ({psktFixResults.steps?.length || 0} steps)
                </summary>
                <div style={{ marginTop: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                  {psktFixResults.steps?.map((step, index) => (
                    <div key={index} style={{ 
                      margin: '8px 0', 
                      padding: '10px', 
                      backgroundColor: step.success ? '#d4edda' : '#f8d7da', 
                      borderLeft: step.success ? '4px solid #28a745' : '4px solid #dc3545',
                      borderRadius: '0 5px 5px 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ fontSize: '16px', marginRight: '8px' }}>
                          {step.success ? '✅' : '❌'}
                        </span>
                        <strong style={{ color: step.success ? '#155724' : '#721c24' }}>
                          {step.name}
                        </strong>
                      </div>
                      
                      <p style={{ color: '#333', margin: '5px 0', fontStyle: 'italic' }}>
                        {step.message}
                      </p>
                      
                      {step.error && (
                        <p style={{ color: '#721c24', margin: '5px 0', fontWeight: 'bold' }}>
                          Error: {step.error}
                        </p>
                      )}
                      
                      {step.data && (
                        <details style={{ marginTop: '8px' }}>
                          <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>
                            📊 Technical Data
                          </summary>
                          <pre style={{ fontSize: '10px', marginTop: '5px', whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                            {JSON.stringify(step.data, (key, value) => 
                              typeof value === 'bigint' ? value.toString() + 'n' : value, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )) || []}
                </div>
              </details>

              {/* Final Status and Next Steps */}
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                backgroundColor: psktFixResults.overall.success ? '#d1ecf1' : '#f8d7da', 
                borderRadius: '5px',
                textAlign: 'center',
                border: psktFixResults.overall.success ? '1px solid #bee5eb' : '1px solid #f5c6cb'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontWeight: 'bold', 
                  color: psktFixResults.overall.success ? '#0c5460' : '#721c24',
                  fontSize: '16px'
                }}>
                  {psktFixResults.overall.success ? 
                    '🚀 TASK 3.5.4 COMPLETE! PSKT generation fix validated. Ready for Task 3.5.5: End-to-End Transaction Flow Testing' : 
                    '🔧 TASK 3.5.4 FAILED - Review validation errors and retry after fixes'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Task 5.1-5.6: Node Connection Test Function */}
        <div style={{ margin: '20px 0', padding: '20px', border: '3px solid #6f42c1', borderRadius: '10px', backgroundColor: '#f8f6ff' }}>
          <h2 style={{ color: '#6f42c1', margin: '0 0 10px 0' }}>🔗 Task 5: Node Connection Test Function</h2>
          <p style={{ fontSize: '14px', color: '#4a2c7a', margin: '10px 0', fontWeight: 'bold' }}>
            DEV TOOL: Comprehensive node connectivity validation and debugging diagnostic tool
          </p>
          <div style={{ padding: '10px', backgroundColor: '#e7e3ff', borderRadius: '5px', margin: '10px 0', border: '1px solid #c3b6f7' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#4a2c7a' }}>
              <strong>DIAGNOSTIC SCOPE:</strong> Tests direct connection to Kaspa node, verifies WASM SDK initialization, 
              retrieves comprehensive node information, and validates RPC method availability for debugging purposes.
            </p>
          </div>
          
          <button 
            onClick={runNodeConnectionTest}
            disabled={isTestingNodeConnection}
            style={{
              padding: '15px 25px',
              fontSize: '16px',
              backgroundColor: '#6f42c1',
              border: 'none',
              borderRadius: '5px',
              cursor: isTestingNodeConnection ? 'not-allowed' : 'pointer',
              opacity: isTestingNodeConnection ? 0.6 : 1,
              color: 'white',
              margin: '10px 0',
              fontWeight: 'bold'
            }}
          >
            {isTestingNodeConnection ? '🔗 Testing Node Connection...' : '🔗 TEST NODE CONNECTION'}
          </button>

          {isTestingNodeConnection && (
            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px', color: '#000', border: '1px solid #ffeaa7' }}>
              <p><strong>🔗 Running Node Connection Diagnostic Test...</strong></p>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                <p>🔧 Initializing WASM SDK with your proven working pattern</p>
                <p>🌐 Establishing connection to ws://10.0.0.245:17210 (testnet-10)</p>
                <p>⏱️ Testing connection timing and response latency</p>
                <p>📊 Collecting comprehensive node information (version, network, peers)</p>
                <p>🔄 Checking node sync status and block height</p>
                <p>🔍 Enumerating available RPC methods for debugging</p>
                <p>📋 Generating detailed connectivity report</p>
              </div>
              <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#856404' }}>
                📊 Real-time connection progress and detailed results will appear in browser console
              </p>
            </div>
          )}
          
          {nodeConnectionTestResults && (
            <div style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: nodeConnectionTestResults.success ? '#d4edda' : '#f8d7da', 
              borderRadius: '5px', 
              color: '#000',
              border: nodeConnectionTestResults.success ? '2px solid #28a745' : '2px solid #dc3545'
            }}>
              <h3 style={{ 
                color: nodeConnectionTestResults.success ? '#155724' : '#721c24',
                margin: '0 0 15px 0'
              }}>
                {nodeConnectionTestResults.success ? 
                  '🎉 Task 5: Node Connection Test - CONNECTION SUCCESSFUL!' : 
                  '❌ Task 5: Node Connection Test - CONNECTION FAILED'}
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <p style={{ 
                  margin: '0', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: nodeConnectionTestResults.success ? '#155724' : '#721c24'
                }}>
                  {nodeConnectionTestResults.summary}
                </p>
              </div>

              {/* Connection Metrics */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', minWidth: '120px', border: '1px solid #dee2e6' }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>⏱️ Total Duration</p>
                  <p style={{ margin: 0, fontSize: '20px', color: '#333' }}>{nodeConnectionTestResults.duration}ms</p>
                </div>
                {nodeConnectionTestResults.connectionTime !== null && (
                  <div style={{ padding: '10px', backgroundColor: '#d4edda', borderRadius: '5px', minWidth: '120px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>🔗 Connection Time</p>
                    <p style={{ margin: 0, fontSize: '20px', color: '#155724' }}>{nodeConnectionTestResults.connectionTime}ms</p>
                  </div>
                )}
                {nodeConnectionTestResults.responseTime !== null && (
                  <div style={{ padding: '10px', backgroundColor: '#e1f5fe', borderRadius: '5px', minWidth: '120px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>⚡ Response Time</p>
                    <p style={{ margin: 0, fontSize: '18px', color: '#0277bd' }}>{nodeConnectionTestResults.responseTime}ms</p>
                  </div>
                )}
                {nodeConnectionTestResults.availableMethods && (
                  <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px', minWidth: '120px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>🔧 RPC Methods</p>
                    <p style={{ margin: 0, fontSize: '18px', color: '#f57c00' }}>{nodeConnectionTestResults.availableMethods.length}</p>
                  </div>
                )}
              </div>

              {/* Node Information Display */}
              {nodeConnectionTestResults.nodeInfo && (
                <div style={{ 
                  marginBottom: '15px', 
                  padding: '12px', 
                  backgroundColor: '#d1ecf1', 
                  borderRadius: '5px',
                  border: '1px solid #b8daff'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0c5460' }}>📋 Node Information:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Version:</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>{nodeConnectionTestResults.nodeInfo.version}</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Network:</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>{nodeConnectionTestResults.nodeInfo.network}</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Peer Count:</p>
                      <p style={{ margin: 0, color: '#0c5460' }}>{nodeConnectionTestResults.nodeInfo.peerCount}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Network Status Display */}
              {nodeConnectionTestResults.networkStatus && (
                <div style={{ 
                  marginBottom: '15px', 
                  padding: '12px', 
                  backgroundColor: '#e8f5e8', 
                  borderRadius: '5px',
                  border: '1px solid #c3e6cb'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#155724' }}>🌐 Network Status:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Block Height:</p>
                      <p style={{ margin: 0, color: '#155724' }}>{nodeConnectionTestResults.networkStatus.blockHeight}</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Network State:</p>
                      <p style={{ margin: 0, color: '#155724' }}>{nodeConnectionTestResults.networkStatus.networkState}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sync Status Display */}
              {nodeConnectionTestResults.syncStatus && (
                <div style={{ 
                  marginBottom: '15px', 
                  padding: '12px', 
                  backgroundColor: '#fff3e0', 
                  borderRadius: '5px',
                  border: '1px solid #ffeaa7'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>🔄 Sync Status:</h4>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Synced:</p>
                      <p style={{ margin: 0, color: '#856404' }}>{String(nodeConnectionTestResults.syncStatus.synced)}</p>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Status:</p>
                      <p style={{ margin: 0, color: '#856404' }}>{nodeConnectionTestResults.syncStatus.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Copy to Clipboard Feature */}
              <div style={{ marginBottom: '15px' }}>
                <button
                  onClick={() => {
                    const formattedResults = formatNodeTestResults(nodeConnectionTestResults);
                    navigator.clipboard.writeText(formattedResults).then(() => {
                      alert('📋 Node connection test results copied to clipboard!');
                    }).catch(() => {
                      console.log('📋 Formatted Results:\n\n' + formattedResults);
                      alert('📋 Results displayed in console (clipboard not available)');
                    });
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  📋 Copy Results to Clipboard
                </button>
              </div>

              {/* Errors and Warnings */}
              {(nodeConnectionTestResults.errors?.length > 0 || nodeConnectionTestResults.warnings?.length > 0) && (
                <details style={{ marginTop: '15px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
                    🔍 Diagnostic Details ({nodeConnectionTestResults.errors?.length || 0} errors, {nodeConnectionTestResults.warnings?.length || 0} warnings)
                  </summary>
                  <div style={{ marginTop: '10px' }}>
                    {nodeConnectionTestResults.errors?.map((error, index) => (
                      <div key={index} style={{ 
                        margin: '8px 0', 
                        padding: '10px', 
                        backgroundColor: '#f8d7da', 
                        borderLeft: '4px solid #dc3545',
                        borderRadius: '0 5px 5px 0'
                      }}>
                        <strong style={{ color: '#721c24' }}>❌ Error [{error.type}]:</strong> {error.message}
                        <p style={{ fontSize: '12px', margin: '5px 0 0 0', color: '#721c24' }}>
                          Timestamp: {error.timestamp}
                        </p>
                      </div>
                    )) || []}
                    {nodeConnectionTestResults.warnings?.map((warning, index) => (
                      <div key={index} style={{ 
                        margin: '8px 0', 
                        padding: '10px', 
                        backgroundColor: '#fff3cd', 
                        borderLeft: '4px solid #ffc107',
                        borderRadius: '0 5px 5px 0'
                      }}>
                        <strong style={{ color: '#856404' }}>⚠️ Warning:</strong> {warning}
                      </div>
                    )) || []}
                  </div>
                </details>
              )}

              {/* Final Status */}
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                backgroundColor: nodeConnectionTestResults.success ? '#d1ecf1' : '#f8d7da', 
                borderRadius: '5px',
                textAlign: 'center',
                border: nodeConnectionTestResults.success ? '1px solid #bee5eb' : '1px solid #f5c6cb'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontWeight: 'bold', 
                  color: nodeConnectionTestResults.success ? '#0c5460' : '#721c24',
                  fontSize: '16px'
                }}>
                  {nodeConnectionTestResults.success ? 
                    '🚀 NODE CONNECTION DIAGNOSTIC COMPLETE! All connectivity tests passed successfully.' : 
                    '🔧 NODE CONNECTION DIAGNOSTIC FAILED - Check errors above and verify node configuration'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: '14px', marginTop: '20px', color: '#aaa' }}>
          <p>📝 Check browser console for detailed logs</p>
          <p>🎯 Current Phase: Phase 5 - Node Connection Test Function</p>
          <p>📋 Current Task: Task 5.1-5.6 - Node Connection Test Implementation ⚡ READY FOR TESTING</p>
          <p>🚀 Production interface available in Production Mode</p>
        </div>
      </header>
    </div>
  );
}

export default App;
