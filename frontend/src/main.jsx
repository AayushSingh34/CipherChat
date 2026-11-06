import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#090d16', color: '#f87171', minHeight: '100vh', padding: '32px', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', marginBottom: '12px' }}>Runtime Render Error Detected:</h2>
          <pre style={{ background: '#111827', padding: '16px', borderRadius: '12px', overflowX: 'auto', border: '1px solid #374151' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '16px', background: '#4f46e5', color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Cache & Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);