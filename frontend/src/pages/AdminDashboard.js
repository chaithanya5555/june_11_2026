import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrencyDollar, Package, Cube, Users, Warning, DownloadSimple, Pencil, Trash, Plus, MagnifyingGlass, MapPin, SignOut, Gear, Lightning, Eye, EyeSlash, Tag, ChartLineUp, UserCircle, WhatsappLogo, QrCode, Check, X, Clock } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import VariantsEditor from '../components/admin/VariantsEditor';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DEFAULT_CATS = ['Tempered Glass', 'Cases', 'Holders', 'Cables & Chargers'];
const DEFAULT_BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi', 'Vivo', 'Oppo', 'Realme', 'Motorola', 'Nothing'];
const PIE_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [adminRole, setAdminRole] = useState('owner');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [deadStock, setDeadStock] = useState([]);
  const [settings, setSettings] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [trackingInputs, setTrackingInputs] = useState({});
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', cost_price: '', compare_at_price: '', category: 'Cases', brand: '', device_model: '', subcategory: '', image: '', stock: '100', bin_location: '', featured: false, warranty: '', images_text: '', video: '', variant_axes: [], variants: [] });
  const [editingProduct, setEditingProduct] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ razorpay_key_id: '', razorpay_key_secret: '', admin_password: '', whatsapp_number: '', upi_id: '', upi_qr_url: '', upi_name: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [couponDialog, setCouponDialog] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percentage', value: '', min_order_amount: '', max_uses: '', expires_at: '', active: true });
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [newUserDialog, setNewUserDialog] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', name: '', password: '', role: 'warehouse_manager' });
  const [pendingUTR, setPendingUTR] = useState([]);
  const [processingUTR, setProcessingUTR] = useState({});
  const [customCategories, setCustomCategories] = useState([]);
  const [customBrands, setCustomBrands] = useState([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newBrandInput, setNewBrandInput] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);

  // Combine default and custom categories/brands
  const CATS = [...new Set([...DEFAULT_CATS, ...customCategories])];
  const BRANDS = [...new Set([...DEFAULT_BRANDS, ...customBrands])];

  const isOwner = adminRole === 'owner';

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/admin/verify`, { withCredentials: true });
        setAuthed(true);
        setAdminRole(r.data.role || 'owner');
        setAdminName(r.data.name || 'Admin');
        fetchData(r.data.role || 'owner');
      } catch { setAuthed(false); setLoading(false); }
    })();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const payload = email ? { email, password } : { password };
      const r = await axios.post(`${API}/admin/login`, payload, { withCredentials: true });
      setAuthed(true);
      setAdminRole(r.data.role || 'owner');
      setAdminName(r.data.name || 'Admin');
      fetchData(r.data.role || 'owner');
    } catch { toast.error('Invalid credentials'); }
  };

  const handleLogout = async () => {
    await axios.post(`${API}/admin/logout`, {}, { withCredentials: true });
    setAuthed(false);
  };

  const fetchData = async (role) => {
    try {
      const promises = [
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/products`, { withCredentials: true }),
        axios.get(`${API}/admin/dead-stock`, { withCredentials: true }),
      ];
      if (role === 'owner') {
        promises.push(
          axios.get(`${API}/admin/orders`, { withCredentials: true }),
          axios.get(`${API}/admin/settings`, { withCredentials: true }),
          axios.get(`${API}/admin/coupons`, { withCredentials: true }),
          axios.get(`${API}/admin/analytics`, { withCredentials: true }),
          axios.get(`${API}/admin/users`, { withCredentials: true }),
        );
      }
      const results = await Promise.all(promises);
      setStats(results[0].data);
      setProducts(results[1].data);
      setDeadStock(results[2].data);
      if (role === 'owner') {
        setOrders(results[3].data);
        setSettings(results[4].data);
        setSettingsForm({
          razorpay_key_id: results[4].data.razorpay_key_id || '',
          razorpay_key_secret: '',
          admin_password: '',
          whatsapp_number: results[4].data.whatsapp_number || '',
          upi_id: results[4].data.upi_id || '',
          upi_qr_url: results[4].data.upi_qr_url || '',
          upi_name: results[4].data.upi_name || ''
        });
        setCoupons(results[5].data);
        setAnalytics(results[6].data);
        setAdminUsers(results[7].data);
        // Fetch pending UTR orders
        try {
          const utrRes = await axios.get(`${API}/admin/pending-utr`, { withCredentials: true });
          setPendingUTR(utrRes.data);
        } catch { 
          setPendingUTR([]); 
        }
      }
    } catch { 
      // Failed to load admin data 
    }
    setLoading(false);
  };

  const updateOrderStatus = async (id, status) => {
    try { await axios.put(`${API}/admin/orders/${id}`, { status }, { withCredentials: true }); toast.success('Updated'); fetchData(adminRole); } catch { toast.error('Failed'); }
  };

  const handleVerifyUTR = async (orderId, action) => {
    setProcessingUTR(p => ({ ...p, [orderId]: true }));
    try {
      await axios.post(`${API}/admin/verify-utr`, { order_id: orderId, action }, { withCredentials: true });
      toast.success(action === 'approve' ? 'Payment verified! Order confirmed.' : 'Payment rejected.');
      fetchData(adminRole);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to process');
    }
    setProcessingUTR(p => ({ ...p, [orderId]: false }));
  };

  const saveTracking = async (id) => {
    const tn = trackingInputs[id];
    if (!tn) return;
    try { await axios.put(`${API}/admin/orders/${id}`, { tracking_number: tn }, { withCredentials: true }); toast.success('Tracking saved'); fetchData(adminRole); } catch { toast.error('Failed'); }
  };

  const exportCSV = () => { window.open(`${API}/admin/export-orders`, '_blank'); };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const d = { ...productForm, price: parseFloat(productForm.price), cost_price: parseFloat(productForm.cost_price || '0'), stock: parseInt(productForm.stock) };
    if (productForm.compare_at_price) d.compare_at_price = parseFloat(productForm.compare_at_price);
    // Warranty: empty string → null (no warranty)
    d.warranty = productForm.warranty && productForm.warranty.trim() !== '' ? productForm.warranty.trim() : null;
    // Gallery images: parse textarea (one URL per line), filter empties
    d.images = (productForm.images_text || '')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    // Video: empty → null
    d.video = productForm.video && productForm.video.trim() !== '' ? productForm.video.trim() : null;
    // Variant axes + variants (both come from VariantsEditor state)
    d.variant_axes = productForm.variant_axes && productForm.variant_axes.length > 0 ? productForm.variant_axes : null;
    d.variants = productForm.variants && productForm.variants.length > 0
      ? productForm.variants.map(v => ({
          ...v,
          stock: parseInt(v.stock ?? 0, 10) || 0,
          price_modifier: parseFloat(v.price_modifier ?? 0) || 0,
        }))
      : null;
    // Remove helper field before sending
    delete d.images_text;
    try {
      if (editingProduct) await axios.put(`${API}/admin/products/${editingProduct}`, d, { withCredentials: true });
      else await axios.post(`${API}/admin/products`, d, { withCredentials: true });
      toast.success(editingProduct ? 'Updated' : 'Created');
      setDialogOpen(false); setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', cost_price: '', compare_at_price: '', category: 'Cases', brand: '', device_model: '', subcategory: '', image: '', stock: '100', bin_location: '', featured: false, warranty: '', images_text: '', video: '', variant_axes: [], variants: [] });
      fetchData(adminRole);
    } catch { toast.error('Failed'); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await axios.delete(`${API}/admin/products/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchData(adminRole); } catch { toast.error('Failed'); }
  };

  const openEdit = (p) => {
    setEditingProduct(p.product_id);
    setProductForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      cost_price: String(p.cost_price || ''),
      compare_at_price: String(p.compare_at_price || ''),
      category: p.category,
      brand: p.brand || '',
      device_model: p.device_model || '',
      subcategory: p.subcategory || '',
      image: p.image,
      stock: String(p.stock),
      bin_location: p.bin_location || '',
      featured: p.featured,
      warranty: p.warranty || '',
      images_text: (p.images || []).join('\n'),
      video: p.video || '',
      variant_axes: p.variant_axes || [],
      variants: p.variants || [],
    });
    setDialogOpen(true);
  };

  // ── Coupon Handlers ──
  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...couponForm, value: parseFloat(couponForm.value), min_order_amount: parseFloat(couponForm.min_order_amount || '0'), max_uses: parseInt(couponForm.max_uses || '0') };
    if (!couponForm.expires_at) delete payload.expires_at;
    try {
      if (editingCoupon) await axios.put(`${API}/admin/coupons/${editingCoupon}`, payload, { withCredentials: true });
      else await axios.post(`${API}/admin/coupons`, payload, { withCredentials: true });
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created');
      setCouponDialog(false); setEditingCoupon(null);
      setCouponForm({ code: '', type: 'percentage', value: '', min_order_amount: '', max_uses: '', expires_at: '', active: true });
      fetchData(adminRole);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await axios.delete(`${API}/admin/coupons/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchData(adminRole); } catch { toast.error('Failed'); }
  };

  const openEditCoupon = (c) => {
    setEditingCoupon(c.coupon_id);
    setCouponForm({ code: c.code, type: c.type, value: String(c.value), min_order_amount: String(c.min_order_amount || ''), max_uses: String(c.max_uses || ''), expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '', active: c.active });
    setCouponDialog(true);
  };

  // ── Admin User Handlers ──
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/users`, newUserForm, { withCredentials: true });
      toast.success('Admin user created');
      setNewUserDialog(false);
      setNewUserForm({ email: '', name: '', password: '', role: 'warehouse_manager' });
      fetchData(adminRole);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const deleteAdminUser = async (id) => {
    if (!window.confirm('Delete this admin user?')) return;
    try { await axios.delete(`${API}/admin/users/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchData(adminRole); } catch { toast.error('Failed'); }
  };

  // ── Settings ──
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const payload = {};
    if (settingsForm.razorpay_key_id && settingsForm.razorpay_key_id !== settings?.razorpay_key_id) payload.razorpay_key_id = settingsForm.razorpay_key_id;
    if (settingsForm.razorpay_key_secret) payload.razorpay_key_secret = settingsForm.razorpay_key_secret;
    if (settingsForm.admin_password) payload.admin_password = settingsForm.admin_password;
    if (settingsForm.whatsapp_number !== (settings?.whatsapp_number || '')) payload.whatsapp_number = settingsForm.whatsapp_number;
    if (settingsForm.upi_id !== (settings?.upi_id || '')) payload.upi_id = settingsForm.upi_id;
    if (settingsForm.upi_qr_url !== (settings?.upi_qr_url || '')) payload.upi_qr_url = settingsForm.upi_qr_url;
    if (settingsForm.upi_name !== (settings?.upi_name || '')) payload.upi_name = settingsForm.upi_name;
    if (Object.keys(payload).length === 0) { toast.info('No changes to save'); setSavingSettings(false); return; }
    try {
      const res = await axios.put(`${API}/admin/settings`, payload, { withCredentials: true });
      toast.success(res.data.message);
      if (res.data.demo_mode === false) toast.success('Live mode activated!');
      fetchData(adminRole);
    } catch { toast.error('Failed to save'); }
    setSavingSettings(false);
  };

  const stockColor = (s) => s < 5 ? 'text-red-400 bg-red-500/10' : s <= 20 ? 'text-amber-400 bg-amber-500/10' : 'text-green-400 bg-green-500/10';
  const stockLabel = (s) => s < 5 ? 'CRITICAL' : s <= 20 ? 'LOW' : 'IN STOCK';
  const filteredOrders = orders.filter(o => !orderSearch || o.order_id.toLowerCase().includes(orderSearch.toLowerCase()) || (o.user_name || '').toLowerCase().includes(orderSearch.toLowerCase()));

  if (!authed) {
    return (
      <div data-testid="admin-login-page" className="min-h-screen bg-black flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-96 bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
          <h1 className="text-lg font-medium text-white mb-1 text-center" style={{ fontFamily: 'var(--font-heading)' }}>Admin Login</h1>
          <p className="text-[10px] text-white/30 text-center mb-5">Enter credentials to access the dashboard</p>
          <div className="space-y-3">
            <Input data-testid="admin-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (e.g. owner@snapalign.com)" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-lg" />
            <div className="relative">
              <Input 
                data-testid="admin-password-input" 
                type={showLoginPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Password" 
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-lg pr-10" 
                required 
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showLoginPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Button data-testid="admin-login-btn" type="submit" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg mt-4">Login</Button>
          <p className="text-[9px] text-white/20 text-center mt-3">Legacy: leave email blank, enter admin password only</p>
        </form>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-white" style={{ fontFamily: 'var(--font-heading)' }}>Admin Dashboard</h1>
            <p className="text-[10px] text-white/30 mt-0.5">Logged in as <span className="text-[#007AFF]">{adminName}</span> <span className="text-white/20">({adminRole === 'owner' ? 'Owner' : 'Warehouse Manager'})</span></p>
          </div>
          <Button data-testid="admin-logout-btn" onClick={handleLogout} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/5 rounded-lg text-xs"><SignOut size={14} className="mr-1" /> Logout</Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Revenue', value: `₹${stats.total_revenue.toLocaleString('en-IN')}`, icon: <CurrencyDollar size={16} />, cls: 'text-white' },
              { label: 'Net Profit', value: `₹${stats.net_profit.toLocaleString('en-IN')}`, icon: <CurrencyDollar size={16} />, cls: 'text-green-400' },
              { label: 'Projected', value: `₹${stats.projected_revenue.toLocaleString('en-IN')}`, icon: <Lightning size={16} />, cls: 'text-[#007AFF]', sub: `After ${stats.total_fees.toLocaleString('en-IN')} (2%) fee` },
              { label: 'Orders', value: stats.total_orders, icon: <Package size={16} />, cls: 'text-white' },
              { label: 'Users', value: stats.total_users, icon: <Users size={16} />, cls: 'text-white' },
            ].map((s) => (
              <div key={s.label} data-testid={`stat-${s.label.toLowerCase()}`} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/40 mb-1">{s.icon}<span className="text-[10px] uppercase tracking-widest">{s.label}</span></div>
                <p className={`text-lg font-semibold ${s.cls}`} style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
                {s.sub && <p className="text-[9px] text-white/30 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Stock Alert */}
        {stats && stats.critical_stock.length > 0 && (
          <div data-testid="critical-stock-alert" className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2"><Warning size={16} className="text-red-400" /><span className="text-xs font-bold text-red-400 uppercase tracking-widest">Critical Stock Alert</span></div>
            <div className="flex flex-wrap gap-2">{stats.critical_stock.map(p => <span key={p.product_id} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">{p.name} ({p.stock} left)</span>)}</div>
          </div>
        )}

        <Tabs defaultValue={isOwner ? "payments" : "warehouse"} className="w-full">
          <TabsList className="mb-4 bg-[#0A0A0A] border border-white/10 flex-wrap h-auto gap-0.5 p-1">
            {isOwner && <TabsTrigger data-testid="admin-payments-tab" value="payments" className="text-xs"><Clock size={12} className="mr-1" />Pending Payments {pendingUTR.length > 0 && <span className="ml-1 bg-amber-500 text-black text-[10px] px-1.5 py-0.5 rounded-full">{pendingUTR.length}</span>}</TabsTrigger>}
            {isOwner && <TabsTrigger data-testid="admin-orders-tab" value="orders" className="text-xs">Orders</TabsTrigger>}
            <TabsTrigger data-testid="admin-products-tab" value="products" className="text-xs">Products</TabsTrigger>
            <TabsTrigger data-testid="admin-warehouse-tab" value="warehouse" className="text-xs">Warehouse</TabsTrigger>
            <TabsTrigger data-testid="admin-deadstock-tab" value="deadstock" className="text-xs">Dead Stock</TabsTrigger>
            {isOwner && <TabsTrigger data-testid="admin-coupons-tab" value="coupons" className="text-xs"><Tag size={12} className="mr-1" />Coupons</TabsTrigger>}
            {isOwner && <TabsTrigger data-testid="admin-analytics-tab" value="analytics" className="text-xs"><ChartLineUp size={12} className="mr-1" />Analytics</TabsTrigger>}
            {isOwner && <TabsTrigger data-testid="admin-team-tab" value="team" className="text-xs"><UserCircle size={12} className="mr-1" />Team</TabsTrigger>}
            {isOwner && <TabsTrigger data-testid="admin-settings-tab" value="settings" className="text-xs"><Gear size={12} className="mr-1" />Settings</TabsTrigger>}
          </TabsList>

          {/* PENDING UTR PAYMENTS (Owner only) */}
          {isOwner && (
            <TabsContent value="payments">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={18} className="text-amber-400" />
                  <h3 className="text-sm font-medium text-white">Pending Payment Verifications</h3>
                </div>
                <p className="text-xs text-white/40">Customers have paid via UPI and entered their UTR. Verify each payment before confirming the order.</p>
              </div>
              
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white/40 text-[10px]">Order ID</TableHead>
                      <TableHead className="text-white/40 text-[10px]">Customer</TableHead>
                      <TableHead className="text-white/40 text-[10px]">Amount</TableHead>
                      <TableHead className="text-white/40 text-[10px]">UTR Number</TableHead>
                      <TableHead className="text-white/40 text-[10px]">Submitted</TableHead>
                      <TableHead className="text-white/40 text-[10px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUTR.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-white/30 py-8 text-sm">
                          No pending verifications 🎉
                        </TableCell>
                      </TableRow>
                    )}
                    {pendingUTR.map(order => (
                      <TableRow key={order.order_id} data-testid={`pending-utr-${order.order_id}`} className="border-white/5">
                        <TableCell className="text-xs font-mono text-[#007AFF]">{order.order_id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-xs text-white">{order.customer_name || 'N/A'}</p>
                            <p className="text-[10px] text-white/40">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-white">₹{order.total?.toLocaleString('en-IN')}</TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-amber-500/20 text-amber-400 px-2 py-1 rounded">{order.utr}</code>
                        </TableCell>
                        <TableCell className="text-[10px] text-white/40">
                          {order.utr_submitted_at ? new Date(order.utr_submitted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              data-testid={`approve-utr-${order.order_id}`}
                              onClick={() => handleVerifyUTR(order.order_id, 'approve')}
                              disabled={processingUTR[order.order_id]}
                              size="sm"
                              className="h-7 px-3 bg-green-500 hover:bg-green-600 text-white text-[10px] rounded"
                            >
                              <Check size={12} className="mr-1" /> Approve
                            </Button>
                            <Button
                              data-testid={`reject-utr-${order.order_id}`}
                              onClick={() => handleVerifyUTR(order.order_id, 'reject')}
                              disabled={processingUTR[order.order_id]}
                              size="sm"
                              variant="outline"
                              className="h-7 px-3 border-red-500/50 text-red-400 hover:bg-red-500/10 text-[10px] rounded"
                            >
                              <X size={12} className="mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {/* ORDERS (Owner only) */}
          {isOwner && (
            <TabsContent value="orders">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative"><MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><Input data-testid="order-search" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search orders..." className="pl-8 bg-[#0A0A0A] border-white/10 text-white placeholder:text-white/20 rounded-lg text-xs" /></div>
                <Button data-testid="export-csv-btn" onClick={exportCSV} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/5 rounded-lg text-xs"><DownloadSimple size={14} className="mr-1" /> Export CSV</Button>
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/10">
                    <TableHead className="text-white/40 text-[10px]">Order</TableHead><TableHead className="text-white/40 text-[10px]">Customer</TableHead><TableHead className="text-white/40 text-[10px]">Total</TableHead><TableHead className="text-white/40 text-[10px]">Coupon</TableHead><TableHead className="text-white/40 text-[10px]">Status</TableHead><TableHead className="text-white/40 text-[10px]">Tracking</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-white/30 py-8 text-sm">No orders</TableCell></TableRow>}
                    {filteredOrders.map(o => (
                      <TableRow key={o.order_id} data-testid={`admin-order-${o.order_id}`} className="border-white/5">
                        <TableCell className="text-xs font-mono text-white">{o.order_id}</TableCell>
                        <TableCell className="text-xs text-white/60">{o.user_name || o.user_email}</TableCell>
                        <TableCell>
                          <div>
                            <span className="text-xs font-medium text-white">₹{o.total?.toLocaleString('en-IN')}</span>
                            {o.discount > 0 && <span className="text-[9px] text-green-400 ml-1">-₹{o.discount}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-white/40">{o.coupon_code || '-'}</TableCell>
                        <TableCell>
                          <Select value={o.status} onValueChange={v => updateOrderStatus(o.order_id, v)}>
                            <SelectTrigger data-testid={`order-status-${o.order_id}`} className="w-28 h-7 text-[10px] bg-white/5 border-white/10 text-white rounded"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#0A0A0A] border-white/10">
                              {['pending_payment','confirmed','shipped','delivered','cancelled'].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Input data-testid={`tracking-input-${o.order_id}`} value={trackingInputs[o.order_id] ?? o.tracking_number ?? ''} onChange={e => setTrackingInputs(t => ({...t, [o.order_id]: e.target.value}))} placeholder="Tracking #" className="w-28 h-7 text-[10px] bg-white/5 border-white/10 text-white rounded" />
                            <Button data-testid={`save-tracking-${o.order_id}`} onClick={() => saveTracking(o.order_id)} size="sm" className="h-7 px-2 bg-[#007AFF] hover:bg-[#005BB5] text-[10px] rounded">Save</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {/* PRODUCTS */}
          <TabsContent value="products">
            <div className="flex justify-end mb-4">
              {isOwner && (
                <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', cost_price: '', compare_at_price: '', category: 'Cases', brand: '', device_model: '', subcategory: '', image: '', stock: '100', bin_location: '', featured: false, warranty: '', images_text: '', video: '', variant_axes: [], variants: [] }); } }}>
                  <DialogTrigger asChild><Button data-testid="add-product-btn" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg text-xs"><Plus size={14} className="mr-1" /> Add Product</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl bg-[#0A0A0A] border-white/10 text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-white">{editingProduct ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
                    <form onSubmit={handleProductSubmit} className="space-y-3">
                      <div><Label className="text-white/60 text-xs">Name</Label><Input data-testid="product-name-input" value={productForm.name} onChange={e => setProductForm(f => ({...f, name: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div><Label className="text-white/60 text-xs">Description</Label><Input data-testid="product-desc-input" value={productForm.description} onChange={e => setProductForm(f => ({...f, description: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-white/60 text-xs">Price</Label><Input data-testid="product-price-input" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({...f, price: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                        <div><Label className="text-white/60 text-xs">Cost</Label><Input data-testid="product-cost-input" type="number" step="0.01" value={productForm.cost_price} onChange={e => setProductForm(f => ({...f, cost_price: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                        <div><Label className="text-white/60 text-xs">Compare At</Label><Input data-testid="product-compare-input" type="number" step="0.01" value={productForm.compare_at_price} onChange={e => setProductForm(f => ({...f, compare_at_price: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-white/60 text-xs">Stock</Label><Input data-testid="product-stock-input" type="number" value={productForm.stock} onChange={e => setProductForm(f => ({...f, stock: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                        <div><Label className="text-white/60 text-xs">Bin Location</Label><Input data-testid="product-bin-input" value={productForm.bin_location} onChange={e => setProductForm(f => ({...f, bin_location: e.target.value}))} placeholder="Shelf B, Bin 4" className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                      </div>
                      <div><Label className="text-white/60 text-xs">Category</Label>
                        {!showNewCategoryInput ? (
                          <Select value={productForm.category} onValueChange={v => {
                            if (v === '__add_new__') {
                              setShowNewCategoryInput(true);
                            } else {
                              setProductForm(f => ({...f, category: v}));
                            }
                          }}>
                            <SelectTrigger data-testid="product-category-select" className="bg-white/5 border-white/10 text-white rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#0A0A0A] border-white/10">
                              {CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              <SelectItem value="__add_new__" className="text-[#007AFF] border-t border-white/10 mt-1 pt-1">
                                <span className="flex items-center gap-1"><Plus size={14} /> Add New Category</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex gap-2">
                            <Input 
                              value={newCategoryInput} 
                              onChange={e => setNewCategoryInput(e.target.value)} 
                              placeholder="Enter new category name" 
                              className="bg-white/5 border-white/10 text-white rounded-lg flex-1" 
                              autoFocus
                            />
                            <Button 
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (newCategoryInput.trim()) {
                                  setCustomCategories(prev => [...prev, newCategoryInput.trim()]);
                                  setProductForm(f => ({...f, category: newCategoryInput.trim()}));
                                  setNewCategoryInput('');
                                }
                                setShowNewCategoryInput(false);
                              }}
                              className="bg-[#007AFF] hover:bg-[#005BB5]"
                            >
                              <Check size={14} />
                            </Button>
                            <Button 
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => { setShowNewCategoryInput(false); setNewCategoryInput(''); }}
                              className="text-white/50 hover:text-white"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-white/60 text-xs">Phone Brand</Label>
                          {!showNewBrandInput ? (
                            <Select value={productForm.brand || 'none'} onValueChange={v => {
                              if (v === '__add_new__') {
                                setShowNewBrandInput(true);
                              } else {
                                setProductForm(f => ({...f, brand: v === 'none' ? '' : v, device_model: ''}));
                              }
                            }}>
                              <SelectTrigger data-testid="product-brand-select" className="bg-white/5 border-white/10 text-white rounded-lg"><SelectValue placeholder="Select Brand" /></SelectTrigger>
                              <SelectContent className="bg-[#0A0A0A] border-white/10">
                                <SelectItem value="none">-- Select Brand --</SelectItem>
                                {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                <SelectItem value="__add_new__" className="text-[#007AFF] border-t border-white/10 mt-1 pt-1">
                                  <span className="flex items-center gap-1"><Plus size={14} /> Add New Brand</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex gap-1">
                              <Input 
                                value={newBrandInput} 
                                onChange={e => setNewBrandInput(e.target.value)} 
                                placeholder="New brand" 
                                className="bg-white/5 border-white/10 text-white rounded-lg flex-1 text-xs" 
                                autoFocus
                              />
                              <Button 
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (newBrandInput.trim()) {
                                    setCustomBrands(prev => [...prev, newBrandInput.trim()]);
                                    setProductForm(f => ({...f, brand: newBrandInput.trim(), device_model: ''}));
                                    setNewBrandInput('');
                                  }
                                  setShowNewBrandInput(false);
                                }}
                                className="bg-[#007AFF] hover:bg-[#005BB5] px-2"
                              >
                                <Check size={12} />
                              </Button>
                              <Button 
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => { setShowNewBrandInput(false); setNewBrandInput(''); }}
                                className="text-white/50 hover:text-white px-2"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div><Label className="text-white/60 text-xs">Device Model</Label>
                          <Input data-testid="product-device-model-input" value={productForm.device_model} onChange={e => setProductForm(f => ({...f, device_model: e.target.value}))} placeholder="e.g. iPhone 17 Pro, Galaxy S25 Ultra" className="bg-white/5 border-white/10 text-white rounded-lg" />
                        </div>
                      </div>
                      <div><Label className="text-white/60 text-xs">Main Image URL</Label><Input data-testid="product-image-input" value={productForm.image} onChange={e => setProductForm(f => ({...f, image: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div>
                        <Label className="text-white/60 text-xs">Warranty <span className="text-white/30">(leave blank for no warranty)</span></Label>
                        <Input data-testid="product-warranty-input" value={productForm.warranty} onChange={e => setProductForm(f => ({...f, warranty: e.target.value}))} placeholder='e.g. "1 Year", "6 Months", "Lifetime"' className="bg-white/5 border-white/10 text-white rounded-lg" />
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs">Gallery Images <span className="text-white/30">(one URL per line — shown as sliding carousel on product page)</span></Label>
                        <textarea
                          data-testid="product-gallery-input"
                          value={productForm.images_text}
                          onChange={e => setProductForm(f => ({...f, images_text: e.target.value}))}
                          rows={4}
                          placeholder={"https://...image1.jpg\nhttps://...image2.jpg\nhttps://...image3.jpg"}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#007AFF]/50 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs">Product Video URL <span className="text-white/30">(mp4 — plays after images)</span></Label>
                        <Input data-testid="product-video-input" value={productForm.video} onChange={e => setProductForm(f => ({...f, video: e.target.value}))} placeholder="https://...video.mp4" className="bg-white/5 border-white/10 text-white rounded-lg" />
                      </div>

                      <VariantsEditor
                        axes={productForm.variant_axes}
                        variants={productForm.variants}
                        onAxesChange={(axes) => setProductForm(f => ({ ...f, variant_axes: axes }))}
                        onVariantsChange={(variants) => setProductForm(f => ({ ...f, variants }))}
                      />

                      <Button data-testid="save-product-btn" type="submit" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg">{editingProduct ? 'Update' : 'Create'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/40 text-[10px]">Product</TableHead><TableHead className="text-white/40 text-[10px]">Category</TableHead><TableHead className="text-white/40 text-[10px]">Price</TableHead><TableHead className="text-white/40 text-[10px]">Cost</TableHead><TableHead className="text-white/40 text-[10px]">Stock</TableHead><TableHead className="text-white/40 text-[10px]">Variants</TableHead><TableHead className="text-white/40 text-[10px]">Bin</TableHead>{isOwner && <TableHead className="text-white/40 text-[10px]">Actions</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.product_id} data-testid={`admin-product-${p.product_id}`} className="border-white/5">
                      <TableCell><div className="flex items-center gap-2"><div className="w-8 h-8 bg-white/5 rounded overflow-hidden flex-shrink-0"><img src={p.image} alt="" className="w-full h-full object-cover" /></div><span className="text-xs text-white truncate max-w-[120px]">{p.name}</span></div></TableCell>
                      <TableCell className="text-[10px] text-white/40">{p.category}</TableCell>
                      <TableCell className="text-xs text-white">₹{p.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-white/40">₹{(p.cost_price || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stockColor(p.stock)}`}>{stockLabel(p.stock)} ({p.stock})</span></TableCell>
                      <TableCell className="text-[10px] text-white/40">{p.variants?.length || 0}</TableCell>
                      <TableCell className="text-[10px] text-white/30"><MapPin size={10} className="inline mr-0.5" />{p.bin_location || '-'}</TableCell>
                      {isOwner && <TableCell><div className="flex gap-1"><button data-testid={`edit-product-${p.product_id}`} onClick={() => openEdit(p)} className="p-1 text-white/30 hover:text-[#007AFF] hover:bg-white/5 rounded"><Pencil size={12} /></button><button data-testid={`delete-product-${p.product_id}`} onClick={() => deleteProduct(p.product_id)} className="p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash size={12} /></button></div></TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* WAREHOUSE */}
          <TabsContent value="warehouse">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/40 text-[10px]">Product</TableHead><TableHead className="text-white/40 text-[10px]">Stock Status</TableHead><TableHead className="text-white/40 text-[10px]">Qty</TableHead><TableHead className="text-white/40 text-[10px]">Bin Location</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...products].sort((a, b) => a.stock - b.stock).map(p => (
                    <TableRow key={p.product_id} className="border-white/5">
                      <TableCell className="text-xs text-white">{p.name}</TableCell>
                      <TableCell><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stockColor(p.stock)}`}>{stockLabel(p.stock)}</span></TableCell>
                      <TableCell className="text-xs text-white">{p.stock}</TableCell>
                      <TableCell className="text-xs text-white/40"><MapPin size={10} className="inline mr-0.5" />{p.bin_location || 'Not assigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* DEAD STOCK */}
          <TabsContent value="deadstock">
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-white/40 mb-4">Products with zero sales in the last 30 days</p>
              {deadStock.length === 0 ? <p className="text-sm text-white/30 text-center py-8">No dead stock detected</p> : (
                <div className="space-y-2">{deadStock.map(p => (
                  <div key={p.product_id} data-testid={`deadstock-${p.product_id}`} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                    <div className="w-10 h-10 bg-white/5 rounded overflow-hidden flex-shrink-0"><img src={p.image} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1"><p className="text-xs text-white font-medium">{p.name}</p><p className="text-[10px] text-white/30">{p.category} | Stock: {p.stock} | {p.bin_location || 'No bin'}</p></div>
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">DEAD STOCK</span>
                  </div>
                ))}</div>
              )}
            </div>
          </TabsContent>

          {/* COUPONS (Owner only) */}
          {isOwner && (
            <TabsContent value="coupons">
              <div className="flex justify-end mb-4">
                <Dialog open={couponDialog} onOpenChange={v => { setCouponDialog(v); if (!v) { setEditingCoupon(null); setCouponForm({ code: '', type: 'percentage', value: '', min_order_amount: '', max_uses: '', expires_at: '', active: true }); } }}>
                  <DialogTrigger asChild><Button data-testid="add-coupon-btn" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg text-xs"><Plus size={14} className="mr-1" /> Create Coupon</Button></DialogTrigger>
                  <DialogContent className="max-w-md bg-[#0A0A0A] border-white/10 text-white">
                    <DialogHeader><DialogTitle className="text-white">{editingCoupon ? 'Edit' : 'Create'} Coupon</DialogTitle></DialogHeader>
                    <form onSubmit={handleCouponSubmit} className="space-y-3">
                      <div><Label className="text-white/60 text-xs">Coupon Code</Label><Input data-testid="coupon-code-input" value={couponForm.code} onChange={e => setCouponForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="e.g. SAVE20" className="bg-white/5 border-white/10 text-white rounded-lg font-mono" required /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-white/60 text-xs">Type</Label>
                          <Select value={couponForm.type} onValueChange={v => setCouponForm(f => ({...f, type: v}))}>
                            <SelectTrigger data-testid="coupon-type-select" className="bg-white/5 border-white/10 text-white rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#0A0A0A] border-white/10">
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label className="text-white/60 text-xs">Value</Label><Input data-testid="coupon-value-input" type="number" step="0.01" value={couponForm.value} onChange={e => setCouponForm(f => ({...f, value: e.target.value}))} placeholder={couponForm.type === 'percentage' ? '10' : '100'} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-white/60 text-xs">Min Order (₹)</Label><Input data-testid="coupon-min-input" type="number" value={couponForm.min_order_amount} onChange={e => setCouponForm(f => ({...f, min_order_amount: e.target.value}))} placeholder="0" className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                        <div><Label className="text-white/60 text-xs">Max Uses (0=unlimited)</Label><Input data-testid="coupon-max-uses-input" type="number" value={couponForm.max_uses} onChange={e => setCouponForm(f => ({...f, max_uses: e.target.value}))} placeholder="0" className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                      </div>
                      <div><Label className="text-white/60 text-xs">Expires (optional)</Label><Input data-testid="coupon-expires-input" type="date" value={couponForm.expires_at} onChange={e => setCouponForm(f => ({...f, expires_at: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                      <Button data-testid="save-coupon-btn" type="submit" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg">{editingCoupon ? 'Update Coupon' : 'Create Coupon'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/10">
                    <TableHead className="text-white/40 text-[10px]">Code</TableHead><TableHead className="text-white/40 text-[10px]">Type</TableHead><TableHead className="text-white/40 text-[10px]">Value</TableHead><TableHead className="text-white/40 text-[10px]">Min Order</TableHead><TableHead className="text-white/40 text-[10px]">Uses</TableHead><TableHead className="text-white/40 text-[10px]">Status</TableHead><TableHead className="text-white/40 text-[10px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {coupons.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-white/30 py-8 text-sm">No coupons</TableCell></TableRow>}
                    {coupons.map(c => (
                      <TableRow key={c.coupon_id} data-testid={`coupon-${c.coupon_id}`} className="border-white/5">
                        <TableCell className="text-xs font-mono font-bold text-[#007AFF]">{c.code}</TableCell>
                        <TableCell className="text-[10px] text-white/40 capitalize">{c.type}</TableCell>
                        <TableCell className="text-xs text-white">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</TableCell>
                        <TableCell className="text-xs text-white/40">₹{c.min_order_amount || 0}</TableCell>
                        <TableCell className="text-xs text-white/40">{c.used_count}/{c.max_uses || '∞'}</TableCell>
                        <TableCell><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.active ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>{c.active ? 'ACTIVE' : 'INACTIVE'}</span></TableCell>
                        <TableCell><div className="flex gap-1"><button data-testid={`edit-coupon-${c.coupon_id}`} onClick={() => openEditCoupon(c)} className="p-1 text-white/30 hover:text-[#007AFF] hover:bg-white/5 rounded"><Pencil size={12} /></button><button data-testid={`delete-coupon-${c.coupon_id}`} onClick={() => deleteCoupon(c.coupon_id)} className="p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash size={12} /></button></div></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {/* ANALYTICS (Owner only) */}
          {isOwner && (
            <TabsContent value="analytics">
              {analytics ? (
                <div className="space-y-6">
                  {/* Revenue Trend */}
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Revenue Trend (Last 30 Days)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={analytics.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} tickFormatter={v => v.slice(5)} />
                        <YAxis tick={{ fontSize: 9, fill: '#666' }} tickFormatter={v => `₹${v}`} />
                        <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#999' }} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                        <Line type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Category Revenue */}
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Revenue by Category</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analytics.category_revenue} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                          <XAxis type="number" tick={{ fontSize: 9, fill: '#666' }} tickFormatter={v => `₹${v}`} />
                          <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: '#999' }} width={100} />
                          <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#007AFF" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Order Status Breakdown */}
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
                      <h3 className="text-sm font-medium text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Orders by Status</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={analytics.status_breakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }) => `${status} (${count})`} labelLine={false}>
                            {analytics.status_breakdown.map((item, i) => <Cell key={item.status || `status-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: 8, fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-medium text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Top Selling Products</h3>
                    <div className="space-y-2">
                      {analytics.top_products.map((p, i) => (
                        <div key={p.product_id || p.name || `product-${i}`} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                          <span className="text-[10px] font-bold text-white/30 w-6 text-center">#{i + 1}</span>
                          <span className="text-xs text-white flex-1 truncate">{p.name}</span>
                          <span className="text-[10px] text-white/40">{p.quantity} sold</span>
                          <span className="text-xs font-medium text-[#007AFF]">₹{p.revenue.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      {analytics.top_products.length === 0 && <p className="text-sm text-white/30 text-center py-4">No sales data yet</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-white/30 text-sm">Loading analytics...</div>
              )}
            </TabsContent>
          )}

          {/* TEAM (Owner only) */}
          {isOwner && (
            <TabsContent value="team">
              <div className="flex justify-end mb-4">
                <Dialog open={newUserDialog} onOpenChange={setNewUserDialog}>
                  <DialogTrigger asChild><Button data-testid="add-admin-user-btn" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg text-xs"><Plus size={14} className="mr-1" /> Add Admin User</Button></DialogTrigger>
                  <DialogContent className="max-w-md bg-[#0A0A0A] border-white/10 text-white">
                    <DialogHeader><DialogTitle className="text-white">Add Admin User</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                      <div><Label className="text-white/60 text-xs">Email</Label><Input data-testid="new-user-email" value={newUserForm.email} onChange={e => setNewUserForm(f => ({...f, email: e.target.value}))} type="email" className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div><Label className="text-white/60 text-xs">Name</Label><Input data-testid="new-user-name" value={newUserForm.name} onChange={e => setNewUserForm(f => ({...f, name: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div><Label className="text-white/60 text-xs">Password</Label><Input data-testid="new-user-password" type="password" value={newUserForm.password} onChange={e => setNewUserForm(f => ({...f, password: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div><Label className="text-white/60 text-xs">Role</Label>
                        <Select value={newUserForm.role} onValueChange={v => setNewUserForm(f => ({...f, role: v}))}>
                          <SelectTrigger data-testid="new-user-role" className="bg-white/5 border-white/10 text-white rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#0A0A0A] border-white/10">
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="warehouse_manager">Warehouse Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button data-testid="create-user-btn" type="submit" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg">Create User</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="border-white/10">
                    <TableHead className="text-white/40 text-[10px]">Name</TableHead><TableHead className="text-white/40 text-[10px]">Email</TableHead><TableHead className="text-white/40 text-[10px]">Role</TableHead><TableHead className="text-white/40 text-[10px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {adminUsers.map(u => (
                      <TableRow key={u.admin_user_id} data-testid={`admin-user-${u.admin_user_id}`} className="border-white/5">
                        <TableCell className="text-xs text-white">{u.name}</TableCell>
                        <TableCell className="text-xs text-white/60">{u.email}</TableCell>
                        <TableCell><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${u.role === 'owner' ? 'text-[#007AFF] bg-[#007AFF]/10' : 'text-amber-400 bg-amber-500/10'}`}>{u.role === 'owner' ? 'OWNER' : 'WAREHOUSE MGR'}</span></TableCell>
                        <TableCell><button data-testid={`delete-admin-user-${u.admin_user_id}`} onClick={() => deleteAdminUser(u.admin_user_id)} className="p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash size={12} /></button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {/* SETTINGS (Owner only) */}
          {isOwner && (
            <TabsContent value="settings">
              <div className="max-w-xl space-y-6">
                {/* UPI Payment Settings */}
                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
                  <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><QrCode size={16} className="text-[#007AFF]" /> UPI Payment Settings</h3>
                  <div className="mb-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400">
                    <strong>Manual Payment Mode</strong> — Customers scan QR and enter UTR for verification.
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white/60 text-xs">UPI ID</Label>
                      <Input data-testid="settings-upi-id" value={settingsForm.upi_id} onChange={e => setSettingsForm(f => ({...f, upi_id: e.target.value}))} placeholder="yourname@upi" className="bg-white/5 border-white/10 text-white rounded-lg font-mono text-xs" />
                      <p className="text-[10px] text-white/20 mt-1">e.g., paytm@bank, phonepay@ybl</p>
                    </div>
                    <div>
                      <Label className="text-white/60 text-xs">UPI Name (Payee Name)</Label>
                      <Input data-testid="settings-upi-name" value={settingsForm.upi_name} onChange={e => setSettingsForm(f => ({...f, upi_name: e.target.value}))} placeholder="Your Business Name" className="bg-white/5 border-white/10 text-white rounded-lg text-xs" />
                    </div>
                    <div>
                      <Label className="text-white/60 text-xs">QR Code URL</Label>
                      <Input data-testid="settings-upi-qr" value={settingsForm.upi_qr_url} onChange={e => setSettingsForm(f => ({...f, upi_qr_url: e.target.value}))} placeholder="https://..." className="bg-white/5 border-white/10 text-white rounded-lg text-xs" />
                      <p className="text-[10px] text-white/20 mt-1">Upload QR image and paste the URL here</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
                  <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><Gear size={16} className="text-[#007AFF]" /> Payment Gateway Keys (Optional)</h3>
                  {settings?.demo_mode && (
                    <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                      <Lightning size={14} /> <span><strong>Demo Mode Active</strong> -- Replace keys below with your real Razorpay test keys to enable live payments.</span>
                    </div>
                  )}
                  {settings && !settings.demo_mode && (
                    <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 flex items-center gap-2">
                      <Lightning size={14} /> <span><strong>Live Mode</strong> -- Razorpay is connected and processing payments.</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white/60 text-xs">Razorpay Key ID</Label>
                      <Input data-testid="settings-key-id" value={settingsForm.razorpay_key_id} onChange={e => setSettingsForm(f => ({...f, razorpay_key_id: e.target.value}))} placeholder="rzp_test_..." className="bg-white/5 border-white/10 text-white rounded-lg font-mono text-xs" />
                      <p className="text-[10px] text-white/20 mt-1">Starts with rzp_test_ (test) or rzp_live_ (production)</p>
                    </div>
                    <div>
                      <Label className="text-white/60 text-xs">Razorpay Key Secret</Label>
                      <div className="relative">
                        <Input data-testid="settings-key-secret" type={showSecret ? 'text' : 'password'} value={settingsForm.razorpay_key_secret} onChange={e => setSettingsForm(f => ({...f, razorpay_key_secret: e.target.value}))} placeholder={settings?.razorpay_key_secret_masked || 'Enter new secret...'} className="bg-white/5 border-white/10 text-white rounded-lg font-mono text-xs pr-10" />
                        <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">{showSecret ? <EyeSlash size={14} /> : <Eye size={14} />}</button>
                      </div>
                      <p className="text-[10px] text-white/20 mt-1">Leave blank to keep current secret</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
                  <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><WhatsappLogo size={16} className="text-green-400" /> WhatsApp Notifications</h3>
                  <div>
                    <Label className="text-white/60 text-xs">Business WhatsApp Number</Label>
                    <Input data-testid="settings-whatsapp" value={settingsForm.whatsapp_number} onChange={e => setSettingsForm(f => ({...f, whatsapp_number: e.target.value}))} placeholder="e.g. 919876543210" className="bg-white/5 border-white/10 text-white rounded-lg text-xs" />
                    <p className="text-[10px] text-white/20 mt-1">Country code + number without + sign. Shown on order confirmation for customers to share.</p>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
                  <h3 className="text-base font-medium text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Admin Password</h3>
                  <div>
                    <Label className="text-white/60 text-xs">New Admin Password</Label>
                    <Input data-testid="settings-admin-password" type="password" value={settingsForm.admin_password} onChange={e => setSettingsForm(f => ({...f, admin_password: e.target.value}))} placeholder="Leave blank to keep current" className="bg-white/5 border-white/10 text-white rounded-lg text-xs" />
                  </div>
                </div>

                <Button data-testid="save-settings-btn" onClick={handleSaveSettings} disabled={savingSettings} className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg px-6">
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
