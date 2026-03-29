import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, SignOut } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_MAP = {
  pending_payment: { label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-100 text-emerald-800' },
  shipped: { label: 'Shipped', color: 'bg-blue-100 text-blue-800' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', color: 'bg-zinc-100 text-zinc-600' },
};

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { login(); return; }
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/orders`, { withCredentials: true });
        setOrders(res.data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchOrders();
  }, [user, login]);

  if (!user) return null;

  return (
    <div data-testid="profile-page" className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User info */}
        <div className="flex items-center gap-4 mb-8">
          {user.picture ? (
            <img src={user.picture} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center text-lg font-medium">
              {user.name?.charAt(0)}
            </div>
          )}
          <div>
            <h1 data-testid="profile-name" className="text-xl font-medium" style={{ fontFamily: 'var(--font-heading)' }}>{user.name}</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
          <Button data-testid="profile-logout-btn" onClick={logout} variant="outline" size="sm" className="ml-auto rounded-md border-zinc-200">
            <SignOut size={14} className="mr-1" /> Sign Out
          </Button>
        </div>

        <Separator className="mb-8" />

        {/* Orders */}
        <h2 className="text-xl font-medium mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
          <Package size={20} className="inline mr-2" /> My Orders
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse border border-zinc-200 rounded-lg p-6">
                <div className="h-4 bg-zinc-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-zinc-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 border border-zinc-200 rounded-lg">
            <Package size={40} className="text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 mb-4">No orders yet</p>
            <Button data-testid="profile-shop-btn" onClick={() => navigate('/shop')} variant="outline" className="rounded-md">Start Shopping</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const st = STATUS_MAP[order.status] || STATUS_MAP.pending_payment;
              return (
                <div key={order.order_id} data-testid={`order-${order.order_id}`} className="border border-zinc-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Order #{order.order_id.slice(-8)}</p>
                      <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="space-y-2">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded overflow-hidden flex-shrink-0">
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-zinc-500">x{item.quantity}</span>
                        <span className="text-sm font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between">
                    <span className="text-sm text-zinc-500">Total</span>
                    <span className="text-sm font-semibold">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
