import { useState } from 'react';
import { MagnifyingGlass, Package, CheckCircle, Truck, House, Clock } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { key: 'pending_payment', label: 'Placed', icon: <Clock size={18} /> },
  { key: 'confirmed', label: 'Confirmed', icon: <CheckCircle size={18} /> },
  { key: 'shipped', label: 'Shipped', icon: <Truck size={18} /> },
  { key: 'delivered', label: 'Delivered', icon: <House size={18} /> },
];

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await axios.get(`${API}/track/${orderId.trim()}`);
      setOrder(res.data);
    } catch {
      setError('Order not found. Please check your Order ID.');
    }
    setLoading(false);
  };

  const getStepIndex = (status) => {
    const idx = STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div data-testid="track-order-page" className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <Package size={40} className="text-[#007AFF] mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Track Your Order</h1>
          <p className="text-sm text-white/40">Enter your Order ID to see real-time status</p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-2 mb-8">
          <Input data-testid="track-order-input" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order ID (e.g. ORD-A1B2C3D4)" className="flex-1 bg-[#0A0A0A] border-white/10 text-white placeholder:text-white/20 rounded-lg focus:border-[#007AFF]/50" />
          <Button data-testid="track-order-btn" type="submit" disabled={loading} className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-6">
            {loading ? '...' : <><MagnifyingGlass size={16} className="mr-1" /> Track</>}
          </Button>
        </form>

        {error && <div data-testid="track-error" className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{error}</div>}

        {order && (
          <div data-testid="track-result" className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-mono font-medium text-white">{order.order_id}</p>
                <p className="text-[10px] text-white/30">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
              </div>
              <span className="text-sm font-semibold text-white">&#8377;{order.total?.toLocaleString('en-IN')}</span>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                {STEPS.map((step, i) => {
                  const current = getStepIndex(order.status);
                  const isActive = i <= current;
                  const isCancelled = order.status === 'cancelled' || order.status === 'expired';
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${isCancelled ? 'bg-red-500/20 text-red-400' : isActive ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-white/20'}`}>
                        {step.icon}
                      </div>
                      <span className={`text-[9px] ${isActive && !isCancelled ? 'text-white' : 'text-white/30'}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#007AFF] rounded-full transition-all duration-500" style={{ width: `${((getStepIndex(order.status) + 1) / STEPS.length) * 100}%` }} />
              </div>
              {(order.status === 'cancelled' || order.status === 'expired') && (
                <p className="text-xs text-red-400 text-center mt-2">Order {order.status}</p>
              )}
            </div>

            {order.tracking_number && (
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Tracking Number</p>
                <p className="text-sm text-[#007AFF] font-mono">{order.tracking_number}</p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Items</p>
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/5 rounded overflow-hidden flex-shrink-0"><img src={item.image} alt="" className="w-full h-full object-cover" /></div>
                  <span className="text-xs text-white/60 flex-1 truncate">{item.name}</span>
                  <span className="text-[10px] text-white/30">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
