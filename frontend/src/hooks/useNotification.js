import { useCallback } from 'react'
import { useToast } from '../components/ToastContainer'

export function useNotification() {
  const { addToast } = useToast()

  const showNotification = useCallback((options) => {
    const {
      title,
      message,
      type = 'info',
      toastDuration = 4000,
      showToast = true
    } = options

    if (showToast) {
      const typeMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
      }

      addToast(title || message, typeMap[type] || 'info', toastDuration)
    }

    return true
  }, [addToast])

  const notifySuccess = useCallback((title, message, options = {}) => {
    showNotification({
      title,
      message,
      type: 'success',
      ...options
    })
  }, [showNotification])

  const notifyError = useCallback((title, message, options = {}) => {
    showNotification({
      title,
      message,
      type: 'error',
      ...options
    })
  }, [showNotification])

  const notifyWarning = useCallback((title, message, options = {}) => {
    showNotification({
      title,
      message,
      type: 'warning',
      ...options
    })
  }, [showNotification])

  const notifyInfo = useCallback((title, message, options = {}) => {
    showNotification({
      title,
      message,
      type: 'info',
      ...options
    })
  }, [showNotification])

  return {
    showNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  }
}
