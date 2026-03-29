import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Heart, MagnifyingGlass, List, X, SignOut, Package, Gauge } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Button } from '../components/ui/button';
import CartSheet from './CartSheet';

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const { cartCount, setCartOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <nav data-testid="navbar" className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" data-testid="nav-logo" className="flex items-center gap-2">
              <span className="font-heading text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Snap<span style={{ color: '#FF5A00' }}>Align</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/shop" data-testid="nav-shop" className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors duration-300">Shop</Link>
              <Link to="/shop?category=Phone+Cases" data-testid="nav-cases" className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors duration-300">Cases</Link>
              <Link to="/shop?category=Chargers" data-testid="nav-chargers" className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors duration-300">Chargers</Link>
              <Link to="/shop?category=Earphones" data-testid="nav-earphones" className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors duration-300">Audio</Link>
              <Link to="/shop?category=Power+Banks" data-testid="nav-powerbanks" className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors duration-300">Power Banks</Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button data-testid="nav-search-btn" onClick={() => setSearchOpen(!searchOpen)} className="p-2 text-zinc-500 hover:text-zinc-950 transition-colors duration-300">
                <MagnifyingGlass size={20} weight="bold" />
              </button>

              {user && (
                <Link to="/wishlist" data-testid="nav-wishlist" className="p-2 text-zinc-500 hover:text-zinc-950 transition-colors duration-300">
                  <Heart size={20} weight="bold" />
                </Link>
              )}

              <Sheet>
                <SheetTrigger asChild>
                  <button data-testid="nav-cart-btn" className="p-2 text-zinc-500 hover:text-zinc-950 transition-colors duration-300 relative">
                    <ShoppingBag size={20} weight="bold" />
                    {cartCount > 0 && (
                      <span data-testid="cart-count-badge" className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-medium" style={{ backgroundColor: '#FF5A00' }}>
                        {cartCount}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[420px] p-0">
                  <CartSheet />
                </SheetContent>
              </Sheet>

              {user ? (
                <div className="relative group">
                  <button data-testid="nav-user-menu" className="p-2 text-zinc-500 hover:text-zinc-950 transition-colors duration-300">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <User size={20} weight="bold" />
                    )}
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-3 border-b border-zinc-100">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                    <Link to="/profile" data-testid="nav-profile-link" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                      <Package size={16} /> My Orders
                    </Link>
                    <Link to="/wishlist" data-testid="nav-wishlist-link" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                      <Heart size={16} /> Wishlist
                    </Link>
                    {user.role === 'admin' && (
                      <Link to="/admin" data-testid="nav-admin-link" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                        <Gauge size={16} /> Admin
                      </Link>
                    )}
                    <button data-testid="nav-logout-btn" onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-zinc-100">
                      <SignOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Button data-testid="nav-login-btn" onClick={login} variant="default" size="sm" className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md px-4 text-sm">
                  Sign In
                </Button>
              )}

              {/* Mobile menu toggle */}
              <button data-testid="nav-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-zinc-500">
                {mobileOpen ? <X size={20} /> : <List size={20} />}
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <div className="pb-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input data-testid="nav-search-input" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="flex-1 px-4 py-2 border border-zinc-200 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950" autoFocus />
                <Button data-testid="nav-search-submit" type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md px-4">Search</Button>
              </form>
            </div>
          )}

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden pb-4 border-t border-zinc-100 pt-3 flex flex-col gap-2">
              <Link to="/shop" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-zinc-700 py-2">Shop All</Link>
              <Link to="/shop?category=Phone+Cases" onClick={() => setMobileOpen(false)} className="text-sm text-zinc-600 py-2">Cases</Link>
              <Link to="/shop?category=Chargers" onClick={() => setMobileOpen(false)} className="text-sm text-zinc-600 py-2">Chargers</Link>
              <Link to="/shop?category=Earphones" onClick={() => setMobileOpen(false)} className="text-sm text-zinc-600 py-2">Audio</Link>
              <Link to="/shop?category=Power+Banks" onClick={() => setMobileOpen(false)} className="text-sm text-zinc-600 py-2">Power Banks</Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
