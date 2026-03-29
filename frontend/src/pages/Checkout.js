import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, ShieldCheck, CreditCard, Lightning } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PAYMENT_METHODS = [
  { id: 'upi_phonepe', label: 'PhonePe', sub: 'UPI', color: '#5F259F', icon: '📱', highlight: true },
  { id: 'upi_gpay', label: 'Google Pay', sub: 'UPI', color: '#4285F4', icon: '💳', highlight: true },
  { id: 'paytm', label: 'Paytm', sub: 'Wallet & UPI', color: '#00BAF2', icon: '📲' },
  { id: 'mobikwik', label: 'MobiKwik', sub: 'Wallet & ZIP Pay Later', color: '#E42529', icon: '🔄' },
  { id: 'razorpay', label: 'Razorpay', sub: 'Cards & Netbanking', color: '#528FF0', icon: '💎' },
];

const TRUST_LOGOS = [
  { name: 'PhonePe', bg: '#5F259F' }, { name: 'GPay', bg: '#4285F4' }, { name: 'Paytm', bg: '#00BAF2' },
  { name: 'MobiKwik', bg: '#E42529' }, { name: 'Razorpay', bg: '#528FF0' },
  { name: 'Visa', bg: '#1A1F71' }, { name: 'MC', bg: '#EB001B' }, { name: 'RuPay', bg: '#097A44' },
];

