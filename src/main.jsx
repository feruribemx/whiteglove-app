import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('WhiteGlove RootErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#071230] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0B1D4A] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <h2 className="text-lg font-serif font-bold text-[#FFB566]">
              Restaurando Vista de WhiteGlove
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ocurrió un ajuste temporal al cargar los datos. Haz clic abajo para recargar el panel sin perder tu información.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-[#FFB566] text-[#0B1D4A] font-bold text-xs cursor-pointer"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
