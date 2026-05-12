import { useState, useCallback } from 'react'
import { supabase } from './supabase'

const COMPANY_ID = 'ic-constructora'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const loadDocuments = useCallback(async ({ type, userId, indexedOnly = false } = {}) => {
    if (!supabase) return []
    setLoading(true)
    setError(null)

    let query = supabase
      .from('documents')
      .select('*')
      .eq('company_id', COMPANY_ID)
      .order('created_at', { ascending: false })

    if (type)        query = query.eq('type', type)
    if (userId)      query = query.eq('user_id', userId)
    if (indexedOnly) query = query.eq('is_indexed', true)

    const { data, error: err } = await query
    setLoading(false)

    if (err) {
      setError(err.message)
      return []
    }

    setDocuments(data || [])
    return data || []
  }, [])

  const loadIndexedContext = useCallback(async () => {
    // Carga los documentos marcados como is_indexed=true para usar como contexto AI
    return loadDocuments({ indexedOnly: true })
  }, [loadDocuments])

  const saveDocument = useCallback(async ({ slug, title, content, type, category, tags, userId, isIndexed = true }) => {
    if (!supabase) return { success: false, error: 'Supabase no disponible' }

    const { data, error: err } = await supabase
      .from('documents')
      .upsert({
        company_id: COMPANY_ID,
        user_id:    userId || null,
        slug,
        title,
        content,
        type:       type || 'generated',
        category:   category || '',
        tags:       tags || [],
        is_indexed: isIndexed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,slug' })
      .select()
      .single()

    if (err) return { success: false, error: err.message }
    return { success: true, data }
  }, [])

  const completeOnboardingRPC = useCallback(async ({ slug, title, content }) => {
    if (!supabase) return { success: false, error: 'Supabase no disponible' }

    const { error: err } = await supabase.rpc('complete_onboarding', {
      profile_doc_slug:    slug,
      profile_doc_title:   title,
      profile_doc_content: content,
    })

    if (err) return { success: false, error: err.message }
    return { success: true }
  }, [])

  return {
    documents,
    loading,
    error,
    loadDocuments,
    loadIndexedContext,
    saveDocument,
    completeOnboardingRPC,
  }
}
