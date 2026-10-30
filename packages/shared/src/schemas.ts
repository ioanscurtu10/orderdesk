import { z } from 'zod'
import { ORDER_STATUSES } from './types'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), 'validation.date')

export const orderStatusSchema = z.enum(ORDER_STATUSES)

export const orderLineInputSchema = z.object({
  productId: z.string().min(1, 'validation.required'),
  quantity: z.coerce.number().int('validation.integer').positive('validation.positive'),
  unitPrice: z.coerce.number().min(0, 'validation.nonNegative'),
  discountPct: z.coerce.number().min(0, 'validation.percent').max(100, 'validation.percent'),
})

export const orderInputSchema = z
  .object({
    customerId: z.string().min(1, 'validation.required'),
    status: orderStatusSchema,
    orderDate: isoDate,
    dueDate: isoDate,
    notes: z.string().max(500, 'validation.maxLength').default(''),
    lines: z.array(orderLineInputSchema).min(1, 'validation.atLeastOneLine'),
  })
  .refine((o) => o.dueDate >= o.orderDate, {
    message: 'validation.dueAfterOrder',
    path: ['dueDate'],
  })

export type OrderLineInput = z.infer<typeof orderLineInputSchema>
export type OrderInput = z.infer<typeof orderInputSchema>

export const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: orderStatusSchema,
})

export const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

export const loginSchema = z.object({
  email: z.string().email('validation.email'),
  password: z.string().min(1, 'validation.required'),
})
export type LoginInput = z.infer<typeof loginSchema>

/**
 * One CSV row = one order line. Rows sharing the same `ref` are grouped into one order.
 * Keep the column names stable: they are what the import template documents.
 */
export const importRowSchema = z.object({
  ref: z.string().min(1, 'validation.required'),
  customerCode: z.string().min(1, 'validation.required'),
  status: orderStatusSchema,
  orderDate: isoDate,
  dueDate: isoDate,
  sku: z.string().min(1, 'validation.required'),
  quantity: z.coerce.number().int('validation.integer').positive('validation.positive'),
  unitPrice: z.coerce.number().min(0, 'validation.nonNegative'),
  discountPct: z.coerce
    .number()
    .min(0, 'validation.percent')
    .max(100, 'validation.percent')
    .default(0),
  notes: z.string().max(500, 'validation.maxLength').default(''),
})
export type ImportRow = z.infer<typeof importRowSchema>

export const IMPORT_COLUMNS = [
  'ref',
  'customerCode',
  'status',
  'orderDate',
  'dueDate',
  'sku',
  'quantity',
  'unitPrice',
  'discountPct',
  'notes',
] as const

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(10_000).default(25),
  sortBy: z
    .enum([
      'number',
      'customerName',
      'status',
      'orderDate',
      'dueDate',
      'total',
      'lineCount',
      'updatedAt',
    ])
    .default('orderDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().trim().optional(),
  status: z
    .union([orderStatusSchema, z.array(orderStatusSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  customerId: z.string().optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  minTotal: z.coerce.number().optional(),
  maxTotal: z.coerce.number().optional(),
})

export const dashboardRangeSchema = z.object({
  dateFrom: isoDate,
  dateTo: isoDate,
})
