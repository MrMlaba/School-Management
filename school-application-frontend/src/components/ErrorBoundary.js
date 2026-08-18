import React from 'react';

// Plain inline styles only — this renders when something in the tree below
// (including theme/context providers) has already thrown, so it can't rely
// on MUI's ThemeProvider or any app context being in a working state.
const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    background: '#f4f6f8',
    color: '#333',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  message: { fontSize: 14, color: '#666', marginBottom: 20, maxWidth: 400 },
  button: {
    padding: '10px 24px',
    background: '#1a73e8',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Unhandled render error:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.wrap}>
          <div style={styles.title}>Something went wrong</div>
          <div style={styles.message}>
            An unexpected error occurred. Reloading the page usually fixes this — if it keeps
            happening, please contact support.
          </div>
          <button style={styles.button} onClick={this.handleReload}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
