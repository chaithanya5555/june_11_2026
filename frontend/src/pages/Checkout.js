import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, CreditCard, Tag, ShieldCheck, Copy, Check, Clock, WarningCircle, QrCode, DeviceMobile, WhatsappLogo } from '@phosphor-icons/react';
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
  
  const [step, setStep] = useState('checkout'); // 'checkout', 'payment', 'utr', 'verification'
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [couponApplied, setCouponApplied] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [upiConfig, setUpiConfig] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const shipping = cartTotal >= 500 ? 0 : 49;
  const total = Math.max(0, cartTotal + shipping - discount);

  useEffect(() => {
    // Fetch UPI config on load
    axios.get(`${API}/payment/upi-config`)
      .then(r => setUpiConfig(r.data))
      .catch(console.error);
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

  const handleProceedToPayment = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    
    setProcessing(true);
    try {
      // Create manual UPI order
      const r = await axios.post(`${API}/payment/manual-upi/create-order`, {
        origin_url: window.location.origin,
        payment_method: 'manual_upi',
        coupon_code: couponApplied?.code || null
      }, { withCredentials: true });
      
      setOrderData(r.data);
      setStep('payment');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create order');
    }
    setProcessing(false);
  };

  const copyUPI = () => {
    navigator.clipboard.writeText(orderData?.upi_id || upiConfig?.upi_id);
    setCopied(true);
    toast.success('UPI ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitUTR = async () => {
    if (!utr.trim() || utr.length < 6) {
      toast.error('Please enter a valid UTR number');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/payment/manual-upi/submit-utr`, {
        utr: utr.trim(),
        order_id: orderData.order_id
      }, { withCredentials: true });
      
      setStep('verification');
      clearCart();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit UTR');
    }
    setProcessing(false);
  };

  const openWhatsApp = () => {
    const phone = upiConfig?.whatsapp_number || '919876543210';
    const message = `Hi, I need help with my order ${orderData?.order_id}. UTR: ${utr}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
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

  // Verification complete screen
  if (step === 'verification') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-amber-400" />
          </div>
          
          <h2 className="text-2xl font-medium text-white mb-3">Payment Under Verification</h2>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <p className="text-amber-400 text-sm">
              Your order will be confirmed within <strong>1 hour</strong> after verification.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <div className="flex justify-between mb-2">
              <span className="text-white/50 text-sm">Order ID</span>
              <span className="text-white font-mono">{orderData?.order_id}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-white/50 text-sm">Amount</span>
              <span className="text-white">₹{orderData?.amount?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">UTR</span>
              <span className="text-white font-mono">{utr}</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <WarningCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-blue-400 text-sm font-medium mb-1">Not verified in 1 hour?</p>
                <p className="text-blue-400/70 text-xs">
                  Raise a complaint on WhatsApp. <strong className="text-blue-400">Order will be placed or refunded within 48 hours.</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={openWhatsApp}
              variant="outline"
              className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10 rounded-lg h-12"
            >
              <WhatsappLogo size={20} className="mr-2" />
              WhatsApp Support
            </Button>
            <Button 
              onClick={() => navigate('/')}
              className="flex-1 bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Payment QR screen
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <button onClick={() => setStep('checkout')} className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white mb-6">
            <ArrowLeft size={12} /> Back
          </button>

          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#007AFF]/20 to-purple-500/20 p-6 text-center border-b border-white/10">
              <h1 className="text-xl font-medium text-white mb-2">Pay via UPI</h1>
              <div className="text-3xl font-bold text-white">₹{orderData?.amount?.toLocaleString('en-IN')}</div>
              <p className="text-white/50 text-sm mt-1">Order: {orderData?.order_id}</p>
            </div>

            {/* QR Code Section */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* QR Code */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="bg-white p-4 rounded-2xl mb-4">
                    {orderData?.upi_qr_url ? (
                      <iframe 
                        src={orderData.upi_qr_url} 
                        className="w-48 h-48 border-0"
                        title="UPI QR Code"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                        <QrCode size={100} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-white/40 text-xs">Scan with any UPI app</p>
                </div>

                {/* Instructions */}
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <DeviceMobile size={18} className="text-[#007AFF]" />
                    How to Pay
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                      <p className="text-white/70 text-sm">Scan QR code with any UPI app (PhonePe, GPay, Paytm)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                      <p className="text-white/70 text-sm">Enter amount: <span className="text-white font-medium">₹{orderData?.amount?.toLocaleString('en-IN')}</span></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#007AFF]/20 text-[#007AFF] flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                      <p className="text-white/70 text-sm">Complete payment and note the <span className="text-amber-400 font-medium">UTR number</span></p>
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <p className="text-white/40 text-xs mb-2">Or pay directly to UPI ID:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[#007AFF] font-mono text-sm bg-[#007AFF]/10 px-3 py-2 rounded-lg">
                        {orderData?.upi_id}
                      </code>
                      <button 
                        onClick={copyUPI}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-white/50" />}
                      </button>
                    </div>
                    <p className="text-white/30 text-xs mt-2">Pay to: {orderData?.upi_name}</p>
                  </div>
                </div>
              </div>

              {/* UTR Input */}
              <div className="border-t border-white/10 pt-6 mt-6">
                <h3 className="text-white font-medium mb-3">After Payment - Enter UTR Number</h3>
                <p className="text-white/40 text-xs mb-4">
                  Find UTR in your UPI app → Transaction History → Click on this payment → UTR/Reference Number
                </p>
                <div className="flex gap-3">
                  <Input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="Enter 12-digit UTR number"
                    className="flex-1 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl text-center font-mono tracking-widest"
                    maxLength={12}
                  />
                  <Button 
                    onClick={handleSubmitUTR}
                    disabled={processing || utr.length < 6}
                    className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-12 px-8"
                  >
                    {processing ? 'Verifying...' : 'Submit UTR'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="mt-6 text-center">
            <p className="text-white/30 text-xs mb-2">Need help? Contact us on WhatsApp</p>
            <button onClick={openWhatsApp} className="text-green-400 text-sm hover:underline flex items-center gap-1 mx-auto">
              <WhatsappLogo size={16} /> WhatsApp Support
            </button>
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
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Payment Info */}
            <div className="lg:col-span-3 space-y-6">
              {/* UPI Payment Info */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
                <h2 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <CreditCard size={18} className="text-[#007AFF]" /> Payment Method
                </h2>
                
                <div className="bg-gradient-to-r from-[#007AFF]/10 to-purple-500/10 border border-[#007AFF]/30 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#007AFF]/20 rounded-xl flex items-center justify-center">
                      <QrCode size={24} className="text-[#007AFF]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">UPI Payment (Scan & Pay)</p>
                      <p className="text-white/50 text-xs">Pay via PhonePe, GPay, Paytm or any UPI app</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <WarningCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-400 text-xs">
                      After payment, enter your UTR number. Your order will be confirmed within 1 hour after verification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-4">Order Items ({cartCount})</h3>
                <div className="space-y-3">
                  {cartItems.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.product?.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{item.product?.name}</p>
                        <p className="text-[10px] text-white/40">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-white">₹{(item.product?.price * item.quantity).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-2">
              <div className="sticky top-20 border border-white/10 rounded-xl p-5 bg-[#0A0A0A]">
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
                  onClick={handleProceedToPayment} 
                  disabled={processing} 
                  className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg h-12 text-sm font-medium mt-4"
                >
                  {processing ? 'Processing...' : `Pay ₹${total.toLocaleString('en-IN')}`}
                </Button>

                <div className="flex items-center gap-1 justify-center mt-3">
                  <ShieldCheck size={12} className="text-green-400" />
                  <span className="text-[10px] text-white/30">100% Secure Payment</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
