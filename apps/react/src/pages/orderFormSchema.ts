import { orderInputSchema } from '@orderdesk/shared'
import type { z } from 'zod'

/**
 * The form works with the schema's *input* type (strings from text inputs, numbers from number inputs)
 * and the resolver produces the *output* type (coerced numbers) that the API expects.
 */
export const orderFormSchema = orderInputSchema
export type OrderFormValues = z.input<typeof orderFormSchema>
export type OrderFormOutput = z.output<typeof orderFormSchema>
