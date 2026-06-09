import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { List, X, ShoppingBag, Heart, MagnifyingGlass, House, Storefront, Package, User, Gauge, SignOut, WhatsappLogo, CaretDown, CaretRight, DeviceMobile } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Button } from '../components/ui/button';
import CartSheet from './CartSheet';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { label: 'Tempered Glass', value: 'Tempered Glass' },
  { label: 'Cases', value: 'Cases' },
  { label: 'Camera Lens Protector', value: 'Camera Lens Protector' },
  { label: 'Screen Protector', value: 'Screen Protector' },
];

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const { cartCount } = useCart();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState({});
  const [deviceBrands, setDeviceBrands] = useState([]); // [{brand, models: []}]
  const [deviceFinderOpen, setDeviceFinderOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Hide entire public navbar on admin routes (admin dashboard has its own header/auth)
  const isAdminRoute = location.pathname.startsWith('/admin');
  // Hide WhatsApp float on checkout & admin to keep these screens focused
  const hideWhatsAppFloat = isAdminRoute || location.pathname.startsWith('/checkout');

  // Fetch subcategories for each category
  useEffect(() => {
    CATEGORIES.forEach(cat => {
      axios.get(`${API}/subcategories?category=${encodeURIComponent(cat.value)}`)
        .then(res => {
          setSubcategories(prev => ({ ...prev, [cat.value]: res.data }));
        })
        .catch(console.error);
    });
  }, []);

  // Fetch device brands + models from product-level data
  useEffect(() => {
    axios.get(`${API}/brands-with-models`)
      .then(res => setDeviceBrands(res.data || []))
      .catch(() => setDeviceBrands([]));
  }, []);

  const modelsForSelectedBrand = (deviceBrands.find(b => b.brand === selectedBrand)?.models) || [];

  const applyDeviceFilter = (brand, model) => {
    const params = new URLSearchParams();
    if (brand) params.set('brand', brand);
    if (model) params.set('device_model', model);
    navigate(`/shop?${params.toString()}`);
    setSidebarOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      setSidebarOpen(false);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleCategoryClick = (category) => {
    navigate(`/shop?category=${encodeURIComponent(category)}`);
    setSidebarOpen(false);
  };

  const handleSubcategoryClick = (category, subcategory) => {
    navigate(`/shop?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`);
    setSidebarOpen(false);
  };

  if (isAdminRoute) {
    // Admin has its own layout; render nothing from public navbar to avoid
    // leaking customer profile/avatar into admin pages.
    return null;
  }

  return (
    <>
      <nav data-testid="navbar" className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Hamburger + Logo */}
            <div className="flex items-center gap-3">
              <button data-testid="hamburger-menu" onClick={() => setSidebarOpen(true)} className="p-2 text-white/70 hover:text-white transition-colors">
                <List size={22} weight="bold" />
              </button>
              <Link to="/" data-testid="nav-logo" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Snap<span style={{ color: '#007AFF' }}>Align</span>
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button data-testid="nav-search-btn" onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-white/60 hover:text-white transition-colors">
                <MagnifyingGlass size={18} weight="bold" />
              </button>
              {user && (
                <Link to="/wishlist" data-testid="nav-wishlist" className="p-2 text-white/60 hover:text-white transition-colors">
                  <Heart size={18} weight="bold" />
                </Link>
              )}
              <Sheet>
                <SheetTrigger asChild>
                  <button data-testid="nav-cart-btn" className="p-2 text-white/60 hover:text-white transition-colors relative">
                    <ShoppingBag size={18} weight="bold" />
                    {cartCount > 0 && (
                      <span data-testid="cart-count-badge" className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#007AFF' }}>{cartCount}</span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[400px] p-0 bg-[#0A0A0A] border-l border-white/10">
                  <CartSheet />
                </SheetContent>
              </Sheet>
              {user ? (
                <button data-testid="nav-user-menu" onClick={() => navigate('/profile')} className="p-2 text-white/60 hover:text-white transition-colors">
                  {user.picture ? <img src={user.picture} alt="" className="w-6 h-6 rounded-full" /> : <User size={18} weight="bold" />}
                </button>
              ) : (
                <Button data-testid="nav-login-btn" onClick={login} size="sm" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-4 text-xs h-8">
                  Sign In
                </Button>
              )}
            </div>
          </div>
          {searchOpen && (
            <div className="pb-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input data-testid="nav-search-input" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#007AFF]/50" autoFocus />
                <Button data-testid="nav-search-submit" type="submit" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-4 text-sm">Search</Button>
              </form>
            </div>
          )}
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div data-testid="sidebar-menu" className="absolute left-0 top-0 bottom-0 w-72 bg-[#0A0A0A] border-r border-white/10 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Snap<span style={{ color: '#007AFF' }}>Align</span></span>
              <button data-testid="sidebar-close" onClick={() => setSidebarOpen(false)} className="p-1 text-white/50 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {/* Home */}
              <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                <House size={18} />
                Home
              </Link>
              
              {/* All Products */}
              <Link to="/shop" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                <Storefront size={18} />
                All Products
              </Link>

              {/* Device Finder (Brand → Model cascading) */}
              <div data-testid="device-finder" className="border-y border-white/5 bg-white/[0.02]">
                <button
                  data-testid="device-finder-toggle"
                  onClick={() => setDeviceFinderOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <DeviceMobile size={18} className="text-[#007AFF]" />
                    Find Your Device
                  </span>
                  {deviceFinderOpen ? <CaretDown size={14} /> : <CaretRight size={14} />}
                </button>
                {deviceFinderOpen && (
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Brand</p>
                    <select
                      data-testid="device-finder-brand"
                      value={selectedBrand}
                      onChange={e => { setSelectedBrand(e.target.value); setSelectedModel(''); }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#007AFF]/50"
                    >
                      <option value="" className="bg-black">— Select Brand —</option>
                      {deviceBrands.map(b => (
                        <option key={b.brand} value={b.brand} className="bg-black">{b.brand}</option>
                      ))}
                    </select>
                    {deviceBrands.length === 0 && (
                      <p className="text-[10px] text-white/30 italic">No device data yet. Admin can add brands/models via product variants.</p>
                    )}

                    <p className="text-[10px] text-white/40 uppercase tracking-widest pt-1">Model</p>
                    <select
                      data-testid="device-finder-model"
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      disabled={!selectedBrand}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#007AFF]/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="" className="bg-black">
                        {selectedBrand ? '— Select Model —' : 'Select Brand first'}
                      </option>
                      {modelsForSelectedBrand.map(m => (
                        <option key={m} value={m} className="bg-black">{m}</option>
                      ))}
                    </select>

                    <Button
                      data-testid="device-finder-apply"
                      onClick={() => applyDeviceFilter(selectedBrand, selectedModel)}
                      disabled={!selectedBrand}
                      className="w-full mt-2 bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-9 text-xs font-medium disabled:opacity-40"
                    >
                      Show Matching Products
                    </Button>
                  </div>
                )}
              </div>

              {/* Categories with Subcategories */}
              {CATEGORIES.map(cat => (
                <div key={cat.value}>
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                    <button 
                      onClick={() => handleCategoryClick(cat.value)}
                      className="flex-1 text-left"
                    >
                      {cat.label}
                    </button>
                    {subcategories[cat.value]?.length > 0 && (
                      <button 
                        onClick={() => toggleCategory(cat.value)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {expandedCategory === cat.value ? (
                          <CaretDown size={14} />
                        ) : (
                          <CaretRight size={14} />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {/* Subcategories */}
                  {expandedCategory === cat.value && subcategories[cat.value]?.length > 0 && (
                    <div className="bg-white/5 py-2">
                      {subcategories[cat.value].map(sub => (
                        <button
                          key={sub}
                          onClick={() => handleSubcategoryClick(cat.value, sub)}
                          className="w-full text-left px-8 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Track Order */}
              <Link to="/track" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                <Package size={18} />
                Track Order
              </Link>
            </div>
            <div className="border-t border-white/10 p-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    {user.picture ? <img src={user.picture} alt="" className="w-8 h-8 rounded-full" /> : <User size={20} className="text-white/50" />}
                    <div><p className="text-sm font-medium truncate">{user.name}</p><p className="text-xs text-white/40 truncate">{user.email}</p></div>
                  </div>
                  <Link to="/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-sm text-white/60 hover:text-white py-1">
                    <Package size={14} /> My Orders
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-sm text-white/60 hover:text-white py-1">
                      <Gauge size={14} /> Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { logout(); setSidebarOpen(false); }} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 py-1">
                    <SignOut size={14} /> Sign Out
                  </button>
                </div>
              ) : (
                <Button data-testid="sidebar-login-btn" onClick={() => { login(); setSidebarOpen(false); }} className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg">Sign In with Google</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Float (hidden on checkout & admin pages) */}
      {!hideWhatsAppFloat && (
        <a data-testid="whatsapp-float" href="https://wa.me/919999999999?text=Hi%20SnapAlign%2C%20I%20need%20help" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-[0_8px_32px_rgba(37,211,102,0.3)] hover:scale-110 transition-transform" style={{ backgroundColor: '#25D366' }}>
          <WhatsappLogo size={24} weight="fill" className="text-white" />
        </a>
      )}
    </>
  );
}
