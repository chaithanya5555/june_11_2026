import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, Funnel, X } from '@phosphor-icons/react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [deviceModels, setDeviceModels] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const category = searchParams.get('category') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const brand = searchParams.get('brand') || '';
  const deviceModel = searchParams.get('device_model') || '';
  const variantBrand = searchParams.get('variant_brand') || '';
  const variantModel = searchParams.get('variant_model') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || '';
  
  const [searchInput, setSearchInput] = useState(search);

  // Fetch filter options
  useEffect(() => {
    (async () => {
      try {
        const [brandsRes, catsRes] = await Promise.all([
          axios.get(`${API}/brands`),
          axios.get(`${API}/categories`)
        ]);
        setBrands(brandsRes.data);
        setCategories(catsRes.data);
      } catch (e) {
        console.error('Failed to fetch filters', e);
      }
    })();
  }, []);

  // Fetch device models when brand changes
  useEffect(() => {
    if (brand) {
      (async () => {
        try {
          const res = await axios.get(`${API}/products?brand=${brand}`);
          const models = [...new Set(res.data.map(p => p.device_model))].sort();
          setDeviceModels(models);
        } catch (e) {
          setDeviceModels([]);
        }
      })();
    } else {
      setDeviceModels([]);
    }
  }, [brand]);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (category) {
      (async () => {
        try {
          const res = await axios.get(`${API}/subcategories?category=${category}`);
          setSubcategories(res.data);
        } catch (e) {
          setSubcategories([]);
        }
      })();
    } else {
      setSubcategories([]);
    }
  }, [category]);

  // Fetch products
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (subcategory) params.set('subcategory', subcategory);
        if (brand) params.set('brand', brand);
        if (variantBrand) params.set('variant_brand', variantBrand);
        if (variantModel) params.set('variant_model', variantModel);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);
        
        const res = await axios.get(`${API}/products?${params.toString()}`);
        setProducts(res.data);
      } catch {
        setProducts([]);
      }
      setLoading(false);
    })();
  }, [category, subcategory, brand, variantBrand, variantModel, search, sort]);

  const setFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
      // Clear dependent filters
      if (key === 'category' && newParams.get('subcategory')) {
        newParams.delete('subcategory');
      }
      if (key === 'brand' && newParams.get('device_model')) {
        newParams.delete('device_model');
      }
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setSearchInput('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilter('search', searchInput);
  };

  const activeFiltersCount = [category, subcategory, brand, deviceModel, variantBrand, variantModel, search].filter(Boolean).length;

  return (
    <div data-testid="shop-page" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Search */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl tracking-tight font-medium text-white mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            {category || 'All Products'}
          </h1>

          {(variantBrand || variantModel) && (
            <div data-testid="device-fit-chip" className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-[#007AFF]/10 border border-[#007AFF]/30 rounded-full">
              <span className="text-[10px] uppercase tracking-widest text-[#007AFF]/80">Fits</span>
              <span className="text-xs font-medium text-white">
                {variantBrand}{variantModel ? ` · ${variantModel}` : ''}
              </span>
              <button
                data-testid="clear-device-fit"
                onClick={() => { const p = new URLSearchParams(searchParams); p.delete('variant_brand'); p.delete('variant_model'); setSearchParams(p); }}
                className="text-[#007AFF] hover:text-white ml-1"
                aria-label="Clear device filter"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by device model, brand, or product type..."
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
              />
            </div>
            <Button type="submit" className="bg-[#007AFF] hover:bg-[#005BB5] h-11 px-6">
              Search
            </Button>
          </form>

          {/* Filters Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5"
              >
                <Funnel size={16} className="mr-2" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
              
              {activeFiltersCount > 0 && (
                <Button
                  onClick={clearAllFilters}
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white"
                >
                  Clear All <X size={14} className="ml-1" />
                </Button>
              )}
              
              <span className="text-xs text-white/40">{products.length} products</span>
            </div>
            
            {/* Sort */}
            <Select value={sort || 'default'} onValueChange={v => setFilter('sort', v === 'default' ? '' : v)}>
              <SelectTrigger className="w-44 bg-[#0A0A0A] border-white/10 text-white text-xs rounded-lg h-9">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border-white/10">
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Brand Filter */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Brand</label>
                <Select value={brand || 'all'} onValueChange={v => setFilter('brand', v === 'all' ? '' : v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10">
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Device Model Filter */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Phone Model</label>
                <Select 
                  value={deviceModel || 'all'} 
                  onValueChange={v => setFilter('device_model', v === 'all' ? '' : v)}
                  disabled={!brand}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white disabled:opacity-50">
                    <SelectValue placeholder={brand ? "All Models" : "Select brand first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10 max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Models</SelectItem>
                    {deviceModels.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Category</label>
                <Select value={category || 'all'} onValueChange={v => setFilter('category', v === 'all' ? '' : v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory Filter */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Type</label>
                <Select 
                  value={subcategory || 'all'} 
                  onValueChange={v => setFilter('subcategory', v === 'all' ? '' : v)}
                  disabled={!category}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white disabled:opacity-50">
                    <SelectValue placeholder={category ? "All Types" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10 max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Types</SelectItem>
                    {subcategories.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {brand && (
              <div className="bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg px-3 py-1 flex items-center gap-2">
                <span className="text-xs text-[#007AFF]">Brand: {brand}</span>
                <button onClick={() => setFilter('brand', '')} className="text-[#007AFF] hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            {deviceModel && (
              <div className="bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg px-3 py-1 flex items-center gap-2">
                <span className="text-xs text-[#007AFF]">Model: {deviceModel}</span>
                <button onClick={() => setFilter('device_model', '')} className="text-[#007AFF] hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            {category && (
              <div className="bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg px-3 py-1 flex items-center gap-2">
                <span className="text-xs text-[#007AFF]">Category: {category}</span>
                <button onClick={() => setFilter('category', '')} className="text-[#007AFF] hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            {subcategory && (
              <div className="bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg px-3 py-1 flex items-center gap-2">
                <span className="text-xs text-[#007AFF]">Type: {subcategory}</span>
                <button onClick={() => setFilter('subcategory', '')} className="text-[#007AFF] hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            {search && (
              <div className="bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-lg px-3 py-1 flex items-center gap-2">
                <span className="text-xs text-[#007AFF]">Search: "{search}"</span>
                <button onClick={() => { setFilter('search', ''); setSearchInput(''); }} className="text-[#007AFF] hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="bg-white/5 rounded-xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg mb-2">No products found</p>
            <p className="text-white/30 text-sm mb-4">Try adjusting your filters</p>
            <Button onClick={clearAllFilters} variant="outline" className="border-white/20 text-white">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard key={p.id || p.product_id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
