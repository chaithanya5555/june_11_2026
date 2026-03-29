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
    const poll = async () => {
      try {
        const res = await axios.get(`${API}/checkout/status/${sessionId}`, { withCredentials: true });
        if (res.data.payment_status === 'paid') { setStatus('success'); return; }
        if (res.data.status === 'expired') { setStatus('expired'); return; }
        if (attempts < 5) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else { setStatus('timeout'); }
      } catch { setStatus('error'); }
    };
    poll();
  }, [sessionId, attempts]);

  return (
    <div data-testid="checkout-success-page" className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md mx-auto px-4 text-center">
        {status === 'checking' && (
          <>
            <SpinnerGap size={48} className="text-zinc-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-medium mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Processing Payment...</h1>
            <p className="text-sm text-zinc-500">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={56} weight="fill" className="mx-auto mb-4" style={{ color: '#10B981' }} />
            <h1 data-testid="payment-success-title" className="text-2xl font-medium mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Payment Successful!</h1>
            <p className="text-sm text-zinc-500 mb-6">Thank you for your purchase. Your order is confirmed.</p>
            <div className="flex flex-col gap-3">
              <Link to="/profile"><Button data-testid="view-orders-btn" className="w-full bg-zinc-950 text-white hover:bg-zinc-800 rounded-md h-12">View My Orders <ArrowRight size={16} className="ml-2" /></Button></Link>
              <Link to="/shop"><Button data-testid="continue-shopping-btn" variant="outline" className="w-full rounded-md h-12 border-zinc-200">Continue Shopping</Button></Link>
            </div>
          </>
        )}
        {(status === 'error' || status === 'expired' || status === 'timeout') && (
          <>
            <XCircle size={56} weight="fill" className="text-red-500 mx-auto mb-4" />
            <h1 data-testid="payment-failed-title" className="text-2xl font-medium mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {status === 'expired' ? 'Payment Expired' : 'Payment Issue'}
            </h1>
            <p className="text-sm text-zinc-500 mb-6">
              {status === 'expired' ? 'Your payment session has expired.' : 'There was an issue processing your payment.'}
            </p>
            <Link to="/shop"><Button data-testid="back-to-shop-btn" className="w-full bg-zinc-950 text-white hover:bg-zinc-800 rounded-md h-12">Back to Shop</Button></Link>
          </>
        )}
      </div>
    </div>
  );
}
