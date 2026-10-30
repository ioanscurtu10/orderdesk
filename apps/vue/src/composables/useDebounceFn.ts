import { onBeforeUnmount } from 'vue'

/** Returns a debounced version of `fn`, cancelled automatically when the component unmounts. */
export function useDebounceFn<T extends (...args: never[]) => void>(fn: T, wait = 300): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }) as T
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })
  return debounced
}
