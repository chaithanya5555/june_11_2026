import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, SpinnerGap } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/checkout/status/${sessionId}`, { withCredentials: true });
        if (res.data.payment_status === 'paid') { setStatus('success'); return; }
        if (res.data.status === 'expired') { setStatus('expired'); return; }
        if (attempts < 5) setTimeout(() => setAttempts(a => a + 1), 2000);
        else setStatus('timeout');
      } catch { setStatus('error'); }
    })();
  }, [sessionId, attempts]);

  return (
    <div data-testid="checkout-success-page" className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md mx-auto px-4 text-center">
        {status === 'checking' && <>
          <SpinnerGap size={48} className="text-[#007AFF] animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-medium text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Processing...</h1>
          <p className="text-sm text-white/40">Confirming your payment.</p>
        </>}
        {status === 'success' && <>
          <CheckCircle size={56} weight="fill" className="text-green-400 mx-auto mb-4" />
          <h1 data-testid="payment-success-title" className="text-xl font-medium text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Payment Successful!</h1>
          <p className="text-sm text-white/40 mb-6">Thank you for your purchase.</p>
          <div className="flex flex-col gap-3">
            <Link to="/profile"><Button data-testid="view-orders-btn" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-11">View Orders <ArrowRight size={14} className="ml-1.5" /></Button></Link>
            <Link to="/shop"><Button data-testid="continue-shopping-btn" variant="outline" className="w-full border-white/20 text-white hover:bg-white/5 rounded-lg h-11">Continue Shopping</Button></Link>
          </div>
        </>}
        {(status === 'error' || status === 'expired' || status === 'timeout') && <>
          <XCircle size={56} weight="fill" className="text-red-400 mx-auto mb-4" />
          <h1 data-testid="payment-failed-title" className="text-xl font-medium text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{status === 'expired' ? 'Payment Expired' : 'Payment Issue'}</h1>
          <p className="text-sm text-white/40 mb-6">{status === 'expired' ? 'Session expired. Try again.' : 'Issue processing payment.'}</p>
          <Link to="/shop"><Button data-testid="back-to-shop-btn" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-11">Back to Shop</Button></Link>
        </>}
      </div>
    </div>
  );
}
