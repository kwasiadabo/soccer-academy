import { createContext, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { ProductCategory, ShopProductImage } from "./shop-api"

export interface CartLine {
  productId: string
  productName: string
  category: ProductCategory
  images: ShopProductImage[]
  variantId: string
  sizeLabel: string
  unitPrice: number
  stockQuantity: number
  quantity: number
}

interface CartContextValue {
  lines: CartLine[]
  addLine: (line: Omit<CartLine, "quantity">, quantity: number) => void
  removeLine: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  totalAmount: number
  totalItems: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  const addLine = (line: Omit<CartLine, "quantity">, quantity: number) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === line.variantId)
      if (existing) {
        return prev.map((l) =>
          l.variantId === line.variantId
            ? { ...l, quantity: Math.min(l.quantity + quantity, l.stockQuantity) }
            : l,
        )
      }
      return [...prev, { ...line, quantity: Math.min(quantity, line.stockQuantity) }]
    })
  }

  const removeLine = (variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId))
  }

  const setQuantity = (variantId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(0, Math.min(quantity, l.stockQuantity)) } : l))
        .filter((l) => l.quantity > 0),
    )
  }

  const clear = () => setLines([])

  const totalAmount = useMemo(() => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [lines])
  const totalItems = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])

  return (
    <CartContext.Provider value={{ lines, addLine, removeLine, setQuantity, clear, totalAmount, totalItems }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
