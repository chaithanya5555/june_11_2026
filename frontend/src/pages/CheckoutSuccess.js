import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, Package, WhatsappLogo } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const isDemo = searchParams.get('demo') === 'true';
  const [whatsappConfig, setWhatsappConfig] = useState(null);

  useEffect(() => {
    axios.get(`${API}/admin/whatsapp-config`).then(r => setWhatsappConfig(r.data)).catch(() => {});
  }, []);

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Hi! I just placed an order on Snap Aligner.\nOrder ID: ${orderId}\nPlease confirm my order.`);
    const number = whatsappConfig?.whatsapp_number || '';
    const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <XCircle size={56} weight="fill" className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-medium text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Something went wrong</h1>
          <Link to="/shop"><Button className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg mt-4">Back to Shop</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="checkout-success-page" className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md mx-auto px-4 text-center">
        <CheckCircle size={56} weight="fill" className="text-green-400 mx-auto mb-4" />
        <h1 data-testid="payment-success-title" className="text-xl font-medium text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Payment Successful!</h1>
        {isDemo && <p className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded inline-block mb-3">Demo Mode -- No real payment was charged</p>}
        <p className="text-sm text-white/40 mb-2">Thank you for your order.</p>
        <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mb-6">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Order ID</p>
          <p data-testid="success-order-id" className="text-sm font-mono text-[#007AFF] font-medium">{orderId}</p>
        </div>
        <div className="space-y-2 text-left text-xs text-white/40 mb-6">
          <p>&#10003; Order status updated to <span className="text-green-400">Confirmed</span></p>
          <p>&#10003; Stock automatically deducted from warehouse</p>
          <p>&#10003; Settlement amount calculated (after 2% fee)</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button data-testid="whatsapp-share-btn" onClick={shareOnWhatsApp} className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg h-11">
            <WhatsappLogo size={16} weight="fill" className="mr-1.5" /> Share on WhatsApp
          </Button>
          <Link to="/profile"><Button data-testid="view-orders-btn" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-11"><Package size={14} className="mr-1.5" /> View My Orders</Button></Link>
          <Link to={`/track`}><Button data-testid="track-order-btn" variant="outline" className="w-full border-white/20 text-white hover:bg-white/5 rounded-lg h-11">Track Order</Button></Link>
          <Link to="/shop"><Button data-testid="continue-shopping-btn" variant="ghost" className="w-full text-white/40 hover:text-white h-11">Continue Shopping <ArrowRight size={14} className="ml-1" /></Button></Link>
        </div>
      </div>
    </div>
  );
}
