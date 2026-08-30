import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchableSelectProps {
  value?: number | string
  onChange: (value: number | string) => void
  options: { value: number | string; label: string }[]
  placeholder?: string
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Seleccionar...' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Make comparison safe for both string/number types
  const selected = options.find((opt) => String(opt.value) === String(value))
  const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => { setOpen(!open); setSearch('') }}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1">
          <div className="flex items-center border-b px-2 pb-2 pt-2 mb-1">
            <input
              autoFocus
              className="flex h-7 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No hay resultados.</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    String(opt.value) === String(value) ? "bg-accent text-accent-foreground" : ""
                  )}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4 flex-shrink-0", String(opt.value) === String(value) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
