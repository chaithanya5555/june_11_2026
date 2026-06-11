import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, CreditCard, Tag, ShieldCheck } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Checkout() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  
  const [step, setStep] = useState('checkout'); // 'checkout', 'address'
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [couponApplied, setCouponApplied] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Address fields
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  const shipping = cartTotal >= 500 ? 0 : 49;
  const total = Math.max(0, cartTotal + shipping - discount);

  useEffect(() => {
    // Scroll to top on mount so mobile users immediately see the cart items at the top
    window.scrollTo(0, 0);
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
      const r = await axios.post(`${API}/coupons/validate`, { code: couponCode, subtotal: cartTotal }, { withCredentials: true });
      if (r.data.valid) {
        setCouponApplied({ code: r.data.code, type: r.data.discount_type, value: r.data.discount_value });
        setDiscount(r.data.discount_amount);
        toast.success(`Coupon applied: ₹${r.data.discount_amount.toFixed(0)} off!`);
      } else {
        toast.error(r.data.message || 'Invalid coupon');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Invalid coupon');
    }
    setValidating(false);
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setDiscount(0);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  // Calculate estimated delivery based on pincode
  const calculateEstimatedDelivery = (pincode) => {
    if (!pincode || pincode.length !== 6) return '';
    
    // Metro cities get faster delivery (2-3 days)
    const metroPrefixes = ['400', '110', '560', '500', '600', '700', '411', '380', '462', '141'];
    const prefix = pincode.substring(0, 3);
    
    const isMetro = metroPrefixes.some(p => pincode.startsWith(p));
    const daysToAdd = isMetro ? 3 : 5;
    
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
    
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return deliveryDate.toLocaleDateString('en-IN', options);
  };

  const handlePincodeChange = (value) => {
    setAddress({ ...address, pincode: value });
    if (value.length === 6) {
      const delivery = calculateEstimatedDelivery(value);
      setEstimatedDelivery(delivery);
    } else {
      setEstimatedDelivery('');
    }
  };

  const handleAddressSubmit = async () => {
    // Validate address
    if (!address.name || !address.phone || !address.addressLine1 || !address.city || !address.state || !address.pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (address.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    if (address.pincode.length !== 6) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    
    // Proceed directly to Razorpay payment
    await processRazorpayPayment();
  };

  const processRazorpayPayment = async () => {
    setProcessing(true);
    
    try {
      // Create Razorpay order
      const r = await axios.post(`${API}/payment/create-order`, {
        origin_url: window.location.origin,
        payment_method: 'razorpay',
        coupon_code: couponApplied?.code || null,
        shipping_address: address,
        estimated_delivery: estimatedDelivery
      }, { withCredentials: true });
      
      // Open Razorpay checkout
      const options = {
        key: r.data.key_id,
        amount: r.data.amount,
        currency: 'INR',
        name: 'SnapAlign',
        description: `Order #${r.data.order_id}`,
        order_id: r.data.razorpay_order_id,
        handler: async function (response) {
          // Verify payment
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: r.data.order_id
            }, { withCredentials: true });
            
            clearCart();
            navigate(`/checkout/success?order_id=${r.data.order_id}`);
          } catch (e) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: address.name,
          email: user?.email || '',
          contact: address.phone
        },
        config: {
          display: {
            blocks: {
              utib: {
                name: "Pay using UPI",
                instruments: [
                  {
                    method: "upi",
                    flows: ["collect", "intent", "qr"]
                  }
                ]
              },
              other: {
                name: "Other Payment Methods",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" }
                ]
              }
            },
            sequence: ["block.utib", "block.other"],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        theme: {
          color: '#007AFF'
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
            toast.info('Payment cancelled');
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create order');
      setProcessing(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Move to address step
    setStep('address');
  };

  // Login prompt modal
  if (showLoginPrompt && !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#007AFF]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-[#007AFF]" />
          </div>
          <h2 className="text-xl font-medium text-white mb-3">Login Required</h2>
          <p className="text-white/50 text-sm mb-6">Please login to continue with your purchase</p>
          
          <Button 
            onClick={() => login()}
            className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12 text-sm font-medium mb-3"
          >
            Sign in with Google
          </Button>
          
          <button 
            onClick={() => setShowLoginPrompt(false)}
            className="text-white/40 text-sm hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Address collection step
  if (step === 'address') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setStep('checkout')} className="text-white/50 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-medium text-white">Delivery Address</h1>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6">
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Full Name *</label>
                <Input
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Phone Number *</label>
                <Input
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit mobile number"
                  className="bg-white/5 border-white/10 text-white"
                  maxLength={10}
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Address Line 1 *</label>
                <Input
                  value={address.addressLine1}
                  onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                  placeholder="House no, Building, Street"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Address Line 2 (Optional)</label>
                <Input
                  value={address.addressLine2}
                  onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                  placeholder="Apartment, Suite, Landmark"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">City *</label>
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="City"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-2 block">State *</label>
                  <Input
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="State"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Pincode */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Pincode *</label>
                <Input
                  value={address.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit pincode"
                  className="bg-white/5 border-white/10 text-white"
                  maxLength={6}
                />
                {estimatedDelivery && (
                  <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-green-400" />
                      <span className="text-green-400 text-sm">
                        Estimated Delivery: <strong>{estimatedDelivery}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/50">Shipping</span>
                <span className={shipping === 0 ? 'text-green-400' : 'text-white'}>
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">Discount</span>
                  <span className="text-green-400">-₹{discount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/10">
                <span className="text-base font-medium text-white">Total</span>
                <span className="text-xl font-semibold text-white">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleAddressSubmit}
              disabled={processing}
              className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12 text-sm font-medium mt-6"
            >
              {processing ? 'Processing...' : 'Proceed to Payment'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout screen
  return (
    <div data-testid="checkout-page" className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6">
          <ArrowLeft size={12} /> Back
        </button>
        <h1 className="text-2xl tracking-tight font-medium text-white mb-8" style={{ fontFamily: 'var(--font-heading)' }}>Checkout</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/40 mb-4 text-sm">Cart is empty</p>
            <Button onClick={() => navigate('/shop')} variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-lg">
              Shop
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Order Items — mobile: FIRST (top), desktop: left column row 2 */}
            <div className="order-1 lg:order-none lg:col-start-1 lg:col-span-3 lg:row-start-2 bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-4">Order Items ({cartCount})</h3>
              <div className="space-y-3">
                {cartItems.map(item => {
                  const key = item.cart_item_id || `${item.product_id}-${item.variant_id || 'base'}`;
                  const unitPrice = (item.product?.price || 0) + (item.variant?.price_modifier || 0);
                  const variantLabel = item.variant
                    ? (item.variant.options
                        ? Object.entries(item.variant.options).map(([k, v]) => v).join(' / ')
                        : item.variant.value || '')
                    : '';
                  const thumb = item.variant?.image || item.product?.image;
                  return (
                  <div key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.product?.name}</p>
                      {variantLabel && <p className="text-[10px] text-white/40 truncate">{variantLabel}</p>}
                      <p className="text-[10px] text-white/40">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-white">₹{(unitPrice * item.quantity).toLocaleString('en-IN')}</p>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary — mobile: SECOND, desktop: right column spanning both rows */}
            <div className="order-2 lg:order-none lg:col-start-4 lg:col-span-2 lg:row-start-1 lg:row-span-2">
              <div className="lg:sticky lg:top-20 border border-white/10 rounded-xl p-5 bg-[#0A0A0A]">
                <h2 className="text-base font-medium mb-4 text-white" style={{ fontFamily: 'var(--font-heading)' }}>Order Summary</h2>

                {/* Coupon Input */}
                <div className="mb-4">
                  {couponApplied ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-green-400" />
                        <span className="text-xs font-mono font-bold text-green-400">{couponApplied.code}</span>
                        <span className="text-[10px] text-green-400/70">-₹{discount.toFixed(0)}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        value={couponCode} 
                        onChange={e => setCouponCode(e.target.value.toUpperCase())} 
                        placeholder="Coupon code" 
                        className="flex-1 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-lg text-xs font-mono" 
                      />
                      <Button onClick={applyCoupon} disabled={validating} variant="outline" className="h-9 border-white/20 text-white hover:bg-white/5 rounded-lg text-xs px-3">
                        {validating ? '...' : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Subtotal ({cartCount})</span>
                    <span className="text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Shipping</span>
                    <span className={shipping === 0 ? 'text-green-400 text-xs' : 'text-white text-xs'}>
                      {shipping === 0 ? 'Free' : `₹${shipping}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">Coupon Discount</span>
                      <span className="text-green-400">-₹{discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/10 pt-2 flex justify-between">
                    <span className="text-sm font-medium text-white">Total</span>
                    <span className="text-lg font-semibold text-white">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <Button 
                  data-testid="checkout-pay-btn"
                  type="button"
                  onClick={handleProceedToPayment} 
                  disabled={processing} 
                  className="relative z-10 w-full bg-[#007AFF] hover:bg-[#005BB5] active:bg-[#004a99] text-white rounded-lg h-12 text-sm font-medium mt-4 touch-manipulation"
                >
                  {processing ? 'Processing...' : `Pay ₹${total.toLocaleString('en-IN')}`}
                </Button>

                <div className="flex items-center gap-1 justify-center mt-3">
                  <ShieldCheck size={12} className="text-green-400" />
                  <span className="text-[10px] text-white/30">100% Secure Payment via Razorpay</span>
                </div>
              </div>
            </div>

            {/* Payment Method info — mobile: THIRD (bottom), desktop: left column row 1 */}
            <div className="order-3 lg:order-none lg:col-start-1 lg:col-span-3 lg:row-start-1 bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
              <h2 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <CreditCard size={18} className="text-[#007AFF]" /> Payment Method
              </h2>

              <div className="bg-gradient-to-r from-[#007AFF]/10 to-purple-500/10 border border-[#007AFF]/30 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#007AFF]/20 rounded-xl flex items-center justify-center">
                    <CreditCard size={24} className="text-[#007AFF]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Secure Payment via Razorpay</p>
                    <p className="text-white/50 text-xs">Pay via UPI, Credit/Debit Card, Netbanking, or Wallet</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">UPI</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Credit Card</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Debit Card</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Netbanking</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Wallets</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
