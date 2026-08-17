import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import logoBlanco from '../../assets/logo-blanco.svg';
import logoNegro from '../../assets/logo-negro.svg';
import { Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';

interface ChangePasswordViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const ChangePasswordView: React.FC<ChangePasswordViewProps> = ({ theme, onToggleTheme }) => {
  const { user, updateInitialPassword, logout } = useAuth();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showToast('Por favor completa ambos campos.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden.', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await updateInitialPassword(newPassword);
    setIsSubmitting(false);

    if (result.success) {
      showToast('¡Contraseña actualizada con éxito!', 'success');
    } else {
      showToast(result.error || 'Error al actualizar contraseña', 'error');
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
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '8px', marginBottom: '4px' }}>
            Crea tu contraseña personal
          </h2>
          <span className="login-subtitle">
            Hola, <strong>{user?.nombre || user?.email}</strong>. Por seguridad, define tu contraseña definitiva (mínimo 6 caracteres).
          </span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Nueva Contraseña</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-input-icon" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="login-input"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Confirmar Nueva Contraseña</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="login-input"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                <span>Guardando Contraseña...</span>
              </>
            ) : (
              <span>Guardar y Entrar a Mixo</span>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={logout}
            style={{ width: '100%', marginTop: '12px', height: '40px', fontSize: '13px', borderRadius: 'var(--border-radius-button)' }}
          >
            Cancelar y Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  );
};
