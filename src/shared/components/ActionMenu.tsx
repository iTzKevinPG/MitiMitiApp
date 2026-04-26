import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
  type KeyboardEvent,
} from 'react'
import { MoreVertical } from 'lucide-react'
import { Button } from './ui/button'

type ActionItem = {
  label: string
  onClick: () => void
  icon?: ReactNode
  tone?: 'danger' | 'default'
  dataTour?: string
}

type ActionMenuProps = {
  items: ActionItem[]
  label?: string
  align?: 'left' | 'right'
  renderTrigger?: (options: {
    onClick: (event: MouseEvent<HTMLButtonElement>) => void
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
    isOpen: boolean
    ariaLabel: string
  }) => ReactNode
}

export function ActionMenu({
  items,
  label = 'Acciones',
  align = 'right',
  renderTrigger,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleOutside = (event: Event) => {
      if (!menuRef.current || !triggerRef.current) return
      const target = event.target as Node | null
      if (
        target &&
        !menuRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setOpen((current) => !current)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
    }
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const triggerNode = renderTrigger ? (
    renderTrigger({
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      isOpen: open,
      ariaLabel: label,
    })
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="rounded-full hover:bg-[color:var(--color-surface-muted)]"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  )

  return (
    <div
      className={`relative ${open ? 'z-[60]' : ''}`}
      ref={menuRef}
      data-state={open ? 'open' : 'closed'}
    >
      <div ref={triggerRef}>{triggerNode}</div>
      {open ? (
        <div
          className={`
            absolute z-[60] mt-1.5 w-40 animate-fade-in rounded-xl
            border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)]
            p-1.5 shadow-[var(--shadow-lg)]
            ${align === 'left' ? 'left-0' : 'right-0'}
          `}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`
                flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium
                transition-colors duration-100
                ${
                  item.tone === 'danger'
                    ? 'text-[color:var(--color-accent-danger)] hover:bg-[color:var(--color-danger-bg)]'
                    : 'text-[color:var(--color-text-main)] hover:bg-[color:var(--color-surface-muted)]'
                }
              `}
              data-tour={item.dataTour}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
