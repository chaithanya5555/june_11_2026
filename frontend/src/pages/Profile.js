import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, SignOut } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUS_MAP = {
  pending_payment: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-400' },
  confirmed: { label: 'Confirmed', cls: 'bg-green-500/20 text-green-400' },
  shipped: { label: 'Shipped', cls: 'bg-blue-500/20 text-blue-400' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-400' },
  expired: { label: 'Expired', cls: 'bg-white/10 text-white/40' },
};

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { login(); return; }
    (async () => {
      try { const r = await axios.get(`${API}/orders`, { withCredentials: true }); setOrders(r.data); } catch {}
      setLoading(false);
    })();
  }, [user, login]);

  if (!user) return null;

  return (
    <div data-testid="profile-page" className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          {user.picture ? <img src={user.picture} alt="" className="w-12 h-12 rounded-full" /> : <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg">{user.name?.charAt(0)}</div>}
          <div><h1 data-testid="profile-name" className="text-lg font-medium text-white" style={{ fontFamily: 'var(--font-heading)' }}>{user.name}</h1><p className="text-xs text-white/40">{user.email}</p></div>
          <Button data-testid="profile-logout-btn" onClick={logout} variant="outline" size="sm" className="ml-auto border-white/20 text-white hover:bg-white/5 rounded-lg"><SignOut size={14} className="mr-1" /> Sign Out</Button>
        </div>
        <div className="border-t border-white/10 pt-8">
          <h2 className="text-lg font-medium text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}><Package size={18} className="inline mr-2" /> My Orders</h2>
          {loading ? <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}</div>
          : orders.length === 0 ? (
            <div className="text-center py-16 border border-white/10 rounded-xl"><Package size={40} className="text-white/20 mx-auto mb-3" /><p className="text-sm text-white/40 mb-4">No orders yet</p><Button data-testid="profile-shop-btn" onClick={() => navigate('/shop')} variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-lg">Start Shopping</Button></div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => {
                const st = STATUS_MAP[o.status] || STATUS_MAP.pending_payment;
                return (
                  <div key={o.order_id} data-testid={`order-${o.order_id}`} className="border border-white/10 rounded-xl p-5 bg-[#0A0A0A]">
                    <div className="flex items-center justify-between mb-3">
                      <div><p className="text-sm font-medium text-white font-mono">{o.order_id}</p><p className="text-[10px] text-white/30">{new Date(o.created_at).toLocaleDateString('en-IN')}</p></div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="space-y-1.5">
                      {o.items?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white/5 rounded overflow-hidden flex-shrink-0"><img src={item.image} alt="" className="w-full h-full object-cover" /></div>
                          <span className="text-xs text-white/60 flex-1 truncate">{item.name}</span>
                          <span className="text-[10px] text-white/30">x{item.quantity}</span>
                          <span className="text-xs text-white">&#8377;{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 pt-3 border-t border-white/5">
                      <span className="text-xs text-white/30">Total</span>
                      <span className="text-sm font-semibold text-white">&#8377;{o.total?.toLocaleString('en-IN')}</span>
                    </div>
                    {o.tracking_number && <p className="text-[10px] text-[#007AFF] mt-2">Tracking: {o.tracking_number}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
