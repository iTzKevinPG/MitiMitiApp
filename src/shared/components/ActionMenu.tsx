import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
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
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 })
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Position the portal dropdown relative to the trigger button
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      right: window.innerWidth - rect.right,
    })
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleOutside = (event: Event) => {
      const target = event.target as Node | null
      if (!target) return
      if (menuRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
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
    if (event.key === 'Escape') setOpen(false)
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

  const dropdown = open
    ? createPortal(
        <div
          ref={menuRef}
          className="animate-fade-in fixed z-[9999] w-40 rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-1.5 shadow-[var(--shadow-lg)]"
          style={
            align === 'left'
              ? { top: `${coords.top}px`, left: `${coords.left}px` }
              : { top: `${coords.top}px`, right: `${coords.right}px` }
          }
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-100 ${
                item.tone === 'danger'
                  ? 'text-[color:var(--color-accent-danger)] hover:bg-[color:var(--color-danger-bg)]'
                  : 'text-[color:var(--color-text-main)] hover:bg-[color:var(--color-surface-muted)]'
              }`}
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
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <div ref={triggerRef} data-state={open ? 'open' : 'closed'}>
        {triggerNode}
      </div>
      {dropdown}
    </>
  )
}
