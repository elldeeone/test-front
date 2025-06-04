import './App.css';
import React from 'react';
import PatternTransactionGenerator from './PatternTransactionGenerator';

function App() {
  // Only render the production UI
  return (
    <div>
      <PatternTransactionGenerator />
    </div>
  );
}

export default App;
