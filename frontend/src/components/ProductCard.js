import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingBag } from '@phosphor-icons/react';
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

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { login(); return; }
    try {
      await addToCart(product.product_id);
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { login(); return; }
    try {
      const res = await axios.post(`${API}/wishlist/${product.product_id}`, {}, { withCredentials: true });
      setWishlisted(res.data.action === 'added');
      toast.success(res.data.message);
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  return (
    <Link to={`/product/${product.product_id}`} data-testid={`product-card-${product.product_id}`} className="group block">
      <div className="relative bg-zinc-100 rounded-lg overflow-hidden aspect-square mb-3">
        {!imgLoaded && <div className="absolute inset-0 bg-zinc-200 animate-pulse" />}
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button data-testid={`wishlist-btn-${product.product_id}`} onClick={handleWishlist} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
            <Heart size={16} weight={wishlisted ? 'fill' : 'bold'} className={wishlisted ? 'text-red-500' : 'text-zinc-700'} />
          </button>
          <button data-testid={`add-to-cart-btn-${product.product_id}`} onClick={handleAddToCart} className="w-9 h-9 bg-zinc-950 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
            <ShoppingBag size={16} weight="bold" className="text-white" />
          </button>
        </div>
        {product.featured && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium text-white rounded-md" style={{ backgroundColor: '#FF5A00' }}>Featured</span>
        )}
      </div>
      <div className="text-left">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{product.category}</p>
        <h3 className="text-sm font-medium text-zinc-950 mb-1 line-clamp-1" style={{ fontFamily: 'var(--font-heading)' }}>{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-950">${product.price.toFixed(2)}</span>
          {product.avg_rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={12} weight="fill" className="text-amber-500" />
              <span className="text-xs text-zinc-500">{product.avg_rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
