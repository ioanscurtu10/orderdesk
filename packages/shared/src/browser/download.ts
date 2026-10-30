/** Trigger a browser download for a Blob. Revokes the object URL afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(
  text: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
): void {
  downloadBlob(new Blob([text], { type: mime }), filename)
}
