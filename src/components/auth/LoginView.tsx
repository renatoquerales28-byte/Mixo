import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import logoBlanco from '../../assets/logo-blanco.svg';
import logoNegro from '../../assets/logo-negro.svg';
import { Lock, Mail, Eye, EyeOff, Sun, Moon } from 'lucide-react';

interface LoginViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ theme, onToggleTheme }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor completa todos los campos.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('¡Bienvenido a Mixo!', 'success');
    } else {
      showToast(result.error || 'Error al iniciar sesión', 'error');
    }
  };

  return (
    <div className="login-page">
      {/* Switch circular de tema en esquina superior */}
      <div className="login-theme-toggle">
        <button
          type="button"
          className="sidebar-theme-switch"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="login-card">
        {/* Header con Logo */}
        <div className="login-header">
          <img
            src={theme === 'dark' ? logoBlanco : logoNegro}
            alt="Mixo"
            className="login-logo"
          />
          <span className="login-subtitle">
            Ecosistema de Costeo y Operaciones Gastronómicas
          </span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="login-input-wrapper">
              <Mail size={16} className="login-input-icon" />
              <input
                type="email"
                placeholder="ej. admin@mixo.app"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="login-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Contraseña</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="login-input"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="login-btn-spinner" />
                <span>Iniciando Sesión...</span>
              </>
            ) : (
              <span>Acceder a Mixo</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
