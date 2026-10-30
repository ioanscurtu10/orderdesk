import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'

/**
 * Blocks in-app navigation (React Router's useBlocker) and browser unload while `isDirty` is true.
 * Call `allowLeave()` right before a navigation you trigger yourself after a successful save.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const bypass = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypass.current || !isDirty) return false
    return currentLocation.pathname !== nextLocation.pathname
  })

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      if (bypass.current) return
      e.preventDefault()
      // Legacy browsers need returnValue set to show the prompt.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => blocker.state === 'blocked' && blocker.proceed(),
    stay: () => blocker.state === 'blocked' && blocker.reset(),
    allowLeave: () => {
      bypass.current = true
    },
  }
}
