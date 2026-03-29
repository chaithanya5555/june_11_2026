import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Heart, Minus, Plus, ShoppingBag, ArrowLeft, Truck, ShieldCheck } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProductDetail() {
  const { id } = useParams();
  const { user, login } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products/${id}`);
        setProduct(res.data);
      } catch { setProduct(null); }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) { login(); return; }
    try {
      await addToCart(product.product_id, quantity);
      toast.success(`Added ${quantity} item(s) to cart`);
    } catch { toast.error('Failed to add to cart'); }
  };

  const handleWishlist = async () => {
    if (!user) { login(); return; }
    try {
      const res = await axios.post(`${API}/wishlist/${product.product_id}`, {}, { withCredentials: true });
      toast.success(res.data.message);
    } catch { toast.error('Failed'); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { login(); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/products/${id}/reviews`, { rating: reviewRating, comment: reviewText }, { withCredentials: true });
      toast.success('Review added!');
      setReviewText('');
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data);
    } catch { toast.error('Failed to submit review'); }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="bg-zinc-200 rounded-lg aspect-square animate-pulse" />
          <div className="space-y-4">
            <div className="h-4 bg-zinc-200 rounded w-1/4" />
            <div className="h-8 bg-zinc-200 rounded w-2/3" />
            <div className="h-6 bg-zinc-200 rounded w-1/4" />
            <div className="h-20 bg-zinc-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-center py-20 text-zinc-500">Product not found</div>;

  return (
    <div data-testid="product-detail-page" className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/shop" data-testid="back-to-shop" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-950 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="bg-zinc-100 rounded-lg overflow-hidden aspect-square">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <p className="text-xs text-zinc-500 uppercase tracking-[0.15em] mb-2">{product.category}</p>
            <h1 data-testid="product-name" className="text-3xl sm:text-4xl tracking-tight font-medium text-zinc-950 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{product.name}</h1>

            <div className="flex items-center gap-3 mb-4">
              {product.avg_rating > 0 && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} weight={i < Math.round(product.avg_rating) ? 'fill' : 'regular'} className={i < Math.round(product.avg_rating) ? 'text-amber-500' : 'text-zinc-300'} />
                  ))}
                  <span className="text-sm text-zinc-500 ml-1">({product.review_count})</span>
                </div>
              )}
            </div>

            <p data-testid="product-price" className="text-2xl font-semibold text-zinc-950 mb-6">${product.price.toFixed(2)}</p>

            <p className="text-sm text-zinc-600 leading-relaxed mb-8">{product.description}</p>

            {/* Quantity & Actions */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-zinc-200 rounded-md">
                <button data-testid="decrease-qty" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-50">
                  <Minus size={14} />
                </button>
                <span data-testid="quantity-display" className="w-10 text-center text-sm">{quantity}</span>
                <button data-testid="increase-qty" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-50">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-8">
              <Button data-testid="add-to-cart-detail-btn" onClick={handleAddToCart} className="flex-1 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md h-12 text-sm font-medium">
                <ShoppingBag size={16} className="mr-2" /> Add to Cart
              </Button>
              <Button data-testid="wishlist-detail-btn" onClick={handleWishlist} variant="outline" className="h-12 rounded-md border-zinc-200 px-4">
                <Heart size={18} />
              </Button>
            </div>

            <div className="space-y-3 text-sm text-zinc-600">
              <div className="flex items-center gap-2"><Truck size={16} className="text-zinc-400" /> Free shipping on orders over $50</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-zinc-400" /> 2-year warranty included</div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <Separator className="my-12" />
        <section data-testid="reviews-section" className="max-w-3xl">
          <h2 className="text-xl sm:text-2xl tracking-tight font-medium text-zinc-950 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Reviews ({product.reviews?.length || 0})
          </h2>

          {/* Review form */}
          {user && (
            <form data-testid="review-form" onSubmit={submitReview} className="mb-8 p-6 bg-zinc-50 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Write a Review</h3>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} type="button" data-testid={`rating-star-${s}`} onClick={() => setReviewRating(s)}>
                    <Star size={20} weight={s <= reviewRating ? 'fill' : 'regular'} className={s <= reviewRating ? 'text-amber-500' : 'text-zinc-300'} />
                  </button>
                ))}
              </div>
              <textarea data-testid="review-input" value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." rows={3} className="w-full px-4 py-2 border border-zinc-200 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 resize-none mb-3" required />
              <Button data-testid="submit-review-btn" type="submit" disabled={submitting} className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md px-6 text-sm">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          )}

          {/* Review list */}
          <div className="space-y-6">
            {product.reviews?.length === 0 && <p className="text-sm text-zinc-500">No reviews yet. Be the first!</p>}
            {product.reviews?.map(review => (
              <div key={review.review_id} data-testid={`review-${review.review_id}`} className="pb-6 border-b border-zinc-100 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  {review.user_picture ? (
                    <img src={review.user_picture} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium">
                      {review.user_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{review.user_name}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} weight={i < review.rating ? 'fill' : 'regular'} className={i < review.rating ? 'text-amber-500' : 'text-zinc-300'} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
