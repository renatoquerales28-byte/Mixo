import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { CustomSelect } from '../CustomSelect';
import { ConfirmModal } from '../ConfirmModal';
import { ShieldCheck, ChefHat, KeyRound, Trash2, Plus } from 'lucide-react';
import type { UserRole, UserProfile } from '../../types/auth';

export const UsuariosTab: React.FC = () => {
  const { user: currentUser, getUsersList, createUserAccount, resetUserPassword, deleteUserAccount } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>(getUsersList);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserProfile | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Formulario nuevo usuario
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRol, setFormRol] = useState<UserRole>('chef');
  const [formCargo, setFormCargo] = useState('');
  const [formTempPassword, setFormTempPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshList = () => {
    setUsers(getUsersList());
  };

  const handleOpenCreateDrawer = () => {
    setFormNombre('');
    setFormEmail('');
    setFormRol('chef');
    setFormCargo('');
    // Generar contraseña temporal sugerida
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setFormTempPassword(`Mixo${randomCode}!`);
    setIsDrawerOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim() || !formEmail.trim() || !formTempPassword.trim()) {
      showToast('Por favor completa todos los campos obligatorios.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const result = await createUserAccount({
      nombre: formNombre.trim(),
      email: formEmail.trim(),
      rol: formRol,
      cargo: formCargo.trim(),
      tempPassword: formTempPassword.trim()
    });
    setIsSubmitting(false);

    if (result.success) {
      showToast(`Usuario ${formNombre} creado con éxito.`, 'success');
      setIsDrawerOpen(false);
      refreshList();
    } else {
      showToast(result.error || 'Error al crear usuario', 'error');
    }
  };

  const handleOpenReset = (u: UserProfile) => {
    setUserToReset(u);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    setNewTempPassword(`Mixo${randomCode}!`);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!userToReset || !newTempPassword.trim()) return;

    const result = await resetUserPassword(userToReset.id, newTempPassword.trim());
    if (result.success) {
      showToast(`Contraseña temporal asignada a ${userToReset.nombre}: ${newTempPassword}`, 'success');
      setIsResetModalOpen(false);
      setUserToReset(null);
      refreshList();
    } else {
      showToast(result.error || 'Error al restablecer contraseña', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      showToast('No puedes eliminar tu propia cuenta activa.', 'error');
      setUserToDelete(null);
      return;
    }

    const result = await deleteUserAccount(userToDelete.id);
    if (result.success) {
      showToast(`Usuario ${userToDelete.nombre} eliminado del equipo.`, 'info');
      setUserToDelete(null);
      refreshList();
    } else {
      showToast(result.error || 'Error al eliminar usuario', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div className="flex-row-between" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Gestión del Equipo
          </h2>
          <p className="text-secondary" style={{ fontSize: '13px', marginTop: '2px' }}>
            Controle los accesos autorizados, asigne roles y genere contraseñas temporales.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreateDrawer}
          style={{ height: '40px', gap: '8px' }}
        >
          <Plus size={16} />
          <span>Nuevo Miembro</span>
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="text-left">Miembro</th>
              <th className="text-left">Correo Electrónico</th>
              <th className="text-center">Rol</th>
              <th className="text-left">Cargo</th>
              <th className="text-center">Estado de Acceso</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '32px' }}>
                  No hay miembros registrados en el equipo.
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td className="text-left" style={{ fontWeight: 500 }}>
                    {u.nombre}
                    {u.id === currentUser?.id && (
                      <span style={{ fontSize: '11px', color: 'var(--color-accent)', marginLeft: '6px' }}>
                        (Tú)
                      </span>
                    )}
                  </td>
                  <td className="text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                    {u.email}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${u.rol === 'admin' ? 'accent' : 'badge-neutral'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {u.rol === 'admin' ? <ShieldCheck size={12} /> : <ChefHat size={12} />}
                      <span>{u.rol === 'admin' ? 'Administrador' : 'Chef'}</span>
                    </span>
                  </td>
                  <td className="text-left" style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    {u.cargo || '—'}
                  </td>
                  <td className="text-center">
                    {u.debeCambiarPassword ? (
                      <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                        Clave temporal pendiente
                      </span>
                    ) : (
                      <span className="badge" style={{ fontSize: '11px', color: '#81c784', borderColor: 'rgba(129, 199, 132, 0.3)' }}>
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => handleOpenReset(u)}
                        title="Asignar nueva clave temporal"
                        style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <KeyRound size={14} />
                        <span>Restablecer</span>
                      </button>

                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          className="btn-action danger"
                          onClick={() => setUserToDelete(u)}
                          title="Eliminar acceso del usuario"
                          style={{ padding: '4px 6px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer para Crear Miembro */}
      <div 
        className={`drawer-backdrop ${isDrawerOpen ? 'open' : ''}`} 
        onClick={() => setIsDrawerOpen(false)}
      />
      <div className={`drawer-panel ${isDrawerOpen ? 'open' : ''}`}>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="drawer-header">
            <h2>Nuevo Miembro del Equipo</h2>
            <button 
              type="button" 
              className="drawer-close-btn" 
              onClick={() => setIsDrawerOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="drawer-body">
            <span className="text-secondary" style={{ fontSize: '13px' }}>
              El usuario recibirá esta contraseña temporal y deberá definir su clave personal al iniciar sesión por primera vez.
            </span>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Nombre Completo</label>
              <input
                type="text"
                placeholder="ej. Juan Pérez"
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Correo Electrónico</label>
              <input
                type="email"
                placeholder="ej. juan@restaurante.com"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Rol en Mixo</label>
              <CustomSelect
                options={[
                  { value: 'chef', label: 'Chef de Cocina (Operación, Recetario, Lotes)' },
                  { value: 'admin', label: 'Administrador (Acceso total financiero y operativo)' }
                ]}
                value={formRol}
                onChange={val => setFormRol(val as UserRole)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Cargo / Puesto (Opcional)</label>
              <input
                type="text"
                placeholder="ej. Chef de Partida, Sous Chef"
                value={formCargo}
                onChange={e => setFormCargo(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Contraseña Temporal Inicial</label>
              <input
                type="text"
                value={formTempPassword}
                onChange={e => setFormTempPassword(e.target.value)}
                required
                style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
              />
              <span className="text-secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Entrégale esta clave al usuario para su primer acceso.
              </span>
            </div>
          </div>

          <div className="drawer-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal para Restablecer Contraseña */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title="Restablecer Contraseña Temporal"
        message={
          userToReset
            ? `Se asignará la clave temporal «${newTempPassword}» a ${userToReset.nombre} (${userToReset.email}). El usuario deberá cambiarla en su siguiente acceso.`
            : ''
        }
        confirmText="Confirmar Restablecimiento"
        cancelText="Cancelar"
        onConfirm={handleConfirmReset}
        onCancel={() => {
          setIsResetModalOpen(false);
          setUserToReset(null);
        }}
      />

      {/* Modal para Confirmar Eliminación */}
      <ConfirmModal
        isOpen={userToDelete !== null}
        title="Eliminar Miembro del Equipo"
        message={
          userToDelete
            ? `¿Estás seguro de que deseas revocar el acceso a ${userToDelete.nombre} (${userToDelete.email})? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar Acceso"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
