import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Lightning, Truck, Star } from '@phosphor-icons/react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATEGORIES = [
  { name: 'Tempered Glass', slug: 'Tempered+Glass' },
  { name: 'Cases', slug: 'Cases' },
  { name: 'Holders', slug: 'Holders' },
  { name: 'Cables & Chargers', slug: 'Cables+%26+Chargers' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { await axios.post(`${API}/seed`); } catch {}
      try { const res = await axios.get(`${API}/products?featured=true`); setFeatured(res.data.slice(0, 6)); } catch {}
      setLoaded(true);
    })();
  }, []);

  return (
    <div data-testid="home-page" className="min-h-screen bg-black">
      {/* Hero */}
      <section data-testid="hero-section" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1761319659795-543075eaeaad?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwxfHxkYXJrJTIwdGVjaG5vbG9neSUyMGFic3RyYWN0fGVufDB8fHx8MTc3NDgyMzU3M3ww&ixlib=rb-4.1.0&q=85" alt="" className="w-full h-full object-cover opacity-40" />
        </div>
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <p className="text-[10px] sm:text-xs text-[#007AFF] uppercase tracking-[0.3em] font-bold mb-4">Premium Smartphone Protection</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tighter font-semibold text-white mb-6 max-w-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
            Engineered for<br /><span style={{ color: '#007AFF' }}>perfect fit.</span>
          </h1>
          <p className="text-base text-white/50 mb-8 max-w-lg leading-relaxed">International quality mobile accessories. Tempered glass, cases, holders and chargers designed with precision engineering.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/shop">
              <Button data-testid="hero-shop-btn" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-6 py-3 h-12 text-sm font-medium">
                Shop Now <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-white/10 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Truck size={18} />, label: 'Free Shipping', sub: 'Orders ₹500+' },
              { icon: <ShieldCheck size={18} />, label: 'Authentic Products', sub: 'Quality tested' },
              { icon: <Lightning size={18} />, label: 'Fast Delivery', sub: '2-4 days India' },
              { icon: <Star size={18} />, label: '4.8 Rating', sub: '10K+ reviews' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-[#007AFF]">{t.icon}</div>
                <div><p className="text-xs font-medium text-white">{t.label}</p><p className="text-[10px] text-white/40">{t.sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section data-testid="categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl sm:text-3xl tracking-tight font-medium text-white mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <Link key={cat.name} to={`/shop?category=${cat.slug}`} data-testid={`category-${cat.slug}`} className="group relative bg-[#0A0A0A] border border-white/10 rounded-xl p-6 hover:border-[#007AFF]/30 transition-colors text-center">
              <h3 className="text-sm font-medium text-white group-hover:text-[#007AFF] transition-colors">{cat.name}</h3>
              <ArrowRight size={14} className="mx-auto mt-2 text-white/30 group-hover:text-[#007AFF] transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section data-testid="featured-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl tracking-tight font-medium text-white" style={{ fontFamily: 'var(--font-heading)' }}>Featured Products</h2>
          <Link to="/shop" className="text-xs font-medium text-white/40 hover:text-[#007AFF] flex items-center gap-1 transition-colors">View All <ArrowRight size={12} /></Link>
        </div>
        {!loaded ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="bg-white/5 rounded-xl aspect-[3/4] animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {featured.map(p => <ProductCard key={p.product_id} product={p} />)}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl tracking-tight font-medium text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Ready to protect your device?</h2>
          <p className="text-white/40 mb-8 max-w-md mx-auto text-sm">Join thousands of Indian customers who trust Snap Aligner.</p>
          <Link to="/shop"><Button data-testid="cta-shop-btn" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-8 py-3 h-12 text-sm font-medium">Explore Collection <ArrowRight size={16} className="ml-2" /></Button></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Snap<span style={{ color: '#007AFF' }}>Align</span></h3>
              <p className="text-xs text-white/40">Premium smartphone protection & accessories for India.</p>
            </div>
            <div>
              <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Shop</h4>
              <div className="flex flex-col gap-1.5">
                {CATEGORIES.map(c => <Link key={c.name} to={`/shop?category=${c.slug}`} className="text-xs text-white/50 hover:text-white">{c.name}</Link>)}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Support</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/track" className="text-xs text-white/50 hover:text-white">Track Order</Link>
                <span className="text-xs text-white/50">Shipping Info</span>
                <span className="text-xs text-white/50">Returns</span>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Contact</h4>
              <p className="text-xs text-white/50">support@snapalign.in</p>
              <p className="text-xs text-white/50 mt-1">WhatsApp: +91 99999 99999</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/20">&copy; 2026 Snap Aligner. All rights reserved. snapalign.in</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
