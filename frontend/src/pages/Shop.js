import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATS = ['Tempered Glass', 'Cases', 'Holders', 'Cables & Chargers'];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        if (category) p.set('category', category);
        if (search) p.set('search', search);
        if (sort) p.set('sort', sort);
        const res = await axios.get(`${API}/products?${p.toString()}`);
        setProducts(res.data);
      } catch { setProducts([]); }
      setLoading(false);
    })();
  }, [category, search, sort]);

  const setFilter = (k, v) => {
    const np = new URLSearchParams(searchParams);
    if (v) np.set(k, v); else np.delete(k);
    setSearchParams(np);
  };

  return (
    <div data-testid="shop-page" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl tracking-tight font-medium text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {category || (search ? `Results for "${search}"` : 'All Products')}
            </h1>
            <p className="text-xs text-white/40 mt-1">{products.length} products</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={sort || 'default'} onValueChange={v => setFilter('sort', v === 'default' ? '' : v)}>
              <SelectTrigger data-testid="sort-select" className="w-44 bg-[#0A0A0A] border-white/10 text-white text-xs rounded-lg"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10">
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button data-testid="filter-all" onClick={() => setFilter('category', '')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${!category ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>All</button>
          {CATS.map(c => (
            <button key={c} data-testid={`filter-${c}`} onClick={() => setFilter('category', c)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${category === c ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{c}</button>
          ))}
          {(category || search) && <Button data-testid="clear-filters-btn" onClick={() => setSearchParams({})} variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white">Clear</Button>}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white/5 rounded-xl aspect-[3/4] animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20"><p className="text-white/40">No products found</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {products.map(p => <ProductCard key={p.product_id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
