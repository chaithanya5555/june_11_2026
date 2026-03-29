import { useEffect, useState } from 'react';
import { Heart } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Wishlist() {
  const { user, login } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { login(); return; }
    (async () => {
      try { const r = await axios.get(`${API}/wishlist`, { withCredentials: true }); setProducts(r.data); } catch {}
      setLoading(false);
    })();
  }, [user, login]);

  if (!user) return null;

  return (
    <div data-testid="wishlist-page" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl tracking-tight font-medium text-white mb-8" style={{ fontFamily: 'var(--font-heading)' }}>My Wishlist</h1>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="bg-white/5 rounded-xl aspect-[3/4] animate-pulse" />)}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20"><Heart size={48} className="text-white/20 mx-auto mb-4" /><p className="text-sm text-white/40 mb-4">Wishlist is empty</p><Link to="/shop"><Button data-testid="wishlist-shop-btn" variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-lg">Explore</Button></Link></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">{products.map(p => <ProductCard key={p.product_id} product={p} />)}</div>
        )}
      </div>
    </div>
  );
}
