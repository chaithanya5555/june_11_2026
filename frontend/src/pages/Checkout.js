import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, ArrowLeft } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Checkout() {
  const { user, login } = useAuth();
  const { cartItems, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) login();
  }, [user, login]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setProcessing(true);
    try {
      const originUrl = window.location.origin;
      const res = await axios.post(`${API}/checkout`, { origin_url: originUrl }, { withCredentials: true });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Checkout failed');
      setProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div data-testid="checkout-page" className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button data-testid="back-from-checkout" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-950 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>

        <h1 className="text-3xl tracking-tight font-medium text-zinc-950 mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Checkout</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 mb-4">Your cart is empty</p>
            <Button data-testid="checkout-shop-btn" onClick={() => navigate('/shop')} variant="outline" className="rounded-md">Go to Shop</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="border border-zinc-200 rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Order Summary</h2>
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.product_id} data-testid={`checkout-item-${item.product_id}`} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.product?.image} alt={item.product?.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product?.name}</p>
                      <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">${(item.product?.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal ({cartCount} items)</span>
                  <span className="font-medium">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Shipping</span>
                  <span className="font-medium text-emerald-600">{cartTotal >= 50 ? 'Free' : '$4.99'}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="font-medium">Total</span>
                  <span data-testid="checkout-total" className="text-xl font-semibold">${(cartTotal + (cartTotal >= 50 ? 0 : 4.99)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <Button data-testid="pay-now-btn" onClick={handleCheckout} disabled={processing} className="w-full bg-zinc-950 text-white hover:bg-zinc-800 rounded-md h-14 text-sm font-medium">
              {processing ? (
                <span className="flex items-center gap-2">Processing...</span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard size={18} /> Pay ${(cartTotal + (cartTotal >= 50 ? 0 : 4.99)).toFixed(2)}
                </span>
              )}
            </Button>
            <p className="text-xs text-zinc-400 text-center">Secure payment powered by Stripe</p>
          </div>
        )}
      </div>
    </div>
  );
}
