import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightning, ShieldCheck, Truck, Star } from '@phosphor-icons/react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { name: 'Phone Cases', icon: '📱', slug: 'Phone+Cases' },
  { name: 'Screen Protectors', icon: '🛡️', slug: 'Screen+Protectors' },
  { name: 'Chargers', icon: '⚡', slug: 'Chargers' },
  { name: 'Cables', icon: '🔌', slug: 'Cables' },
  { name: 'Earphones', icon: '🎧', slug: 'Earphones' },
  { name: 'Mounts & Stands', icon: '📐', slug: 'Mounts+%26+Stands' },
  { name: 'Power Banks', icon: '🔋', slug: 'Power+Banks' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await axios.post(`${API}/seed`);
      } catch { /* already seeded */ }
      try {
        const res = await axios.get(`${API}/products?featured=true`);
        setFeatured(res.data.slice(0, 8));
      } catch { /* ignore */ }
      setLoaded(true);
    };
    load();
  }, []);

  return (
    <div data-testid="home-page" className="min-h-screen">
      {/* Hero */}
      <section data-testid="hero-section" className="relative overflow-hidden bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-sm text-zinc-500 uppercase tracking-[0.15em] mb-4" style={{ fontFamily: 'var(--font-body)' }}>Premium Mobile Accessories</p>
              <h1 className="text-5xl sm:text-6xl tracking-tighter font-medium text-zinc-950 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                Designed for<br />
                <span style={{ color: '#FF5A00' }}>precision.</span>
              </h1>
              <p className="text-base text-zinc-600 mb-8 max-w-md leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Engineered accessories that fit perfectly. Cases, chargers, and audio built with obsessive attention to detail.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/shop">
                  <Button data-testid="hero-shop-btn" className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md px-6 py-3 h-12 text-sm font-medium">
                    Shop Now <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
                <Link to="/shop?category=Phone+Cases">
                  <Button data-testid="hero-cases-btn" variant="outline" className="rounded-md px-6 py-3 h-12 text-sm border-zinc-300">
                    View Cases
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-zinc-200 rounded-2xl overflow-hidden aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1764025130362-0162c3dd2035?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NDh8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB0ZWNoJTIwd29ya3NwYWNlfGVufDB8fHx8MTc3NDgyMDUyMXww&ixlib=rb-4.1.0&q=85"
                  alt="SnapAlign accessories"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Truck size={20} />, label: 'Free Shipping', sub: 'On orders $50+' },
              { icon: <ShieldCheck size={20} />, label: '2-Year Warranty', sub: 'On all products' },
              { icon: <Lightning size={20} />, label: 'Fast Delivery', sub: '2-3 business days' },
              { icon: <Star size={20} />, label: '4.8 Rating', sub: '10K+ reviews' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-zinc-400">{item.icon}</div>
                <div>
                  <p className="text-sm font-medium text-zinc-950">{item.label}</p>
                  <p className="text-xs text-zinc-500">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section data-testid="categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl sm:text-4xl tracking-tight font-medium text-zinc-950" style={{ fontFamily: 'var(--font-heading)' }}>Shop by Category</h2>
          <Link to="/shop" className="text-sm font-medium text-zinc-500 hover:text-zinc-950 flex items-center gap-1 transition-colors">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {CATEGORIES.map(cat => (
            <Link key={cat.name} to={`/shop?category=${cat.slug}`} data-testid={`category-${cat.slug}`} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors duration-300">
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-zinc-700 text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section data-testid="featured-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl sm:text-4xl tracking-tight font-medium text-zinc-950" style={{ fontFamily: 'var(--font-heading)' }}>Featured Products</h2>
          <Link to="/shop" className="text-sm font-medium text-zinc-500 hover:text-zinc-950 flex items-center gap-1 transition-colors">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        {!loaded ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-zinc-200 rounded-lg aspect-square mb-3" />
                <div className="h-3 bg-zinc-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-zinc-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-zinc-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featured.map(product => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl tracking-tight font-medium mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Ready to upgrade?</h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">Join thousands of satisfied customers who trust SnapAlign for their mobile accessories.</p>
          <Link to="/shop">
            <Button data-testid="cta-shop-btn" className="text-zinc-950 rounded-md px-8 py-3 h-12 text-sm font-medium" style={{ backgroundColor: '#FF5A00', color: '#FFFFFF' }}>
              Explore Collection <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Snap<span style={{ color: '#FF5A00' }}>Align</span></h3>
              <p className="text-sm text-zinc-500">Premium mobile accessories designed for precision.</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Shop</h4>
              <div className="flex flex-col gap-2">
                <Link to="/shop?category=Phone+Cases" className="text-sm text-zinc-600 hover:text-zinc-950">Phone Cases</Link>
                <Link to="/shop?category=Chargers" className="text-sm text-zinc-600 hover:text-zinc-950">Chargers</Link>
                <Link to="/shop?category=Earphones" className="text-sm text-zinc-600 hover:text-zinc-950">Audio</Link>
                <Link to="/shop?category=Power+Banks" className="text-sm text-zinc-600 hover:text-zinc-950">Power Banks</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Support</h4>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-zinc-600">Shipping Info</span>
                <span className="text-sm text-zinc-600">Returns</span>
                <span className="text-sm text-zinc-600">Contact Us</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Legal</h4>
              <div className="flex flex-col gap-2">
                <span className="text-sm text-zinc-600">Privacy Policy</span>
                <span className="text-sm text-zinc-600">Terms of Service</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-100 text-center">
            <p className="text-xs text-zinc-400">&copy; 2026 SnapAlign. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
