import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-border">
      <table className={cn("w-full border-collapse caption-bottom text-sm", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn("border-t border-border bg-muted/50 font-medium", className)}
      {...props}
    />
  )
}

// A row with an onClick is a navigation target — give it link-like keyboard behavior
// (focusable, Enter/Space activates it) and a visible focus ring, matching how the mouse
// cursor already signals it's clickable. The e.target === e.currentTarget guard keeps a
// nested interactive element (a button/link inside a cell) from also triggering the row's
// own action when it handles its own Enter/Space keydown, since keydown still bubbles here
// even where child click handlers already call stopPropagation for the mouse case.
function TableRow({ className, onClick, onKeyDown, tabIndex, ...props }: React.ComponentProps<"tr">) {
  const isClickable = !!onClick
  return (
    <tr
      tabIndex={isClickable ? (tabIndex ?? 0) : tabIndex}
      onClick={onClick}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!isClickable || e.defaultPrevented || e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.(e as unknown as React.MouseEvent<HTMLTableRowElement>)
        }
      }}
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        isClickable &&
          "cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 bg-muted/40 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("p-3 align-middle", className)} {...props} />
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
