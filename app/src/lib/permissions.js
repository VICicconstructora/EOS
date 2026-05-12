// src/lib/permissions.js
// Helper central de permisos. Versión Fase 1: solo discrimina admin vs no-admin.
// La matriz completa (viewer/area_manager/cross_leader vs recurso/acción) llega en Plan 4.

export function isActive(profile) {
  return !!profile && profile.status === 'active';
}

export function isAdmin(profile) {
  return isActive(profile) && profile.role === 'admin';
}

export function isPending(profile) {
  return !!profile && profile.status === 'pending';
}

export function isSuspended(profile) {
  return !!profile && profile.status === 'suspended';
}

// Stub para Fase 4. Por ahora cualquier usuario activo puede leer/editar.
export function can(profile, _action, _resource) {
  return isActive(profile);
}
