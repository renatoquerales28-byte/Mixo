import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoBlanco from '../../assets/logo-blanco.svg';
import logoNegro from '../../assets/logo-negro.svg';

interface LandingViewProps {
  theme: 'dark' | 'light';
}

export const LandingView: React.FC<LandingViewProps> = ({ theme }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleLoginClick = () => {
    if (isAuthenticated) {
      navigate('/resumen');
    } else {
      navigate('/iniciar-sesion');
    }
  };

  return (
    <div className="landing-page">
      {/* Botón Iniciar Sesión en la esquina superior derecha */}
      <header className="landing-header">
        <button
          type="button"
          className="btn btn-primary landing-login-btn"
          onClick={handleLoginClick}
        >
          {isAuthenticated ? 'Ir al Panel' : 'Iniciar Sesión'}
        </button>
      </header>

      {/* Centro: Logo de Mixo + Loader Infinito */}
      <main className="landing-content">
        <div className="landing-center-box">
          <img
            src={theme === 'dark' ? logoBlanco : logoNegro}
            alt="Mixo"
            className="landing-logo"
          />

          {/* Loader infinito con el ancho exacto del logo */}
          <div className="landing-loader-track">
            <div className="landing-loader-bar" />
          </div>
        </div>
      </main>
    </div>
  );
};