export default function Checkout() {
  const { user, login } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState('upi_phonepe');
  const [processing, setProcessing] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);

  useEffect(() => { if (!user) login(); }, [user, login]);
  useEffect(() => {
    axios.get(`${API}/payment/config`).then(r => setPaymentConfig(r.data)).catch(() => {});
  }, []);

  const shipping = cartTotal >= 500 ? 0 : 49;
  const total = cartTotal + shipping;

  const handlePayment = async () => {
    if (cartItems.length === 0) { toast.error('Cart is empty'); return; }
    setProcessing(true);

    try {
      // Step 1: Create order
      const orderRes = await axios.post(`${API}/payment/create-order`, {
        origin_url: window.location.origin,
        payment_method: selectedMethod
      }, { withCredentials: true });

      const { order_id, razorpay_order_id, amount, key_id, demo_mode, customer_name, customer_email } = orderRes.data;

      // Step 2: Demo mode → simulate payment
      if (demo_mode) {
        toast.info('Demo Mode: Simulating payment...', { duration: 2000 });
        await new Promise(r => setTimeout(r, 1500));
        await axios.post(`${API}/payment/demo-complete`, {
          order_id, razorpay_order_id, payment_method: selectedMethod
        }, { withCredentials: true });
        toast.success('Payment successful! (Demo)');
        navigate(`/checkout/success?order_id=${order_id}&demo=true`);
        return;
      }

      // Step 3: Real Razorpay checkout
      const prefill = { name: customer_name, email: customer_email };
      const methodConfig = {};
      if (selectedMethod === 'upi_phonepe') { methodConfig.upi = { flow: 'intent', apps: ['phonepe'] }; }
      else if (selectedMethod === 'upi_gpay') { methodConfig.upi = { flow: 'intent', apps: ['google_pay'] }; }
      else if (selectedMethod === 'paytm') { methodConfig.wallet = ['paytm']; }
      else if (selectedMethod === 'mobikwik') { methodConfig.wallet = ['mobikwik']; }

      const options = {
        key: key_id,
        amount: amount,
        currency: 'INR',
        name: 'Snap Aligner',
        description: `Order ${order_id}`,
        order_id: razorpay_order_id,
        prefill,
        method: methodConfig,
        theme: { color: '#007AFF' },
        modal: { ondismiss: () => { setProcessing(false); toast.error('Payment cancelled'); } },
        handler: async function (response) {
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order_id
            }, { withCredentials: true });
            toast.success('Payment successful!');
            navigate(`/checkout/success?order_id=${order_id}`);
          } catch {
            toast.error('Payment verification failed');
            setProcessing(false);
          }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Payment failed');
      setProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div data-testid="checkout-page" className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button data-testid="back-from-checkout" onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6"><ArrowLeft size={12} /> Back</button>
        <h1 className="text-2xl tracking-tight font-medium text-white mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Checkout</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20"><ShoppingBag size={48} className="text-white/20 mx-auto mb-4" /><p className="text-white/40 mb-4 text-sm">Cart is empty</p><Button onClick={() => navigate('/shop')} variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-lg">Shop</Button></div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Payment Methods */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h2 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <CreditCard size={18} className="text-[#007AFF]" /> Select Payment Method
                </h2>
                {paymentConfig?.demo_mode && (
                  <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                    <Lightning size={14} /> <span><strong>Demo Mode</strong> — Payments are simulated. Add real Razorpay keys in Admin &gt; Settings.</span>
                  </div>
                )}
                <div className="space-y-2.5">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id} data-testid={`payment-method-${m.id}`} onClick={() => setSelectedMethod(m.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                        selectedMethod === m.id
                          ? 'border-[#007AFF] bg-[#007AFF]/10'
                          : 'border-white/10 bg-[#0A0A0A] hover:border-white/20'
                      }`}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: m.color + '20' }}>{m.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{m.label}</p>
                        <p className="text-[10px] text-white/40">{m.sub}</p>
                      </div>
                      {m.highlight && <span className="text-[9px] font-bold uppercase tracking-widest text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded">UPI</span>}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === m.id ? 'border-[#007AFF]' : 'border-white/20'
                      }`}>
                        {selectedMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF]" />}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedMethod === 'mobikwik' && (
                  <div className="mt-3 px-3 py-2 bg-[#E42529]/10 border border-[#E42529]/20 rounded-lg text-xs text-[#E42529]">
                    ZIP Pay Later available — Buy now, pay in 3 easy installments at 0% interest
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-2">
              <div className="sticky top-20 border border-white/10 rounded-xl p-5 bg-[#0A0A0A]">
                <h2 className="text-base font-medium mb-4 text-white" style={{ fontFamily: 'var(--font-heading)' }}>Order Summary</h2>
                <div className="space-y-3 max-h-52 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.product_id} data-testid={`checkout-item-${item.product_id}`} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden flex-shrink-0"><img src={item.product?.image} alt="" className="w-full h-full object-cover" /></div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-white truncate">{item.product?.name}</p><p className="text-[10px] text-white/40">x{item.quantity}</p></div>
                      <p className="text-xs font-medium text-white">&#8377;{(item.product?.price * item.quantity).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 mt-4 pt-4 space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-white/40">Subtotal ({cartCount})</span><span className="text-white">&#8377;{cartTotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-white/40">Shipping</span><span className={shipping === 0 ? 'text-green-400 text-xs' : 'text-white text-xs'}>{shipping === 0 ? 'Free' : `₹${shipping}`}</span></div>
                  <div className="border-t border-white/10 pt-2 flex justify-between"><span className="text-sm font-medium text-white">Total</span><span data-testid="checkout-total" className="text-lg font-semibold text-white">&#8377;{total.toLocaleString('en-IN')}</span></div>
                </div>
                <Button data-testid="pay-now-btn" onClick={handlePayment} disabled={processing} className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12 text-sm font-medium mt-4">
                  {processing ? 'Processing...' : `Pay ₹${total.toLocaleString('en-IN')}`}
                </Button>
                <div className="flex items-center gap-1 justify-center mt-3"><ShieldCheck size={12} className="text-green-400" /><span className="text-[10px] text-white/30">100% Secure Payment</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Trust Footer */}
        <div data-testid="trust-footer" className="mt-12 border-t border-white/10 pt-6">
          <p className="text-[10px] text-white/20 uppercase tracking-widest text-center mb-3">Trusted Payment Partners</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRUST_LOGOS.map(l => (
              <div key={l.name} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.bg }} />
                <span className="text-[10px] text-white/50 font-medium">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
