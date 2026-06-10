import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) { setCartItems([]); return; }
    try {
      const res = await axios.get(`${API}/cart`, { withCredentials: true });
      setCartItems(res.data);
    } catch { setCartItems([]); }
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, variantId = null) => {
    await axios.post(`${API}/cart`, { product_id: productId, quantity, variant_id: variantId }, { withCredentials: true });
    await fetchCart();
  };

  // Prefer cart_item_id (variant-safe); fall back to product_id legacy endpoint for old items
  const updateQuantity = async (item, quantity) => {
    const id = typeof item === 'string' ? item : item.cart_item_id;
    const productId = typeof item === 'string' ? item : item.product_id;
    if (id) {
      await axios.put(`${API}/cart/item/${id}`, { product_id: productId || id, quantity }, { withCredentials: true });
    } else {
      await axios.put(`${API}/cart/${productId}`, { product_id: productId, quantity }, { withCredentials: true });
    }
    await fetchCart();
  };

  const removeFromCart = async (item) => {
    const id = typeof item === 'string' ? null : item.cart_item_id;
    const productId = typeof item === 'string' ? item : item.product_id;
    if (id) {
      await axios.delete(`${API}/cart/item/${id}`, { withCredentials: true });
    } else {
      await axios.delete(`${API}/cart/${productId}`, { withCredentials: true });
    }
    await fetchCart();
  };

  const clearCart = async () => {
    await axios.delete(`${API}/cart`, { withCredentials: true });
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => {
    const base = item.product?.price || 0;
    const mod = item.variant?.price_modifier || 0;
    return sum + (base + mod) * item.quantity;
  }, 0);

  const contextValue = useMemo(() => ({ 
    cartItems, cartOpen, setCartOpen, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart, cartCount, cartTotal 
  }), [cartItems, cartOpen, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart, cartCount, cartTotal]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
