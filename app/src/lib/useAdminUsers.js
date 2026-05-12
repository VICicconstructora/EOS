// src/lib/useAdminUsers.js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

export function useAdminUsers() {
  const { isDemoMode } = useApp()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (isDemoMode || !supabase) {
      setUsers([
        { id: 'demo-1', email: 'pending1@icconstructora.com', full_name: 'Pendiente Demo 1', role: 'pending', status: 'pending', area: '' },
        { id: 'demo-2', email: 'active1@icconstructora.com',  full_name: 'Activo Demo 1',    role: 'viewer',  status: 'active',  area: 'Operaciones' },
      ])
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err)
    else setUsers(data || [])
    setLoading(false)
  }, [isDemoMode])

  useEffect(() => { load() }, [load])

  async function approveUser({ targetId, role, area, managerId }) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId
        ? { ...u, role, area, status: 'active', manager_id: managerId }
        : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('approve_user', {
      target_id: targetId,
      new_role: role,
      new_area: area,
      new_manager: managerId,
    })
    if (!err) await load()
    return { error: err }
  }

  async function suspendUser(targetId) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'suspended' } : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('suspend_user', { target_id: targetId })
    if (!err) await load()
    return { error: err }
  }

  async function reactivateUser(targetId) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'active' } : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('reactivate_user', { target_id: targetId })
    if (!err) await load()
    return { error: err }
  }

  async function changeUserRole(targetId, newRole) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('change_user_role', {
      target_id: targetId,
      new_role: newRole,
    })
    if (!err) await load()
    return { error: err }
  }

  return { users, loading, error, reload: load, approveUser, suspendUser, reactivateUser, changeUserRole }
}
