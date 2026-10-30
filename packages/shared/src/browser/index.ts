/**
 * Browser-only helpers (they touch the DOM or pull in heavy client libraries).
 * Imported as "@orderdesk/shared/browser" by the two apps, never by the API.
 */
export * from './download'
export * from './xlsx'
export * from './invoicePdf'
export * from './csvTemplate'
