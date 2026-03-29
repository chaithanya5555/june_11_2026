import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Funnel, SortAscending } from '@phosphor-icons/react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ALL_CATEGORIES = ['Phone Cases', 'Screen Protectors', 'Chargers', 'Cables', 'Earphones', 'Mounts & Stands', 'Power Banks'];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);
        const res = await axios.get(`${API}/products?${params.toString()}`);
        setProducts(res.data);
      } catch { setProducts([]); }
      setLoading(false);
    };
    fetchProducts();
  }, [category, search, sort]);

  const setFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams);
  };

  return (
    <div data-testid="shop-page" className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl tracking-tight font-medium text-zinc-950" style={{ fontFamily: 'var(--font-heading)' }}>
              {category || (search ? `Results for "${search}"` : 'All Products')}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{products.length} products</p>
          </div>
          <div className="flex items-center gap-2">
            <Button data-testid="toggle-filters-btn" variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="lg:hidden rounded-md border-zinc-200">
              <Funnel size={16} className="mr-1" /> Filter
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-56 flex-shrink-0`}>
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Category</h3>
                <div className="flex flex-col gap-1">
                  <button data-testid="filter-all" onClick={() => setFilter('category', '')} className={`text-left text-sm py-1.5 px-2 rounded-md transition-colors ${!category ? 'bg-zinc-100 font-medium text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                    All Products
                  </button>
                  {ALL_CATEGORIES.map(cat => (
                    <button key={cat} data-testid={`filter-${cat}`} onClick={() => setFilter('category', cat)} className={`text-left text-sm py-1.5 px-2 rounded-md transition-colors ${category === cat ? 'bg-zinc-100 font-medium text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Sort By</h3>
                <Select value={sort} onValueChange={(v) => setFilter('sort', v)}>
                  <SelectTrigger data-testid="sort-select" className="w-full rounded-md border-zinc-200">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(category || search) && (
                <Button data-testid="clear-filters-btn" variant="outline" size="sm" onClick={() => setSearchParams({})} className="w-full rounded-md border-zinc-200">
                  Clear Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-zinc-200 rounded-lg aspect-square mb-3" />
                    <div className="h-3 bg-zinc-200 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-zinc-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-zinc-200 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-500">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products.map(product => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
