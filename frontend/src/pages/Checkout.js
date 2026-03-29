import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, ArrowLeft } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Checkout() {
  const { user, login } = useAuth();
  const { cartItems, cartTotal, cartCount } = useCart();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  useEffect(() => { if (!user) login(); }, [user, login]);

  const shipping = cartTotal >= 500 ? 0 : 49;
  const total = cartTotal + shipping;

  const handleCheckout = async () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/checkout`, { origin_url: window.location.origin }, { withCredentials: true });
      if (res.data.url) window.location.href = res.data.url;
    } catch (e) { toast.error(e.response?.data?.detail || 'Checkout failed'); setProcessing(false); }
  };

  if (!user) return null;

  return (
    <div data-testid="checkout-page" className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button data-testid="back-from-checkout" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6"><ArrowLeft size={12} /> Back</button>
        <h1 className="text-2xl tracking-tight font-medium text-white mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Checkout</h1>
        {cartItems.length === 0 ? (
          <div className="text-center py-20"><ShoppingBag size={48} className="text-white/20 mx-auto mb-4" /><p className="text-white/40 mb-4 text-sm">Cart is empty</p><Button onClick={() => navigate('/shop')} variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-lg">Shop</Button></div>
        ) : (
          <div className="space-y-6">
            <div className="border border-white/10 rounded-xl p-6 bg-[#0A0A0A]">
              <h2 className="text-base font-medium mb-4 text-white" style={{ fontFamily: 'var(--font-heading)' }}>Order Summary</h2>
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.product_id} data-testid={`checkout-item-${item.product_id}`} className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white/5 rounded-lg overflow-hidden flex-shrink-0"><img src={item.product?.image} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{item.product?.name}</p><p className="text-xs text-white/40">Qty: {item.quantity}</p></div>
                    <p className="text-sm font-medium text-white">&#8377;{(item.product?.price * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-xs"><span className="text-white/40">Subtotal ({cartCount})</span><span className="text-white">&#8377;{cartTotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-xs"><span className="text-white/40">Shipping</span><span className={shipping === 0 ? 'text-green-400' : 'text-white'}>{shipping === 0 ? 'Free' : `₹${shipping}`}</span></div>
                <div className="border-t border-white/10 pt-2 flex justify-between"><span className="text-sm font-medium text-white">Total</span><span data-testid="checkout-total" className="text-lg font-semibold text-white">&#8377;{total.toLocaleString('en-IN')}</span></div>
              </div>
            </div>
            <Button data-testid="pay-now-btn" onClick={handleCheckout} disabled={processing} className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-14 text-sm font-medium">
              {processing ? 'Processing...' : <><CreditCard size={18} className="mr-2" /> Pay &#8377;{total.toLocaleString('en-IN')}</>}
            </Button>
            <p className="text-[10px] text-white/20 text-center">Secure payment powered by Stripe</p>
          </div>
        )}
      </div>
    </div>
  );
}
