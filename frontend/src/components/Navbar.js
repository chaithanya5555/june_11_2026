import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { List, X, ShoppingBag, Heart, MagnifyingGlass, House, Storefront, Package, User, Gauge, SignOut, WhatsappLogo } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Button } from '../components/ui/button';
import CartSheet from './CartSheet';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: <House size={18} /> },
  { to: '/shop', label: 'All Products', icon: <Storefront size={18} /> },
  { to: '/shop?category=Tempered+Glass', label: 'Tempered Glass' },
  { to: '/shop?category=Cases', label: 'Cases' },
  { to: '/shop?category=Holders', label: 'Holders' },
  { to: '/shop?category=Cables+%26+Chargers', label: 'Cables & Chargers' },
  { to: '/track', label: 'Track Order', icon: <Package size={18} /> },
];

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const { cartCount } = useCart();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

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
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  {link.icon || <div className="w-[18px]" />}
                  {link.label}
                </Link>
              ))}
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

      {/* WhatsApp Float */}
      <a data-testid="whatsapp-float" href="https://wa.me/919999999999?text=Hi%20SnapAlign%2C%20I%20need%20help" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-[0_8px_32px_rgba(37,211,102,0.3)] hover:scale-110 transition-transform" style={{ backgroundColor: '#25D366' }}>
        <WhatsappLogo size={24} weight="fill" className="text-white" />
      </a>
    </>
  );
}
