import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, CreditCard, Tag, ShieldCheck, DeviceMobile } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// UPI App icons as SVG components
const PhonePeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <circle cx="12" cy="12" r="12" fill="#5f259f"/>
    <path d="M7 8.5h2.5l2 7h-2l-0.5-2h-2l-0.5 2h-2l2.5-7zm1.25 3.5h1l-0.5-2-0.5 2z" fill="white"/>
    <path d="M12.5 8.5h2l1.5 4 1.5-4h2l-2.5 7h-2l-2.5-7z" fill="white"/>
  </svg>
);

const GooglePayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <rect width="24" height="24" rx="12" fill="white"/>
    <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#4285F4" transform="scale(0.5) translate(12, 12)"/>
  </svg>
);

const PaytmIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
    <rect width="24" height="24" rx="12" fill="#00BAF2"/>
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Pay</text>
  </svg>
);

export default function Checkout() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { cartItems, cartTotal, cartCount, clearCart } = useCart();
  
  const [step, setStep] = useState('checkout'); // 'checkout', 'address', 'payment-select'
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [couponApplied, setCouponApplied] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
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

  // Check if user is on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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
    
    // Move to payment selection
    setStep('payment-select');
  };

  // Create order and get order data
  const createOrder = async () => {
    try {
      const r = await axios.post(`${API}/payment/create-order`, {
        origin_url: window.location.origin,
        payment_method: 'razorpay',
        coupon_code: couponApplied?.code || null,
        shipping_address: address,
        estimated_delivery: estimatedDelivery
      }, { withCredentials: true });
      
      setOrderData(r.data);
      return r.data;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create order');
      return null;
    }
  };

  // Open UPI app with deep link
  const openUPIApp = async (appType) => {
    setProcessing(true);
    
    try {
      // Create order first
      let order = orderData;
      if (!order) {
        order = await createOrder();
        if (!order) {
          setProcessing(false);
          return;
        }
      }
      
      // Generate UPI deep link
      const upiId = 'merchant@upi'; // This would be your merchant UPI ID
      const merchantName = 'SnapAlign';
      const amount = (order.amount / 100).toFixed(2); // Convert paise to rupees
      const transactionNote = `Order ${order.order_id}`;
      const transactionRef = order.order_id;
      
      // UPI intent URL
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${transactionRef}`;
      
      // App-specific deep links
      const appLinks = {
        phonepe: `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${transactionRef}`,
        gpay: `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${transactionRef}`,
        paytm: `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${transactionRef}`
      };
      
      if (isMobile) {
        // Try to open the specific app, fallback to generic UPI
        const appLink = appLinks[appType] || upiUrl;
        
        // Create a hidden link and click it
        const link = document.createElement('a');
        link.href = appLink;
        link.click();
        
        // Show toast with instructions
        toast.info(`Opening ${appType === 'phonepe' ? 'PhonePe' : appType === 'gpay' ? 'Google Pay' : 'Paytm'}...`, {
          description: 'Complete the payment in the app'
        });
        
        // After a delay, fallback to Razorpay if app didn't open
        setTimeout(() => {
          // Open Razorpay as fallback with UPI preferred
          processRazorpayPayment(order, 'upi');
        }, 3000);
        
      } else {
        // On desktop, use Razorpay with UPI option
        toast.info('UPI apps work best on mobile. Opening payment options...');
        processRazorpayPayment(order, 'upi');
      }
      
    } catch (e) {
      toast.error('Failed to initiate payment');
    }
    
    setProcessing(false);
  };

  const processRazorpayPayment = async (existingOrder = null, preferredMethod = null) => {
    setProcessing(true);
    
    try {
      // Use existing order or create new one
      let order = existingOrder || orderData;
      if (!order) {
        order = await createOrder();
        if (!order) {
          setProcessing(false);
          return;
        }
      }
      
      // Configure Razorpay options
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: 'INR',
        name: 'SnapAlign',
        description: `Order #${order.order_id}`,
        order_id: order.razorpay_order_id,
        handler: async function (response) {
          // Verify payment
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order.order_id
            }, { withCredentials: true });
            
            clearCart();
            navigate(`/checkout/success?order_id=${order.order_id}`);
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
            sequence: preferredMethod === 'upi' ? ["block.utib", "block.other"] : ["block.utib", "block.other"],
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

  // Payment Method Selection screen
  if (step === 'payment-select') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setStep('address')} className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6">
            <ArrowLeft size={12} /> Back to Address
          </button>

          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#007AFF]/20 to-purple-500/20 p-6 text-center border-b border-white/10">
              <h1 className="text-xl font-medium text-white mb-2">Choose Payment Method</h1>
              <div className="text-3xl font-bold text-white">₹{total.toLocaleString('en-IN')}</div>
            </div>

            {/* UPI Apps Section */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DeviceMobile size={18} className="text-[#007AFF]" />
                <h3 className="text-sm font-medium text-white">Pay with UPI Apps</h3>
                {isMobile && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Recommended</span>}
              </div>
              
              {/* UPI App Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* PhonePe */}
                <button 
                  onClick={() => openUPIApp('phonepe')}
                  disabled={processing}
                  className="flex flex-col items-center gap-2 p-4 bg-[#5f259f]/10 hover:bg-[#5f259f]/20 border border-[#5f259f]/30 hover:border-[#5f259f]/50 rounded-xl transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-[#5f259f] rounded-xl flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">PhonePe</span>
                </button>

                {/* Google Pay */}
                <button 
                  onClick={() => openUPIApp('gpay')}
                  disabled={processing}
                  className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                    <svg viewBox="0 0 48 48" className="w-8 h-8">
                      <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-white font-medium">Google Pay</span>
                </button>

                {/* Paytm */}
                <button 
                  onClick={() => openUPIApp('paytm')}
                  disabled={processing}
                  className="flex flex-col items-center gap-2 p-4 bg-[#00BAF2]/10 hover:bg-[#00BAF2]/20 border border-[#00BAF2]/30 hover:border-[#00BAF2]/50 rounded-xl transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 bg-[#00BAF2] rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">Pay</span>
                  </div>
                  <span className="text-xs text-white font-medium">Paytm</span>
                </button>
              </div>

              {!isMobile && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
                  <p className="text-amber-400 text-xs text-center">
                    📱 UPI app buttons work best on mobile. On desktop, we&apos;ll show QR code options.
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0A0A0A] px-4 text-xs text-white/40">or pay with</span>
                </div>
              </div>

              {/* Other Payment Methods */}
              <button 
                onClick={() => processRazorpayPayment()}
                disabled={processing}
                className="w-full p-4 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 border border-[#007AFF]/30 hover:border-[#007AFF]/50 rounded-xl transition-all flex items-center gap-4 disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-[#007AFF]/20 rounded-xl flex items-center justify-center">
                  <CreditCard size={24} className="text-[#007AFF]" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-medium">Card / Netbanking / Wallet</h3>
                  <p className="text-white/50 text-xs">Credit Card, Debit Card, Netbanking, UPI QR</p>
                </div>
                <ArrowLeft size={16} className="rotate-180 text-white/30" />
              </button>

              {processing && (
                <div className="text-center py-4 mt-4">
                  <div className="inline-block w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white/50 text-sm mt-2">Processing...</p>
                </div>
              )}
            </div>

            {/* Security Badge */}
            <div className="p-4 border-t border-white/10 flex items-center justify-center gap-2 text-white/40 text-xs">
              <ShieldCheck size={14} />
              100% Secure Payments • Powered by Razorpay
            </div>
          </div>
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
              {processing ? 'Processing...' : 'Choose Payment Method'}
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
                  <span className="text-[10px] text-white/30">100% Secure Payment</span>
                </div>
              </div>
            </div>

            {/* Payment Method info — mobile: THIRD (bottom), desktop: left column row 1 */}
            <div className="order-3 lg:order-none lg:col-start-1 lg:col-span-3 lg:row-start-1 bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
              <h2 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                <CreditCard size={18} className="text-[#007AFF]" /> Payment Options
              </h2>

              {/* UPI Apps Preview */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-[#5f259f] rounded-lg flex items-center justify-center border-2 border-[#0A0A0A]">
                    <span className="text-white text-[8px] font-bold">Pe</span>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border-2 border-[#0A0A0A]">
                    <span className="text-[10px]">G</span>
                  </div>
                  <div className="w-8 h-8 bg-[#00BAF2] rounded-lg flex items-center justify-center border-2 border-[#0A0A0A]">
                    <span className="text-white text-[8px] font-bold">Pay</span>
                  </div>
                </div>
                <span className="text-white/60 text-xs">PhonePe, Google Pay, Paytm & more</span>
              </div>

              <div className="bg-gradient-to-r from-[#007AFF]/10 to-purple-500/10 border border-[#007AFF]/30 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#007AFF]/20 rounded-xl flex items-center justify-center">
                    <CreditCard size={24} className="text-[#007AFF]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Multiple Payment Options</p>
                    <p className="text-white/50 text-xs">UPI Apps, Cards, Netbanking, Wallets</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <div className="bg-[#5f259f]/20 rounded-lg px-3 py-1.5 text-xs text-[#a78bfa]">PhonePe</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Google Pay</div>
                <div className="bg-[#00BAF2]/20 rounded-lg px-3 py-1.5 text-xs text-[#00BAF2]">Paytm</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Credit Card</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Debit Card</div>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/60">Netbanking</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
