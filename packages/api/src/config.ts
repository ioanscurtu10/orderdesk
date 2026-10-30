export const config = {
  port: Number(process.env.PORT ?? 4000),
  /** Artificial latency so loading states are visible in the UIs. 0 in tests. */
  delayMs: Number(process.env.API_DELAY_MS ?? 150),
  tokenSecret: process.env.TOKEN_SECRET ?? 'orderdesk-demo-secret-change-me',
  /** Token lifetime in ms. */
  tokenTtlMs: Number(process.env.TOKEN_TTL_MS ?? 8 * 60 * 60 * 1000),
  seed: Number(process.env.SEED ?? 42),
  orderCount: Number(process.env.ORDER_COUNT ?? 10_000),
  customerCount: Number(process.env.CUSTOMER_COUNT ?? 200),
  productCount: Number(process.env.PRODUCT_COUNT ?? 150),
  /**
   * Reseed the dataset every N minutes (0 = never). Used by the public demo so that
   * whatever visitors create, edit or delete is put back to the original state.
   */
  resetEveryMinutes: Number(process.env.RESET_EVERY_MINUTES ?? 0),
}
