import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '@/plugins/i18n'
import StatusChip from './StatusChip.vue'

describe('StatusChip', () => {
  it('renders the translated label and the status colour', () => {
    const w = mount(StatusChip, { props: { status: 'shipped' } })
    expect(w.text()).toBe('Shipped')
    expect(w.attributes('data-testid')).toBe('status-chip-shipped')
    expect(w.classes()).toContain('v-chip--variant-tonal')
  })

  it('switches language with the i18n locale', async () => {
    const w = mount(StatusChip, { props: { status: 'cancelled' } })
    i18n.global.locale.value = 'ro'
    await w.vm.$nextTick()
    expect(w.text()).toBe('Anulată')
  })
})
