import { ShoppingBag, Minus, Plus, Trash, ArrowRight } from '@phosphor-icons/react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';

export default function CartSheet() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <ShoppingBag size={48} className="text-zinc-300 mb-4" />
        <p className="text-zinc-500 mb-4 text-center">Sign in to view your cart</p>
        <Button data-testid="cart-signin-btn" onClick={login} className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md px-6">Sign In</Button>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <ShoppingBag size={48} className="text-zinc-300 mb-4" />
        <p className="text-sm text-zinc-500 mb-4">Your cart is empty</p>
        <Button data-testid="cart-shop-btn" onClick={() => navigate('/shop')} variant="outline" className="rounded-md">Start Shopping</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-zinc-100">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Cart ({cartCount})</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {cartItems.map(item => (
          <div key={item.product_id} data-testid={`cart-item-${item.product_id}`} className="flex gap-4">
            <div className="w-20 h-20 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.product?.image} alt={item.product?.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-950 truncate">{item.product?.name}</p>
              <p className="text-sm text-zinc-500">${item.product?.price.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-2">
                <button data-testid={`cart-decrease-${item.product_id}`} onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">
                  <Minus size={12} />
                </button>
                <span className="text-sm w-6 text-center">{item.quantity}</span>
                <button data-testid={`cart-increase-${item.product_id}`} onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">
                  <Plus size={12} />
                </button>
                <button data-testid={`cart-remove-${item.product_id}`} onClick={() => removeFromCart(item.product_id)} className="ml-auto text-zinc-400 hover:text-red-500">
                  <Trash size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 border-t border-zinc-100 bg-white">
        <div className="flex justify-between mb-4">
          <span className="text-sm text-zinc-500">Subtotal</span>
          <span data-testid="cart-total" className="text-lg font-semibold text-zinc-950">${cartTotal.toFixed(2)}</span>
        </div>
        <Button data-testid="cart-checkout-btn" onClick={() => navigate('/checkout')} className="w-full bg-zinc-950 text-white hover:bg-zinc-800 rounded-md h-12 text-sm font-medium">
          Checkout <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
