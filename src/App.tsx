import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import { Toast } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
          <Toast />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
