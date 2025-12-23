import { useEffect, useCallback } from 'react'

export const useDraftSave = (formName, formData) => {
  const draftKey = `draft_${formName}`
  const draftsListKey = `drafts_list_${formName}`

  const saveDraft = useCallback((data, label = null) => {
    try {
      const draft = {
        id: Date.now(),
        label: label || `Draft - ${new Date().toLocaleString()}`,
        timestamp: new Date().toISOString(),
        data: data
      }
      const drafts = JSON.parse(localStorage.getItem(draftsListKey) || '[]')
      const updatedDrafts = [draft, ...drafts]
      localStorage.setItem(draftKey, JSON.stringify(draft))
      localStorage.setItem(draftsListKey, JSON.stringify(updatedDrafts))
      return draft.id
    } catch (err) {
      console.error('Failed to save draft:', err)
      return null
    }
  }, [draftKey, draftsListKey])

  const getDrafts = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(draftsListKey) || '[]')
    } catch (err) {
      console.error('Failed to get drafts:', err)
      return []
    }
  }, [draftsListKey])

  const loadDraft = useCallback((draftId) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(draftsListKey) || '[]')
      const draft = drafts.find(d => d.id === draftId)
      if (draft) {
        localStorage.setItem(draftKey, JSON.stringify(draft))
        return draft.data
      }
      return null
    } catch (err) {
      console.error('Failed to load draft:', err)
      return null
    }
  }, [draftKey, draftsListKey])

  const deleteDraft = useCallback((draftId) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(draftsListKey) || '[]')
      const updated = drafts.filter(d => d.id !== draftId)
      localStorage.setItem(draftsListKey, JSON.stringify(updated))
      return true
    } catch (err) {
      console.error('Failed to delete draft:', err)
      return false
    }
  }, [draftsListKey])

  const clearCurrentDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey)
      return true
    } catch (err) {
      console.error('Failed to clear draft:', err)
      return false
    }
  }, [draftKey])

  useEffect(() => {
    const timer = setInterval(() => {
      if (formData && Object.keys(formData).length > 0) {
        saveDraft(formData)
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [formData, saveDraft])

  return {
    saveDraft,
    getDrafts,
    loadDraft,
    deleteDraft,
    clearCurrentDraft
  }
}
