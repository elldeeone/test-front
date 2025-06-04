import React, { useState } from 'react';
import {
  signPskt,
  buildTransaction,
  getUtxosByAddress,
  kaspaWasm,
  SignType,
  sendTransactionWithExtraOutputs,
  getWalletAddress,
  isWalletInstalled
} from '@forbole/kastle-sdk';

export default function TestSignPSKTDemo() {
  const [pskt, setPskt] = useState("");
  const [txId, setTxId] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get wallet address
  const handleGetAddress = async () => {
    try {
      setError("");
      const walletInstalled = await isWalletInstalled();
      if (!walletInstalled) {
        setError("Kastle Wallet not installed");
        return;
      }
      
      const walletAddress = await getWalletAddress();
      setAddress(walletAddress);
      console.log("✅ Wallet address:", walletAddress);
    } catch (error) {
      console.error("❌ Error getting address:", error);
      setError(error.message);
    }
  };

  // EXACT COPY of handleSign from official example
  const handleSign = async () => {
    if (!address) {
      setError("No address available");
      return;
    }

    try {
      setLoading(true);
      setError("");
      console.log("🔧 Starting EXACT official SDK example flow...");
      
      // EXACT: Get UTXOs and take the last one
      console.log("💰 Getting UTXOs for address:", address);
      const utxos = [(await getUtxosByAddress(address)).pop()];
      console.log("✅ Got UTXO:", utxos[0]);

      // EXACT: Build transaction with self-send of 0.2 KAS
      console.log("🔧 Building transaction with 0.2 KAS to self...");
      const transaction = buildTransaction(utxos, [
        {
          address: address,  // EXACT: send to same address (self-send)
          amount: kaspaWasm.kaspaToSompi("0.2"),  // EXACT: 0.2 KAS
        },
      ]);
      console.log("✅ Transaction built:", transaction);

      // EXACT: Create script options with NoneAnyOneCanPay
      const scriptOptions = utxos.map((_, index) => {
        return {
          inputIndex: index,
          signType: SignType.NoneAnyOneCanPay,  // EXACT: NoneAnyOneCanPay (not Single)
        };
      });
      console.log("✅ Script options created:", scriptOptions);

      // EXACT: Sign the PSKT
      console.log("✍️ Signing PSKT...");
      const signedPskt = await signPskt(transaction, scriptOptions);
      console.log("✅ PSKT signed successfully!");
      console.log("📝 Signed PSKT type:", typeof signedPskt);
      console.log("📝 Signed PSKT:", signedPskt);
      
      setPskt(signedPskt);
      
    } catch (error) {
      console.error("❌ Error signing PSKT:", error);
      setError(`Signing failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // EXACT COPY of handleSendPskt from official example  
  const handleSendPskt = async () => {
    if (!pskt || !address) {
      setError("No PSKT or address available");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      console.log("📡 Starting EXACT official SDK broadcasting...");
      
      // EXACT: Get UTXO (though this line seems unused in original)
      const utxos = (await getUtxosByAddress(address)).pop();
      console.log("💰 Got UTXO for broadcasting:", utxos);

      // EXACT: Send transaction with extra outputs
      console.log("📡 Calling sendTransactionWithExtraOutputs...");
      console.log("🔍 PSKT type being sent:", typeof pskt);
      console.log("🔍 Extra outputs: []");
      console.log("🔍 Priority fee: 0.01 KAS");
      
      const resultTxId = await sendTransactionWithExtraOutputs(
        pskt,                                    // EXACT: signed PSKT
        [],                                     // EXACT: empty extra outputs
        kaspaWasm.kaspaToSompi("0.01")         // EXACT: 0.01 KAS priority fee
      );
      
      console.log("🎉 Transaction sent successfully!");
      console.log("🆔 Transaction ID:", resultTxId);
      setTxId(resultTxId);
      
    } catch (error) {
      console.error("❌ Error sending PSKT:", error);
      setError(`Broadcasting failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>🧪 Test Official SignPSKT Demo (Exact Copy)</h2>
      
      {error && (
        <div style={{ 
          backgroundColor: '#ffe6e6', 
          color: '#d00', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleGetAddress}
          disabled={loading}
          style={{
            backgroundColor: '#6366f1',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '⏳ Getting Address...' : '🔌 Get Wallet Address'}
        </button>
        {address && <span style={{ color: '#059669' }}>✅ Address: {address.substring(0, 20)}...</span>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <textarea
          style={{
            width: '100%',
            height: '200px',
            fontFamily: 'monospace',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px'
          }}
          value={pskt ? JSON.stringify(JSON.parse(pskt), null, 2) : ""}
          onChange={(e) => setPskt(e.target.value)}
          placeholder="PSKT will appear here after signing..."
          rows={10}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleSign}
          disabled={loading || !address}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: (loading || !address) ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? '⏳ Signing...' : '✍️ Sign PSKT (Exact Official Method)'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleSendPskt}
          disabled={loading || !pskt || !address}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: (loading || !pskt || !address) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Broadcasting...' : '📡 Send PSKT (Exact Official Method)'}
        </button>
        
        {txId && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#ecfdf5', 
            borderRadius: '4px',
            color: '#059669'
          }}>
            🎉 <strong>Transaction ID:</strong> {txId}
          </div>
        )}
      </div>

      <div style={{ 
        backgroundColor: '#f3f4f6', 
        padding: '15px', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <h3>📋 Test Plan:</h3>
        <ol>
          <li>✅ Click "Get Wallet Address" to connect</li>
          <li>✅ Click "Sign PSKT" - uses EXACT official example flow</li>
          <li>🎯 Click "Send PSKT" - this is where we expect the WASM error</li>
          <li>📊 Compare results with our pattern implementation</li>
        </ol>
        
        <h4 style={{ marginTop: '15px' }}>🔍 Key Differences from Our Implementation:</h4>
        <ul>
          <li>• Uses <code>SignType.NoneAnyOneCanPay</code> (we changed to Single)</li>
          <li>• Self-send transaction (same address)</li>
          <li>• Fixed 0.2 KAS amount</li>
          <li>• Takes last UTXO instead of all UTXOs</li>
          <li>• No pattern generation logic</li>
        </ul>
      </div>
    </div>
  );
} 