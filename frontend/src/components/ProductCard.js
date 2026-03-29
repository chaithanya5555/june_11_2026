import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingBag, ShieldCheck, Globe } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductCard({ product }) {
  const { user, login } = useAuth();
  const { addToCart } = useCart();
  const [wishlisted, setWishlisted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleQuickAdd = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { login(); return; }
    try { await addToCart(product.product_id); toast.success('Added to cart'); } catch { toast.error('Failed'); }
  };

  const handleWishlist = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { login(); return; }
    try {
      const res = await axios.post(`${API}/wishlist/${product.product_id}`, {}, { withCredentials: true });
      setWishlisted(res.data.action === 'added');
      toast.success(res.data.message);
    } catch { toast.error('Failed'); }
  };

  const stockLabel = product.stock < 5 ? 'critical' : product.stock <= 20 ? 'low' : 'in';

  return (
    <Link to={`/product/${product.product_id}`} data-testid={`product-card-${product.product_id}`} className="group block">
      <div className="relative bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {!imgLoaded && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
          <img src={product.image} alt={product.name} className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setImgLoaded(true)} />
          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#007AFF]/90 backdrop-blur-sm rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white">
              <Globe size={10} /> Int'l Brand
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white">
              <ShieldCheck size={10} /> Precision Fit
            </span>
          </div>
          {/* Wishlist */}
          <button data-testid={`wishlist-btn-${product.product_id}`} onClick={handleWishlist} className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Heart size={14} weight={wishlisted ? 'fill' : 'bold'} className={wishlisted ? 'text-red-400' : 'text-white'} />
          </button>
          {stockLabel === 'low' && <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-yellow-500/90 rounded text-[9px] font-bold text-black">LOW STOCK</span>}
          {stockLabel === 'critical' && <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-red-500/90 rounded text-[9px] font-bold text-white">ALMOST GONE</span>}
        </div>
        {/* Details */}
        <div className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">{product.category}</p>
          <h3 className="text-sm font-medium text-white mb-2 line-clamp-1" style={{ fontFamily: 'var(--font-heading)' }}>{product.name}</h3>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-semibold text-white">&#8377;{product.price.toLocaleString('en-IN')}</span>
            {product.compare_at_price && (
              <span className="text-xs text-white/40 line-through">&#8377;{product.compare_at_price.toLocaleString('en-IN')}</span>
            )}
            {product.compare_at_price && (
              <span className="text-[10px] font-bold text-green-400">{Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF</span>
            )}
          </div>
          {product.avg_rating > 0 && (
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} size={10} weight={i < Math.round(product.avg_rating) ? 'fill' : 'regular'} className={i < Math.round(product.avg_rating) ? 'text-amber-400' : 'text-white/20'} />)}
              <span className="text-[10px] text-white/40 ml-1">({product.review_count})</span>
            </div>
          )}
          <button data-testid={`quick-add-btn-${product.product_id}`} onClick={handleQuickAdd} className="w-full bg-white/10 hover:bg-[#007AFF] text-white backdrop-blur-md transition-all py-2.5 rounded-lg text-xs font-medium">
            <ShoppingBag size={14} className="inline mr-1.5" weight="bold" /> Quick Add
          </button>
        </div>
      </div>
    </Link>
  );
}
