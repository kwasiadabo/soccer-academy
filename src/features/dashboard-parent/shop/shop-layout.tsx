import { Outlet } from "react-router-dom"
import { CartProvider } from "./shop-cart-context"

export function ShopLayout() {
  return (
    <CartProvider>
      <Outlet />
    </CartProvider>
  )
}
