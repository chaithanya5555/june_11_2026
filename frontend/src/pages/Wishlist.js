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
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/wishlist`, { withCredentials: true });
        setProducts(res.data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [user, login]);

  if (!user) return null;

  return (
    <div data-testid="wishlist-page" className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl tracking-tight font-medium text-zinc-950 mb-8" style={{ fontFamily: 'var(--font-heading)' }}>My Wishlist</h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-zinc-200 rounded-lg aspect-square mb-3" />
                <div className="h-4 bg-zinc-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-zinc-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="text-zinc-300 mx-auto mb-4" />
            <p className="text-sm text-zinc-500 mb-4">Your wishlist is empty</p>
            <Link to="/shop"><Button data-testid="wishlist-shop-btn" variant="outline" className="rounded-md">Explore Products</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => <ProductCard key={p.product_id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
