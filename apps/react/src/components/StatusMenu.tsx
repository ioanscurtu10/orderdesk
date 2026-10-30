import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import Button from '@mui/material/Button'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import { useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ORDER_STATUSES, statusColors, type OrderStatus } from '@orderdesk/shared'

interface Props {
  label: string
  current?: OrderStatus
  disabled?: boolean
  onSelect: (status: OrderStatus) => void
}

export function StatusMenu({ label, current, disabled, onSelect }: Props) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)
  const close = () => setAnchor(null)
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<SwapHorizIcon />}
        onClick={open}
        disabled={disabled}
        data-testid="status-menu"
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {ORDER_STATUSES.map((s) => (
          <MenuItem
            key={s}
            disabled={s === current}
            data-testid={`status-option-${s}`}
            onClick={() => {
              close()
              onSelect(s)
            }}
          >
            <ListItemIcon>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: statusColors[s],
                  display: 'inline-block',
                }}
              />
            </ListItemIcon>
            <ListItemText>{t(`status.${s}`)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
