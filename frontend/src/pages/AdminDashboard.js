import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrencyDollar, Package, Cube, Users, Warning, DownloadSimple, Pencil, Trash, Plus, MagnifyingGlass, MapPin, SignOut, Gear, Lightning, Eye, EyeSlash } from '@phosphor-icons/react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const CATS = ['Tempered Glass', 'Cases', 'Holders', 'Cables & Chargers'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [deadStock, setDeadStock] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [trackingInputs, setTrackingInputs] = useState({});
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', cost_price: '', compare_at_price: '', category: 'Cases', image: '', stock: '100', bin_location: '', featured: false });
  const [editingProduct, setEditingProduct] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ razorpay_key_id: '', razorpay_key_secret: '', admin_password: '' });
  const [showSecret, setShowSecret] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    (async () => {
      try { await axios.get(`${API}/admin/verify`, { withCredentials: true }); setAuthed(true); fetchData(); } catch { setAuthed(false); setLoading(false); }
    })();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/admin/login`, { password }, { withCredentials: true }); setAuthed(true); fetchData(); } catch { toast.error('Invalid password'); }
  };

  const handleLogout = async () => {
    await axios.post(`${API}/admin/logout`, {}, { withCredentials: true });
    setAuthed(false);
  };

  const fetchData = async () => {
    try {
      const [s, o, p, d, st] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/orders`, { withCredentials: true }),
        axios.get(`${API}/admin/products`, { withCredentials: true }),
        axios.get(`${API}/admin/dead-stock`, { withCredentials: true }),
        axios.get(`${API}/admin/settings`, { withCredentials: true }),
      ]);
      setStats(s.data); setOrders(o.data); setProducts(p.data); setDeadStock(d.data); setSettings(st.data);
      setSettingsForm({ razorpay_key_id: st.data.razorpay_key_id || '', razorpay_key_secret: '', admin_password: '' });
    } catch {}
    setLoading(false);
  };

  const updateOrderStatus = async (id, status) => {
    try { await axios.put(`${API}/admin/orders/${id}`, { status }, { withCredentials: true }); toast.success('Updated'); fetchData(); } catch { toast.error('Failed'); }
  };

  const saveTracking = async (id) => {
    const tn = trackingInputs[id];
    if (!tn) return;
    try { await axios.put(`${API}/admin/orders/${id}`, { tracking_number: tn }, { withCredentials: true }); toast.success('Tracking saved'); fetchData(); } catch { toast.error('Failed'); }
  };

  const exportCSV = () => { window.open(`${API}/admin/export-orders`, '_blank'); };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const d = { ...productForm, price: parseFloat(productForm.price), cost_price: parseFloat(productForm.cost_price || '0'), stock: parseInt(productForm.stock) };
    if (productForm.compare_at_price) d.compare_at_price = parseFloat(productForm.compare_at_price);
    try {
      if (editingProduct) await axios.put(`${API}/admin/products/${editingProduct}`, d, { withCredentials: true });
      else await axios.post(`${API}/admin/products`, d, { withCredentials: true });
      toast.success(editingProduct ? 'Updated' : 'Created');
      setDialogOpen(false); setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', cost_price: '', compare_at_price: '', category: 'Cases', image: '', stock: '100', bin_location: '', featured: false });
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await axios.delete(`${API}/admin/products/${id}`, { withCredentials: true }); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed'); }
  };

  const openEdit = (p) => {
    setEditingProduct(p.product_id);
    setProductForm({ name: p.name, description: p.description, price: String(p.price), cost_price: String(p.cost_price || ''), compare_at_price: String(p.compare_at_price || ''), category: p.category, image: p.image, stock: String(p.stock), bin_location: p.bin_location || '', featured: p.featured });
    setDialogOpen(true);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const payload = {};
    if (settingsForm.razorpay_key_id && settingsForm.razorpay_key_id !== settings?.razorpay_key_id) payload.razorpay_key_id = settingsForm.razorpay_key_id;
    if (settingsForm.razorpay_key_secret) payload.razorpay_key_secret = settingsForm.razorpay_key_secret;
    if (settingsForm.admin_password) payload.admin_password = settingsForm.admin_password;
    if (Object.keys(payload).length === 0) { toast.info('No changes to save'); setSavingSettings(false); return; }
    try {
      const res = await axios.put(`${API}/admin/settings`, payload, { withCredentials: true });
      toast.success(res.data.message);
      if (res.data.demo_mode === false) toast.success('Live mode activated!');
      fetchData();
    } catch { toast.error('Failed to save'); }
    setSavingSettings(false);
  };

  const stockColor = (s) => s < 5 ? 'text-red-400 bg-red-500/10' : s <= 20 ? 'text-amber-400 bg-amber-500/10' : 'text-green-400 bg-green-500/10';
  const stockLabel = (s) => s < 5 ? 'CRITICAL' : s <= 20 ? 'LOW' : 'IN STOCK';
  const filteredOrders = orders.filter(o => !orderSearch || o.order_id.toLowerCase().includes(orderSearch.toLowerCase()) || (o.user_name || '').toLowerCase().includes(orderSearch.toLowerCase()));

  if (!authed) {
    return (
      <div data-testid="admin-login-page" className="min-h-screen bg-black flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-80 bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
          <h1 className="text-lg font-medium text-white mb-4 text-center" style={{ fontFamily: 'var(--font-heading)' }}>Admin Login</h1>
          <Input data-testid="admin-password-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-lg mb-3" />
          <Button data-testid="admin-login-btn" type="submit" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg">Login</Button>
        </form>
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium text-white" style={{ fontFamily: 'var(--font-heading)' }}>Admin Dashboard</h1>
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
            ].map((s, i) => (
              <div key={i} data-testid={`stat-${s.label.toLowerCase()}`} className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
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

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-4 bg-[#0A0A0A] border border-white/10">
            <TabsTrigger data-testid="admin-orders-tab" value="orders">Orders</TabsTrigger>
            <TabsTrigger data-testid="admin-products-tab" value="products">Products</TabsTrigger>
            <TabsTrigger data-testid="admin-warehouse-tab" value="warehouse">Warehouse</TabsTrigger>
            <TabsTrigger data-testid="admin-deadstock-tab" value="deadstock">Dead Stock</TabsTrigger>
            <TabsTrigger data-testid="admin-settings-tab" value="settings"><Gear size={12} className="mr-1" /> Settings</TabsTrigger>
          </TabsList>

          {/* ORDERS */}
          <TabsContent value="orders">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative"><MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><Input data-testid="order-search" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search orders..." className="pl-8 bg-[#0A0A0A] border-white/10 text-white placeholder:text-white/20 rounded-lg text-xs" /></div>
              <Button data-testid="export-csv-btn" onClick={exportCSV} variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/5 rounded-lg text-xs"><DownloadSimple size={14} className="mr-1" /> Export CSV</Button>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-white/10">
                  <TableHead className="text-white/40 text-[10px]">Order</TableHead><TableHead className="text-white/40 text-[10px]">Customer</TableHead><TableHead className="text-white/40 text-[10px]">Total</TableHead><TableHead className="text-white/40 text-[10px]">Method</TableHead><TableHead className="text-white/40 text-[10px]">Status</TableHead><TableHead className="text-white/40 text-[10px]">Tracking</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-white/30 py-8 text-sm">No orders</TableCell></TableRow>}
                  {filteredOrders.map(o => (
                    <TableRow key={o.order_id} data-testid={`admin-order-${o.order_id}`} className="border-white/5">
                      <TableCell className="text-xs font-mono text-white">{o.order_id}</TableCell>
                      <TableCell className="text-xs text-white/60">{o.user_name || o.user_email}</TableCell>
                      <TableCell className="text-xs font-medium text-white">₹{o.total?.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-[10px] text-white/40">{o.payment_method || '-'}</TableCell>
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

          {/* PRODUCTS */}
          <TabsContent value="products">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', cost_price: '', compare_at_price: '', category: 'Cases', image: '', stock: '100', bin_location: '', featured: false }); } }}>
                <DialogTrigger asChild><Button data-testid="add-product-btn" className="bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg text-xs"><Plus size={14} className="mr-1" /> Add Product</Button></DialogTrigger>
                <DialogContent className="max-w-md bg-[#0A0A0A] border-white/10 text-white">
                  <DialogHeader><DialogTitle className="text-white">{editingProduct ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-3">
                    <div><Label className="text-white/60 text-xs">Name</Label><Input data-testid="product-name-input" value={productForm.name} onChange={e => setProductForm(f => ({...f, name: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                    <div><Label className="text-white/60 text-xs">Description</Label><Input data-testid="product-desc-input" value={productForm.description} onChange={e => setProductForm(f => ({...f, description: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-white/60 text-xs">Price (₹)</Label><Input data-testid="product-price-input" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({...f, price: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div><Label className="text-white/60 text-xs">Cost (₹)</Label><Input data-testid="product-cost-input" type="number" step="0.01" value={productForm.cost_price} onChange={e => setProductForm(f => ({...f, cost_price: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                      <div><Label className="text-white/60 text-xs">Compare At</Label><Input data-testid="product-compare-input" type="number" step="0.01" value={productForm.compare_at_price} onChange={e => setProductForm(f => ({...f, compare_at_price: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-white/60 text-xs">Stock</Label><Input data-testid="product-stock-input" type="number" value={productForm.stock} onChange={e => setProductForm(f => ({...f, stock: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                      <div><Label className="text-white/60 text-xs">Bin Location</Label><Input data-testid="product-bin-input" value={productForm.bin_location} onChange={e => setProductForm(f => ({...f, bin_location: e.target.value}))} placeholder="Shelf B, Bin 4" className="bg-white/5 border-white/10 text-white rounded-lg" /></div>
                    </div>
                    <div><Label className="text-white/60 text-xs">Category</Label>
                      <Select value={productForm.category} onValueChange={v => setProductForm(f => ({...f, category: v}))}><SelectTrigger data-testid="product-category-select" className="bg-white/5 border-white/10 text-white rounded-lg"><SelectValue /></SelectTrigger><SelectContent className="bg-[#0A0A0A] border-white/10">{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div><Label className="text-white/60 text-xs">Image URL</Label><Input data-testid="product-image-input" value={productForm.image} onChange={e => setProductForm(f => ({...f, image: e.target.value}))} className="bg-white/5 border-white/10 text-white rounded-lg" required /></div>
                    <Button data-testid="save-product-btn" type="submit" className="w-full bg-[#007AFF] hover:bg-[#005BB5] text-white rounded-lg">{editingProduct ? 'Update' : 'Create'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow className="border-white/10"><TableHead className="text-white/40 text-[10px]">Product</TableHead><TableHead className="text-white/40 text-[10px]">Category</TableHead><TableHead className="text-white/40 text-[10px]">Price</TableHead><TableHead className="text-white/40 text-[10px]">Cost</TableHead><TableHead className="text-white/40 text-[10px]">Stock</TableHead><TableHead className="text-white/40 text-[10px]">Bin</TableHead><TableHead className="text-white/40 text-[10px]">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.product_id} data-testid={`admin-product-${p.product_id}`} className="border-white/5">
                      <TableCell><div className="flex items-center gap-2"><div className="w-8 h-8 bg-white/5 rounded overflow-hidden flex-shrink-0"><img src={p.image} alt="" className="w-full h-full object-cover" /></div><span className="text-xs text-white truncate max-w-[120px]">{p.name}</span></div></TableCell>
                      <TableCell className="text-[10px] text-white/40">{p.category}</TableCell>
                      <TableCell className="text-xs text-white">₹{p.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-white/40">₹{(p.cost_price || 0).toLocaleString('en-IN')}</TableCell>
                      <TableCell><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stockColor(p.stock)}`}>{stockLabel(p.stock)} ({p.stock})</span></TableCell>
                      <TableCell className="text-[10px] text-white/30"><MapPin size={10} className="inline mr-0.5" />{p.bin_location || '-'}</TableCell>
                      <TableCell><div className="flex gap-1"><button data-testid={`edit-product-${p.product_id}`} onClick={() => openEdit(p)} className="p-1 text-white/30 hover:text-[#007AFF] hover:bg-white/5 rounded"><Pencil size={12} /></button><button data-testid={`delete-product-${p.product_id}`} onClick={() => deleteProduct(p.product_id)} className="p-1 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash size={12} /></button></div></TableCell>
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
                  {products.sort((a, b) => a.stock - b.stock).map(p => (
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

          {/* SETTINGS */}
          <TabsContent value="settings">
            <div className="max-w-xl space-y-6">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6">
                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><Gear size={16} className="text-[#007AFF]" /> Payment Gateway Keys</h3>
                {settings?.demo_mode && (
                  <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                    <Lightning size={14} /> <span><strong>Demo Mode Active</strong> — Replace keys below with your real Razorpay test keys to enable live payments.</span>
                  </div>
                )}
                {settings && !settings.demo_mode && (
                  <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 flex items-center gap-2">
                    <Lightning size={14} /> <span><strong>Live Mode</strong> — Razorpay is connected and processing payments.</span>
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
        </Tabs>
      </div>
    </div>
  );
}
