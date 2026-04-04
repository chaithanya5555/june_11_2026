import { ShoppingBag, Minus, Plus, Trash, ArrowRight } from '@phosphor-icons/react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

export default function CartSheet() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      // Force login before checkout
      login();
      return;
    }
    navigate('/checkout');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <ShoppingBag size={48} className="text-white/20 mb-4" />
        <p className="text-white/50 mb-4 text-sm text-center">Sign in to view your cart</p>
        <Button data-testid="cart-signin-btn" onClick={login} className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-6">Sign In</Button>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <ShoppingBag size={48} className="text-white/20 mb-4" />
        <p className="text-sm text-white/50 mb-4">Your cart is empty</p>
        <Button data-testid="cart-shop-btn" onClick={() => navigate('/shop')} variant="outline" className="rounded-lg border-white/20 text-white hover:bg-white/5">Start Shopping</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-white/10">
        <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Cart ({cartCount})</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {cartItems.map(item => (
          <div key={item.product_id} data-testid={`cart-item-${item.product_id}`} className="flex gap-3">
            <div className="w-16 h-16 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.product?.image} alt={item.product?.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.product?.name}</p>
              <p className="text-sm text-white/50">&#8377;{item.product?.price.toLocaleString('en-IN')}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <button data-testid={`cart-decrease-${item.product_id}`} onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-6 h-6 rounded border border-white/10 flex items-center justify-center hover:bg-white/5 text-white/60"><Minus size={10} /></button>
                <span className="text-xs w-5 text-center">{item.quantity}</span>
                <button data-testid={`cart-increase-${item.product_id}`} onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-6 h-6 rounded border border-white/10 flex items-center justify-center hover:bg-white/5 text-white/60"><Plus size={10} /></button>
                <button data-testid={`cart-remove-${item.product_id}`} onClick={() => removeFromCart(item.product_id)} className="ml-auto text-white/30 hover:text-red-400"><Trash size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-5 border-t border-white/10 bg-[#0A0A0A]">
        <div className="flex justify-between mb-4">
          <span className="text-sm text-white/50">Subtotal</span>
          <span data-testid="cart-total" className="text-lg font-semibold text-white">&#8377;{cartTotal.toLocaleString('en-IN')}</span>
        </div>
        <Button data-testid="cart-checkout-btn" onClick={handleCheckout} className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-11 text-sm font-medium">
          Checkout <ArrowRight size={14} className="ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
