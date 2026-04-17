import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Heart, Minus, Plus, ShoppingBag, ArrowLeft, Truck, ShieldCheck, Globe, CaretLeft, CaretRight, Play } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
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
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${API}/products/${id}`);
        setProduct(r.data);
        if (r.data.variants?.length > 0) {
          setSelectedVariant(r.data.variants[0]);
        }
      } catch { setProduct(null); }
      setLoading(false);
    })();
  }, [id]);

  const currentPrice = product ? product.price + (selectedVariant?.price_modifier || 0) : 0;

  const handleAddToCart = async () => {
    if (!user) { login(); return; }
    try {
      await addToCart(product.product_id, quantity);
      toast.success(`Added ${quantity} item(s)`);
    } catch { toast.error('Failed'); }
  };

  const handleWishlist = async () => {
    if (!user) { login(); return; }
    try { const r = await axios.post(`${API}/wishlist/${product.product_id}`, {}, { withCredentials: true }); toast.success(r.data.message); } catch { toast.error('Failed'); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { login(); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/products/${id}/reviews`, { rating: reviewRating, comment: reviewText }, { withCredentials: true });
      toast.success('Review added!');
      setReviewText('');
      const r = await axios.get(`${API}/products/${id}`);
      setProduct(r.data);
    } catch { toast.error('Failed'); }
    setSubmitting(false);
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12"><div className="grid lg:grid-cols-2 gap-12"><div className="bg-white/5 rounded-xl aspect-square animate-pulse" /><div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-6 bg-white/5 rounded" />)}</div></div></div>;
  if (!product) return <div className="text-center py-20 text-white/40">Product not found</div>;

  const variants = product.variants || [];
  const variantTypes = [...new Set(variants.map(v => v.type))];

  // Build slides: gallery images + optional video at the end.
  // Fallback: if `images` is missing/empty, use main `image` as a single slide.
  const galleryImages = (product.images && product.images.length > 0) ? product.images : [product.image];
  const slides = [
    ...galleryImages.map((url) => ({ kind: 'image', url })),
    ...(product.video ? [{ kind: 'video', url: product.video }] : []),
  ];
  const goPrev = () => setActiveSlide((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setActiveSlide((i) => (i + 1) % slides.length);
  const onTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 50) goPrev();
    else if (dx < -50) goNext();
    setTouchStartX(null);
  };

  return (
    <div data-testid="product-detail-page" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/shop" data-testid="back-to-shop" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6 transition-colors"><ArrowLeft size={12} /> Back</Link>
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Media Carousel: sliding images + video at the end */}
          <div className="flex flex-col gap-3">
            <div
              data-testid="product-media-carousel"
              className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden aspect-square relative select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {slides.map((slide, idx) => (
                <div
                  key={idx}
                  className={`absolute inset-0 transition-opacity duration-300 ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                >
                  {slide.kind === 'image' ? (
                    <img src={slide.url} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <video
                      src={slide.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover bg-black"
                    />
                  )}
                </div>
              ))}

              {/* Top-left badges */}
              <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#007AFF]/90 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-widest text-white"><Globe size={10} /> Int'l Brand</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-widest text-white"><ShieldCheck size={10} /> Precision Fit</span>
              </div>

              {/* Prev / Next — only if multiple slides */}
              {slides.length > 1 && (
                <>
                  <button
                    data-testid="carousel-prev"
                    onClick={goPrev}
                    aria-label="Previous"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center border border-white/10"
                  >
                    <CaretLeft size={16} weight="bold" />
                  </button>
                  <button
                    data-testid="carousel-next"
                    onClick={goNext}
                    aria-label="Next"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center border border-white/10"
                  >
                    <CaretRight size={16} weight="bold" />
                  </button>
                </>
              )}

              {/* Slide counter */}
              {slides.length > 1 && (
                <div className="absolute bottom-3 right-3 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/80 font-mono">
                  {activeSlide + 1} / {slides.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {slides.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" data-testid="carousel-thumbs">
                {slides.map((slide, idx) => (
                  <button
                    key={idx}
                    data-testid={`carousel-thumb-${idx}`}
                    onClick={() => setActiveSlide(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border transition-colors ${idx === activeSlide ? 'border-[#007AFF]' : 'border-white/10 hover:border-white/30'}`}
                  >
                    {slide.kind === 'image' ? (
                      <img src={slide.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        <Play size={18} weight="fill" className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-2">{product.category}</p>
            <h1 data-testid="product-name" className="text-2xl sm:text-3xl tracking-tight font-medium text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{product.name}</h1>
            {product.avg_rating > 0 && (
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_,i) => <Star key={i} size={14} weight={i < Math.round(product.avg_rating) ? 'fill' : 'regular'} className={i < Math.round(product.avg_rating) ? 'text-amber-400' : 'text-white/20'} />)}
                <span className="text-xs text-white/40 ml-1">({product.review_count} reviews)</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <span data-testid="product-price" className="text-2xl font-semibold text-white">&#8377;{currentPrice.toLocaleString('en-IN')}</span>
              {product.compare_at_price && <span className="text-base text-white/30 line-through">&#8377;{product.compare_at_price.toLocaleString('en-IN')}</span>}
              {product.compare_at_price && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">{Math.round((1 - currentPrice / product.compare_at_price) * 100)}% OFF</span>}
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-6">{product.description}</p>

            {/* Variants */}
            {variantTypes.length > 0 && (
              <div className="mb-6 space-y-3" data-testid="variant-selector">
                {variantTypes.map(type => (
                  <div key={type}>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">{type}</p>
                    <div className="flex flex-wrap gap-2">
                      {variants.filter(v => v.type === type).map(v => (
                        <button
                          key={v.variant_id}
                          data-testid={`variant-${v.variant_id}`}
                          onClick={() => setSelectedVariant(v)}
                          className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
                            selectedVariant?.variant_id === v.variant_id
                              ? 'border-[#007AFF] bg-[#007AFF]/10 text-white'
                              : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                          }`}
                        >
                          {v.value}
                          {v.price_modifier > 0 && <span className="text-[9px] text-white/30 ml-1">+₹{v.price_modifier}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-white/10 rounded-lg">
                <button data-testid="decrease-qty" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5"><Minus size={14} /></button>
                <span data-testid="quantity-display" className="w-10 text-center text-sm">{quantity}</span>
                <button data-testid="increase-qty" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5"><Plus size={14} /></button>
              </div>
              {selectedVariant && (
                <span className="text-[10px] text-white/30">
                  Selected: <span className="text-white/60">{selectedVariant.value}</span>
                  {selectedVariant.stock !== undefined && <span className="ml-2">({selectedVariant.stock} in stock)</span>}
                </span>
              )}
            </div>
            <div className="flex gap-3 mb-8">
              <Button data-testid="add-to-cart-detail-btn" onClick={handleAddToCart} className="flex-1 bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12 text-sm font-medium"><ShoppingBag size={16} className="mr-2" /> Add to Cart</Button>
              <Button data-testid="wishlist-detail-btn" onClick={handleWishlist} variant="outline" className="h-12 rounded-lg border-white/20 text-white hover:bg-white/5 px-4"><Heart size={18} /></Button>
            </div>
            <div className="space-y-2 text-xs text-white/40">
              <div className="flex items-center gap-2"><Truck size={14} className="text-[#007AFF]" /> Free shipping on orders &#8377;500+</div>
              {product.warranty && product.warranty.trim() !== '' && (
                <div data-testid="product-warranty" className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#007AFF]" /> {product.warranty} warranty included</div>
              )}
            </div>
          </div>
        </div>
        {/* Reviews */}
        <div className="mt-16 max-w-3xl border-t border-white/10 pt-12">
          <h2 className="text-xl font-medium text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Reviews ({product.reviews?.length || 0})</h2>
          {user && (
            <form data-testid="review-form" onSubmit={submitReview} className="mb-8 p-5 bg-[#0A0A0A] border border-white/10 rounded-xl">
              <h3 className="text-sm font-medium mb-3 text-white">Write a Review</h3>
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(s => <button key={s} type="button" data-testid={`rating-star-${s}`} onClick={() => setReviewRating(s)}><Star size={18} weight={s <= reviewRating ? 'fill' : 'regular'} className={s <= reviewRating ? 'text-amber-400' : 'text-white/20'} /></button>)}
              </div>
              <textarea data-testid="review-input" value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience..." rows={3} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#007AFF]/50 resize-none mb-3" required />
              <Button data-testid="submit-review-btn" type="submit" disabled={submitting} className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-6 text-sm">{submitting ? 'Submitting...' : 'Submit'}</Button>
            </form>
          )}
          <div className="space-y-5">
            {product.reviews?.length === 0 && <p className="text-sm text-white/30">No reviews yet.</p>}
            {product.reviews?.map(r => (
              <div key={r.review_id} data-testid={`review-${r.review_id}`} className="pb-5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  {r.user_picture ? <img src={r.user_picture} alt="" className="w-7 h-7 rounded-full" /> : <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">{r.user_name?.charAt(0)}</div>}
                  <p className="text-sm font-medium text-white">{r.user_name}</p>
                  <div className="flex items-center gap-0.5 ml-2">{[...Array(5)].map((_,i) => <Star key={i} size={10} weight={i < r.rating ? 'fill' : 'regular'} className={i < r.rating ? 'text-amber-400' : 'text-white/20'} />)}</div>
                </div>
                <p className="text-sm text-white/50">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
