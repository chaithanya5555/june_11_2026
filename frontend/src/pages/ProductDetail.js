import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Heart, Minus, Plus, ShoppingBag, ArrowLeft, Truck, ShieldCheck, Globe, CaretLeft, CaretRight, Play } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Heuristic map from color name → hex (used when variant has no explicit swatch_hex)
const COLOR_HEX = {
  black: '#000000', 'midnight black': '#0b0b0b', 'matte black': '#1a1a1a',
  white: '#ffffff', silver: '#c0c0c0', grey: '#6b6b6b', gray: '#6b6b6b', 'gunmetal grey': '#3a3a3c',
  red: '#ef4444', 'crimson red': '#dc143c', blue: '#2563eb', 'navy blue': '#1e3a8a',
  green: '#16a34a', yellow: '#facc15', orange: '#f97316', purple: '#7c3aed',
  pink: '#ec4899', brown: '#92400e', beige: '#e5d6b8', gold: '#d4af37', rose: '#f43f5e',
  clear: '#e5e7eb', transparent: '#e5e7eb',
};
const colorToHex = (name) => {
  if (!name) return '#888';
  const k = String(name).toLowerCase().trim();
  if (COLOR_HEX[k]) return COLOR_HEX[k];
  // find partial match
  for (const key of Object.keys(COLOR_HEX)) if (k.includes(key)) return COLOR_HEX[key];
  return '#888';
};

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
  const [selections, setSelections] = useState({}); // {axisKey: value} for new-style axes
  const [legacyVariantId, setLegacyVariantId] = useState(null); // for legacy variants without axes
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await axios.get(`${API}/products/${id}`);
        setProduct(r.data);
        setSelections({});
        setLegacyVariantId(null);
        setActiveSlide(0);
      } catch { setProduct(null); }
      setLoading(false);
    })();
  }, [id]);

  // Derive axes (new system) vs legacy grouping
  const variants = product?.variants || [];
  const variantAxes = product?.variant_axes || [];
  const hasAxes = variantAxes.length > 0;

  // Legacy: group by `type` (e.g. "Color", "Finish")
  const legacyGroups = useMemo(() => {
    if (hasAxes) return [];
    const types = [...new Set(variants.map(v => v.type).filter(Boolean))];
    return types.map(t => ({ type: t, values: variants.filter(v => v.type === t) }));
  }, [variants, hasAxes]);

  // Resolve selected variant (new system): find variant whose options match ALL selections
  const selectedVariant = useMemo(() => {
    if (hasAxes) {
      if (variantAxes.some(a => !selections[a.key])) return null;
      return variants.find(v =>
        v.options && variantAxes.every(a => String(v.options[a.key] ?? '') === String(selections[a.key] ?? ''))
      ) || null;
    }
    if (legacyVariantId) {
      return variants.find(v => v.variant_id === legacyVariantId) || null;
    }
    return null;
  }, [hasAxes, variants, variantAxes, selections, legacyVariantId]);

  const hasVariants = variants.length > 0;
  const needsSelection = hasVariants && !selectedVariant;

  const currentPrice = product ? product.price + (selectedVariant?.price_modifier || 0) : 0;

  // Compute available options for each axis given upstream selections (axis order = dependency order)
  const axisOptions = useMemo(() => {
    if (!hasAxes) return {};
    const result = {};
    variantAxes.forEach((axis, idx) => {
      const upstreamKeys = variantAxes.slice(0, idx).map(a => a.key);
      const matching = variants.filter(v =>
        v.options && upstreamKeys.every(k => !selections[k] || String(v.options[k]) === String(selections[k]))
      );
      const vals = [...new Set(matching.map(v => v.options?.[axis.key]).filter(x => x !== undefined && x !== null && x !== ''))];
      result[axis.key] = vals;
    });
    return result;
  }, [hasAxes, variantAxes, variants, selections]);

  // Build slides: variant image (if selected) → gallery → video
  const slides = useMemo(() => {
    if (!product) return [];
    const gallery = (product.images && product.images.length > 0) ? product.images : [product.image];
    const variantImg = selectedVariant?.image;
    const imageSlides = variantImg
      ? [{ kind: 'image', url: variantImg }, ...gallery.filter(u => u !== variantImg).map(url => ({ kind: 'image', url }))]
      : gallery.map(url => ({ kind: 'image', url }));
    return [
      ...imageSlides,
      ...(product.video ? [{ kind: 'video', url: product.video }] : []),
    ];
  }, [product, selectedVariant]);

  // When a color/image-bearing variant is picked, jump carousel to slide 0 (variant image)
  useEffect(() => {
    if (selectedVariant?.image) setActiveSlide(0);
  }, [selectedVariant]);

  // Video autoplay on video slide
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const videoSlideIdx = slides.findIndex(s => s.kind === 'video');
    if (product && product.video && activeSlide === videoSlideIdx) {
      vid.muted = true;
      try { vid.load(); } catch (_) {}
      const tryPlay = () => {
        try { vid.currentTime = 0; } catch (_) {}
        const p = vid.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      };
      if (vid.readyState >= 2) tryPlay();
      else {
        const onCanPlay = () => { tryPlay(); vid.removeEventListener('canplay', onCanPlay); };
        vid.addEventListener('canplay', onCanPlay);
        const t = setTimeout(tryPlay, 600);
        return () => { clearTimeout(t); vid.removeEventListener('canplay', onCanPlay); };
      }
    } else {
      try { vid.pause(); } catch (_) {}
    }
  }, [activeSlide, product, slides]);

  const handleAddToCart = async () => {
    if (!user) { login(); return; }
    if (needsSelection) {
      toast.error('Please select all options first');
      return;
    }
    try {
      await addToCart(product.product_id, quantity, selectedVariant?.variant_id || null);
      const vl = selectedVariant
        ? (selectedVariant.options
            ? Object.values(selectedVariant.options).join(' / ')
            : selectedVariant.value || '')
        : '';
      toast.success(`Added ${quantity} × ${product.name}${vl ? ` (${vl})` : ''}`);
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

  // Pick axis when upstream changes → reset downstream
  const selectAxisValue = (axisIdx, value) => {
    setSelections(prev => {
      const next = { ...prev, [variantAxes[axisIdx].key]: value };
      // Clear downstream axes (they may no longer be valid)
      for (let i = axisIdx + 1; i < variantAxes.length; i++) delete next[variantAxes[i].key];
      return next;
    });
  };

  // Determine UI style for an axis. Auto-detect: if legacy type contains "color" → swatch
  const axisUi = (axis) => {
    const explicit = axis.ui;
    if (explicit) return explicit;
    const k = (axis.key || axis.label || '').toLowerCase();
    if (k.includes('color') || k.includes('colour')) return 'swatch';
    return 'buttons';
  };

  // Variant detail lookup for a specific option value on an axis (used by swatches to resolve image/stock)
  const variantForAxisValue = (axisIdx, value) => {
    const upstream = variantAxes.slice(0, axisIdx).map(a => a.key);
    return variants.find(v =>
      v.options &&
      upstream.every(k => String(v.options[k]) === String(selections[k])) &&
      String(v.options[variantAxes[axisIdx].key]) === String(value)
    );
  };

  return (
    <div data-testid="product-detail-page" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/shop" data-testid="back-to-shop" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6 transition-colors"><ArrowLeft size={12} /> Back</Link>
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Media Carousel */}
          <div className="flex flex-col gap-3">
            <div
              data-testid="product-media-carousel"
              className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden aspect-square relative select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {slides.map((slide, idx) => (
                <div
                  key={`${slide.kind}-${slide.url}-${idx}`}
                  className={`absolute inset-0 transition-opacity duration-300 ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                >
                  {slide.kind === 'image' ? (
                    <img src={slide.url} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <video
                      ref={videoRef}
                      src={slide.url}
                      controls
                      muted
                      playsInline
                      loop
                      preload="auto"
                      className="w-full h-full object-cover bg-black"
                    />
                  )}
                </div>
              ))}

              <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#007AFF]/90 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-widest text-white"><Globe size={10} /> Int'l Brand</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[9px] font-bold uppercase tracking-widest text-white"><ShieldCheck size={10} /> Precision Fit</span>
              </div>

              {slides.length > 1 && (
                <>
                  <button data-testid="carousel-prev" onClick={goPrev} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center border border-white/10">
                    <CaretLeft size={16} weight="bold" />
                  </button>
                  <button data-testid="carousel-next" onClick={goNext} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white flex items-center justify-center border border-white/10">
                    <CaretRight size={16} weight="bold" />
                  </button>
                </>
              )}

              {slides.length > 1 && (
                <div className="absolute bottom-3 right-3 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white/80 font-mono">
                  {activeSlide + 1} / {slides.length}
                </div>
              )}
            </div>

            {slides.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" data-testid="carousel-thumbs">
                {slides.map((slide, idx) => (
                  <button
                    key={`thumb-${slide.kind}-${slide.url}-${idx}`}
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

            {/* NEW-STYLE AXES (customizable cascading dropdowns/swatches) */}
            {hasAxes && (
              <div className="mb-6 space-y-4" data-testid="variant-axes-selector">
                {variantAxes.map((axis, axisIdx) => {
                  const options = axisOptions[axis.key] || [];
                  const upstreamReady = variantAxes.slice(0, axisIdx).every(a => selections[a.key]);
                  const ui = axisUi(axis);
                  return (
                    <div key={axis.key} data-testid={`axis-${axis.key}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{axis.label || axis.key}</p>
                        {selections[axis.key] && <p className="text-[10px] text-white/60">{selections[axis.key]}</p>}
                      </div>

                      {!upstreamReady ? (
                        <p className="text-[11px] text-white/30 italic">Select {variantAxes[axisIdx - 1]?.label || 'previous'} first</p>
                      ) : options.length === 0 ? (
                        <p className="text-[11px] text-white/30 italic">No options available</p>
                      ) : ui === 'dropdown' ? (
                        <select
                          data-testid={`axis-dropdown-${axis.key}`}
                          value={selections[axis.key] || ''}
                          onChange={e => selectAxisValue(axisIdx, e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#007AFF]/50"
                        >
                          <option value="" className="bg-black">— Select {axis.label || axis.key} —</option>
                          {options.map(opt => (
                            <option key={opt} value={opt} className="bg-black">{opt}</option>
                          ))}
                        </select>
                      ) : ui === 'swatch' ? (
                        <div className="flex flex-wrap gap-2.5">
                          {options.map(opt => {
                            const v = variantForAxisValue(axisIdx, opt);
                            const isSelected = String(selections[axis.key]) === String(opt);
                            const hex = v?.swatch_hex || colorToHex(opt);
                            return (
                              <button
                                key={opt}
                                data-testid={`axis-swatch-${axis.key}-${opt}`}
                                onClick={() => selectAxisValue(axisIdx, opt)}
                                title={opt}
                                className={`group relative rounded-full transition-all ${isSelected ? 'ring-2 ring-[#007AFF] ring-offset-2 ring-offset-black' : 'ring-1 ring-white/20 hover:ring-white/50'}`}
                              >
                                {v?.image ? (
                                  <img src={v.image} alt={opt} className="w-11 h-11 rounded-full object-cover" />
                                ) : (
                                  <span className="block w-11 h-11 rounded-full" style={{ background: hex }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        // buttons (default)
                        <div className="flex flex-wrap gap-2">
                          {options.map(opt => {
                            const isSelected = String(selections[axis.key]) === String(opt);
                            return (
                              <button
                                key={opt}
                                data-testid={`axis-btn-${axis.key}-${opt}`}
                                onClick={() => selectAxisValue(axisIdx, opt)}
                                className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'border-[#007AFF] bg-[#007AFF]/10 text-white'
                                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* LEGACY VARIANTS (type/value flat list) */}
            {!hasAxes && legacyGroups.length > 0 && (
              <div className="mb-6 space-y-3" data-testid="variant-selector">
                {legacyGroups.map(grp => {
                  const isColor = String(grp.type).toLowerCase().includes('color') || String(grp.type).toLowerCase().includes('colour');
                  return (
                    <div key={grp.type}>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">{grp.type}</p>
                      <div className="flex flex-wrap gap-2">
                        {grp.values.map(v => {
                          const isSelected = legacyVariantId === v.variant_id;
                          if (isColor) {
                            const hex = v.swatch_hex || colorToHex(v.value);
                            return (
                              <button
                                key={v.variant_id}
                                data-testid={`variant-${v.variant_id}`}
                                onClick={() => setLegacyVariantId(v.variant_id)}
                                title={v.value}
                                className={`rounded-full transition-all ${isSelected ? 'ring-2 ring-[#007AFF] ring-offset-2 ring-offset-black' : 'ring-1 ring-white/20 hover:ring-white/50'}`}
                              >
                                {v.image ? (
                                  <img src={v.image} alt={v.value} className="w-11 h-11 rounded-full object-cover" />
                                ) : (
                                  <span className="block w-11 h-11 rounded-full" style={{ background: hex }} />
                                )}
                              </button>
                            );
                          }
                          return (
                            <button
                              key={v.variant_id}
                              data-testid={`variant-${v.variant_id}`}
                              onClick={() => setLegacyVariantId(v.variant_id)}
                              className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
                                isSelected
                                  ? 'border-[#007AFF] bg-[#007AFF]/10 text-white'
                                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                              }`}
                            >
                              {v.value}
                              {v.price_modifier > 0 && <span className="text-[9px] text-white/30 ml-1">+₹{v.price_modifier}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
                  Selected: <span className="text-white/60">
                    {selectedVariant.options
                      ? Object.values(selectedVariant.options).join(' / ')
                      : selectedVariant.value}
                  </span>
                  {selectedVariant.stock !== undefined && <span className="ml-2">({selectedVariant.stock} in stock)</span>}
                </span>
              )}
            </div>
            <div className="flex gap-3 mb-8">
              <Button
                data-testid="add-to-cart-detail-btn"
                onClick={handleAddToCart}
                disabled={needsSelection}
                className="flex-1 bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag size={16} className="mr-2" />
                {needsSelection ? 'Select options to continue' : 'Add to Cart'}
              </Button>
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
