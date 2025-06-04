import React, { useState, useEffect, useCallback } from 'react';
import {
  initialiseKaspaFramework,
  getKastleWalletStatus,
  connectKastleWallet,
  disconnectKastleWallet,
  getKaspaWasmModule,
  executeKaspaFiveStepWorkflow
} from './kaspa-utils.js';

const PatternTransactionGenerator = () => {
  // Framework and wallet state
  const [frameworkReady, setFrameworkReady] = useState(false);
  const [walletStatus, setWalletStatus] = useState({
    installed: false,
    connected: false,
    address: null,
    network: null,
    balance: null
  });

  // UI state
  const [activeTab, setActiveTab] = useState('workflow');
  const [logs, setLogs] = useState([]);

  // State for 5-step workflow
  const [workflowRecipientAddress, setWorkflowRecipientAddress] = useState('kaspatest:qr8x7gdgqsdcy92et2g35pfcqkl55sqm89t2qke5y7ark39yyr9zhadpa7m3w');
  const [workflowAmountKas, setWorkflowAmountKas] = useState('1');
  const [workflowFeeKas, setWorkflowFeeKas] = useState('1');
  const [workflowPatternBits, setWorkflowPatternBits] = useState(8);
  const [workflowNetworkId, setWorkflowNetworkId] = useState('testnet-10');
  const [isExecutingFiveStepWorkflow, setIsExecutingFiveStepWorkflow] = useState(false);

  const kaspaWasm = getKaspaWasmModule(); // Get module for kaspaToSompi etc.

  const addLog = useCallback((message, type = 'info', data = null) => {
    console.log(`[PTG_LOG][${type.toUpperCase()}]`, message, data || '');
    setLogs(prevLogs => [
      { id: Date.now() + Math.random(), time: new Date().toISOString(), message, type, data },
      ...prevLogs
    ].slice(0, 200));
  }, []);

  // Initialize framework on mount
  useEffect(() => {
    const initializeFramework = async () => {
      try {
        addLog('Initializing Kaspa Framework (PatternTxGenerator)...', 'info');
        const result = await initialiseKaspaFramework();
        if (result.success) {
          setFrameworkReady(true);
          addLog('✅ Kaspa Framework initialized (PatternTxGenerator)', 'success');
        } else {
          addLog(`❌ Failed to initialize Kaspa Framework (PatternTxGenerator): ${result.error}`, 'error');
        }
      } catch (error) {
        addLog(`❌ Framework initialization error (PatternTxGenerator): ${error.message}`, 'error');
      }
    };
    
    initializeFramework();
  }, []);

  // Check wallet status periodically
  useEffect(() => {
    if (frameworkReady) {
      checkWalletStatus();
      const interval = setInterval(checkWalletStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [frameworkReady]);

  const checkWalletStatus = async () => {
    try {
      const status = await getKastleWalletStatus(false);
      if (status.success) {
        setWalletStatus({
          installed: status.walletInstalled,
          connected: status.connected,
          address: status.walletAddress,
          network: status.network,
          balance: status.balance
        });
      }
    } catch (error) {
      console.warn('Error checking wallet status:', error);
    }
  };

  const handleWalletConnect = async () => {
    try {
      addLog('Connecting to Kastle Wallet (PatternTxGenerator)...', 'info');
      const result = await connectKastleWallet(true);
      if (result.success) {
        addLog('✅ Wallet connected successfully (PatternTxGenerator)', 'success');
        await checkWalletStatus();
      } else {
        addLog(`❌ Wallet connection failed (PatternTxGenerator): ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Wallet connection error (PatternTxGenerator): ${error.message}`, 'error');
    }
  };

  const handleWalletDisconnect = async () => {
    try {
      addLog('Disconnecting from Kastle Wallet (PatternTxGenerator)...', 'info');
      const result = await disconnectKastleWallet(true);
      if (result.success) {
        addLog('✅ Wallet disconnected successfully (PatternTxGenerator)', 'success');
        await checkWalletStatus();
      } else {
        addLog(`❌ Wallet disconnection failed (PatternTxGenerator): ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Wallet disconnection error (PatternTxGenerator): ${error.message}`, 'error');
    }
  };

  const handleExecuteFiveStepWorkflow = async () => {
    addLog('🚀 Initiating 5-Step Kaspa Pattern Transaction Workflow...', 'title');
    setIsExecutingFiveStepWorkflow(true);
    try {
      const amountKasNum = parseFloat(workflowAmountKas);
      const feeKasNum = parseFloat(workflowFeeKas);
      const patternBitsNum = parseInt(workflowPatternBits, 10);

      if (isNaN(amountKasNum) || amountKasNum <= 0) {
        addLog('Invalid Amount to Send. Please enter a positive number.', 'error');
        setIsExecutingFiveStepWorkflow(false);
        return;
      }
      if (isNaN(feeKasNum) || feeKasNum < 0) {
        addLog('Invalid Fee. Please enter a non-negative number.', 'error');
        setIsExecutingFiveStepWorkflow(false);
        return;
      }
      if (isNaN(patternBitsNum) || patternBitsNum < 1 || patternBitsNum > 32) { // Sensible limit for UI
        addLog('Invalid Pattern Bits. Please enter a number between 1 and 32.', 'error');
        setIsExecutingFiveStepWorkflow(false);
        return;
      }
      if (!workflowRecipientAddress.trim()) {
        addLog('Recipient Address is required.', 'error');
        setIsExecutingFiveStepWorkflow(false);
        return;
      }
      if (!workflowNetworkId.trim()) {
        addLog('Network ID is required.', 'error');
        setIsExecutingFiveStepWorkflow(false);
        return;
      }

      const options = {
        network: workflowNetworkId,
        recipientAddress: workflowRecipientAddress,
        amountKas: amountKasNum,
        feeKas: feeKasNum,
        patternBits: patternBitsNum,
        verbose: true, // Or make this configurable
        progressCallback: (progress) => {
          if (progress.type === 'log') {
            addLog(`[Workflow] ${progress.payload.message}`, 'info', progress.payload.data);
          } else if (progress.type === 'status') {
            addLog(`[Workflow Status][Step ${progress.step}] ${progress.message}`, 'system');
          } else if (progress.type === 'broadcast_log') {
            addLog(`[Broadcast] ${progress.payload.stage}: ${progress.payload.status}`, 'info', progress.payload);
          } else if (progress.type === 'final_result'){
            if(progress.payload.success){
              addLog(`✅🎉 Workflow Complete: ${progress.payload.message}`, 'success', progress.payload);
            } else {
              addLog(`❌ Workflow Failed: ${progress.payload.message}`, 'error', progress.payload);
            }
          } else {
            addLog(`[Workflow Update]`, 'info', progress);
          }
        }
      };

      addLog('Executing 5-step workflow with options:', 'info', options);
      const result = await executeKaspaFiveStepWorkflow(options);

      if (result.success) {
        addLog(`✅🎉 5-Step Workflow Succeeded! Final TxID: ${result.finalTxId}`, 'success', result);
        addLog(`   Pattern TxID: ${result.originalPatternTxId}`, 'info');
        addLog(`   TxID Preserved: ${result.txIdPreserved}`, result.txIdPreserved ? 'success' : 'warning');
        addLog(`   Attempts: ${result.attempts}`, 'info');
        addLog(`   Total Duration: ${(result.durationMs / 1000).toFixed(2)}s`, 'info');
      } else {
        addLog(`❌ 5-Step Workflow Failed: ${result.error}`, 'error', result);
      }

      if (result.logs && result.logs.length > 0) {
        addLog('Detailed workflow logs:', 'system');
        result.logs.forEach(logEntry => {
          addLog(`  [${logEntry.time}] ${logEntry.message}`, 'debug', logEntry.data);
        });
      }

    } catch (error) {
      addLog(`❌ Critical error during 5-step workflow execution: ${error.message}`, 'error', { name: error.name, stack: error.stack });
    }
    setIsExecutingFiveStepWorkflow(false);
  };

  const formatBalance = (balance) => {
    if (!balance) return 'N/A';
    // Handle BigInt values from Kastle Wallet
    const balanceNumber = typeof balance === 'bigint' ? Number(balance) : balance;
    return `${(balanceNumber / 100000000).toFixed(8)} KAS`;
  };

  const formatAddress = (address) => {
    if (!address) return 'Not connected';
    return `${address.slice(0, 12)}...${address.slice(-8)}`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '2.5em',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: '0 0 10px 0'
          }}>
            🚀 Kaspa 5-Step Pattern Workflow
          </h1>
          <p style={{ 
            fontSize: '1.1em',
            color: '#666',
            margin: 0
          }}>
            Generate, Sign & Broadcast Kaspa transactions with TxID patterns via Kastle Wallet.
          </p>
        </div>

        {/* Status Bar */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 20px',
          backgroundColor: frameworkReady ? '#e8f5e8' : '#ffebee',
          borderRadius: '10px',
          marginBottom: '30px',
          border: `2px solid ${frameworkReady ? '#4CAF50' : '#f44336'}`
        }}>
          <div>
            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
              Framework: {frameworkReady ? '✅ Ready' : '❌ Not Ready'}
            </span>
            <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
              Wallet: {walletStatus.installed ? '✅ Installed' : '❌ Not Installed'}
            </span>
            <span style={{ fontWeight: 'bold' }}>
              Connection: {walletStatus.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {walletStatus.installed && (
              <>
                {!walletStatus.connected ? (
                  <button
                    onClick={handleWalletConnect}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    onClick={handleWalletDisconnect}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Wallet Info */}
        {walletStatus.connected && (
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '30px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>💰 Wallet Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <strong>Address:</strong> {formatAddress(walletStatus.address)}
              </div>
              <div>
                <strong>Network:</strong> {walletStatus.network || 'Unknown'}
              </div>
              <div>
                <strong>Balance:</strong> {formatBalance(walletStatus.balance)}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex',
          marginBottom: '30px',
          borderBottom: '2px solid #dee2e6'
        }}>
          {[
            { id: 'workflow', label: '⚙️ Create & Broadcast Transaction', icon: '⚙️' },
            { id: 'logs', label: '📋 Activity Logs', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                backgroundColor: activeTab === tab.id ? '#667eea' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#333',
                border: 'none',
                borderRadius: '10px 10px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                marginRight: '5px',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '400px' }}>
          {/* Workflow Tab */}
          {activeTab === 'workflow' && (
            <div>
              <h2 style={{ color: '#333', marginBottom: '20px' }}>⚙️ Create & Broadcast Transaction</h2>
              
              {!walletStatus.connected && (
                <div style={{ 
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  border: '1px solid #ffeaa7'
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    ⚠️ Please connect your Kastle Wallet to run the workflow.
                  </p>
                </div>
              )}

              {/* Workflow Form */}
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Workflow Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                      Network ID:
                    </label>
                    <input
                      type="text"
                      value={workflowNetworkId}
                      onChange={(e) => setWorkflowNetworkId(e.target.value)}
                      placeholder={walletStatus.network === 'kaspa-mainnet' ? 'mainnet' : 'testnet-10'}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                      Recipient Address:
                    </label>
                    <input
                      type="text"
                      value={workflowRecipientAddress}
                      onChange={(e) => setWorkflowRecipientAddress(e.target.value)}
                      placeholder="kaspa:qr... or kaspatest:qr..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                      Amount (KAS):
                    </label>
                    <input
                      type="number"
                      value={workflowAmountKas}
                      onChange={(e) => setWorkflowAmountKas(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                      Fee (KAS):
                    </label>
                    <input
                      type="number"
                      value={workflowFeeKas}
                      onChange={(e) => setWorkflowFeeKas(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                      Pattern Bits:
                    </label>
                    <select
                      value={workflowPatternBits}
                      onChange={(e) => setWorkflowPatternBits(parseInt(e.target.value, 10))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '5px',
                        border: '1px solid #ccc',
                        fontSize: '16px'
                      }}
                    >
                      {[4, 6, 8, 10, 12, 14, 16, 18, 20].map(bits => <option key={bits} value={bits}>{bits} bits</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Workflow Button */}
              <button
                onClick={handleExecuteFiveStepWorkflow}
                disabled={isExecutingFiveStepWorkflow || !frameworkReady || !walletStatus.connected}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: isExecutingFiveStepWorkflow ? '#ccc' : '#ff5722',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: (!walletStatus.connected || isExecutingFiveStepWorkflow || !frameworkReady) ? 'not-allowed' : 'pointer',
                  marginBottom: '20px'
                }}
              >
                {isExecutingFiveStepWorkflow ? '⚙️ Processing...' : '⚙️ Create & Broadcast Transaction'}
              </button>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: '#333', margin: 0 }}>📋 Activity Logs</h2>
                <button
                  onClick={() => setLogs([])}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Logs
                </button>
              </div>
              
              <div style={{ 
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '10px',
                maxHeight: '500px',
                overflowY: 'auto',
                padding: '15px'
              }}>
                {logs.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', margin: 0 }}>No activity logs yet.</p>
                ) : (
                  logs.map(log => (
                    <div
                      key={log.id}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '8px',
                        borderRadius: '5px',
                        backgroundColor: log.type === 'error' ? '#ffebee' : log.type === 'success' ? '#e8f5e8' : '#e3f2fd',
                        borderLeft: `4px solid ${log.type === 'error' ? '#f44336' : log.type === 'success' ? '#4CAF50' : '#2196F3'}`,
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    >
                      <span style={{ color: '#666', marginRight: '10px' }}>[{log.timestamp}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center',
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #dee2e6',
          color: '#666',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            🚀 Powered by Kaspa Network | Built with React & Kastle SDK
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  sectionContainer: {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9'
  },
  sectionTitle: {
    marginTop: '0',
    color: '#333',
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px',
    marginBottom: '15px'
  },
  description: {
    fontSize: '14px',
    color: '#555',
    marginBottom: '20px',
    lineHeight: '1.6'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    marginBottom: '5px',
    fontWeight: 'bold',
    fontSize: '13px',
    color: '#333'
  },
  input: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px'
  },
  inputWide: {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    gridColumn: 'span 2' // Example for wider input if needed in a specific grid setup
  },
  actionButton: {
    padding: '12px 20px',
    fontSize: '16px',
    color: '#fff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginRight: '10px'
  },
  disabledButton: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  }
};

export default PatternTransactionGenerator; 