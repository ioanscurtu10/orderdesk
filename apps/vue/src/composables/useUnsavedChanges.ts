import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Blocks in-app navigation (with a confirm dialog) and browser unload while `isDirty` is true.
 * Call `allowLeave()` right before a navigation you trigger yourself after a successful save.
 */
export function useUnsavedChanges(isDirty: Ref<boolean>) {
  const dialogOpen = ref(false)
  let resolver: ((ok: boolean) => void) | null = null
  let bypass = false

  function confirmLeave(): Promise<boolean> {
    dialogOpen.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function answer(ok: boolean): void {
    dialogOpen.value = false
    resolver?.(ok)
    resolver = null
  }

  function allowLeave(): void {
    bypass = true
  }

  onBeforeRouteLeave(async () => {
    if (bypass || !isDirty.value) return true
    return confirmLeave()
  })

  function onBeforeUnload(e: BeforeUnloadEvent): void {
    if (!isDirty.value || bypass) return
    e.preventDefault()
    // Legacy browsers need returnValue set to show the prompt.
    e.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  return { dialogOpen, answer, allowLeave }
}
