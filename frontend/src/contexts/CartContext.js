import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const addToCart = async (productId, quantity = 1) => {
    await axios.post(`${API}/cart`, { product_id: productId, quantity }, { withCredentials: true });
    await fetchCart();
  };

  const updateQuantity = async (productId, quantity) => {
    await axios.put(`${API}/cart/${productId}`, { product_id: productId, quantity }, { withCredentials: true });
    await fetchCart();
  };

  const removeFromCart = async (productId) => {
    await axios.delete(`${API}/cart/${productId}`, { withCredentials: true });
    await fetchCart();
  };

  const clearCart = async () => {
    await axios.delete(`${API}/cart`, { withCredentials: true });
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ cartItems, cartOpen, setCartOpen, addToCart, updateQuantity, removeFromCart, clearCart, fetchCart, cartCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
