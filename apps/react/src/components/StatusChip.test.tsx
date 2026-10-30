import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import i18next from '@/i18n'
import { StatusChip } from './StatusChip'

describe('StatusChip', () => {
  it('renders the translated label with a test id', () => {
    render(<StatusChip status="shipped" />)
    expect(screen.getByTestId('status-chip-shipped')).toHaveTextContent('Shipped')
  })

  it('switches language with the i18n locale', async () => {
    await i18next.changeLanguage('ro')
    render(<StatusChip status="cancelled" />)
    expect(screen.getByTestId('status-chip-cancelled')).toHaveTextContent('Anulată')
  })
})
