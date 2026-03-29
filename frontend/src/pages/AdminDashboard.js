import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, CurrencyDollar, Cube, Pencil, Trash, Plus } from '@phosphor-icons/react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category: 'Phone Cases', image: '', stock: '100', featured: false });
  const [editingProduct, setEditingProduct] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) { login(); return; }
    if (user.role !== 'admin') { navigate('/'); return; }
    fetchData();
  }, [user, login, navigate]);

  const fetchData = async () => {
    try {
      const [s, o, p] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/orders`, { withCredentials: true }),
        axios.get(`${API}/admin/products`, { withCredentials: true }),
      ]);
      setStats(s.data);
      setOrders(o.data);
      setProducts(p.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}`, { status }, { withCredentials: true });
      toast.success('Order updated');
      fetchData();
    } catch { toast.error('Update failed'); }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const data = { ...productForm, price: parseFloat(productForm.price), stock: parseInt(productForm.stock) };
    try {
      if (editingProduct) {
        await axios.put(`${API}/admin/products/${editingProduct}`, data, { withCredentials: true });
        toast.success('Product updated');
      } else {
        await axios.post(`${API}/admin/products`, data, { withCredentials: true });
        toast.success('Product created');
      }
      setDialogOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '', price: '', category: 'Phone Cases', image: '', stock: '100', featured: false });
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API}/admin/products/${productId}`, { withCredentials: true });
      toast.success('Product deleted');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const openEdit = (p) => {
    setEditingProduct(p.product_id);
    setProductForm({ name: p.name, description: p.description, price: String(p.price), category: p.category, image: p.image, stock: String(p.stock), featured: p.featured });
    setDialogOpen(true);
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div data-testid="admin-dashboard" className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-medium mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Admin Dashboard</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Revenue', value: `$${stats.total_revenue.toFixed(2)}`, icon: <CurrencyDollar size={18} /> },
              { label: 'Orders', value: stats.total_orders, icon: <Package size={18} /> },
              { label: 'Products', value: stats.total_products, icon: <Cube size={18} /> },
              { label: 'Users', value: stats.total_users, icon: <Users size={18} /> },
            ].map((s, i) => (
              <div key={i} data-testid={`stat-${s.label.toLowerCase()}`} className="bg-white border border-zinc-200 rounded-lg p-5">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  {s.icon}
                  <span className="text-xs uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-2xl font-semibold text-zinc-950" style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger data-testid="admin-orders-tab" value="orders">Orders</TabsTrigger>
            <TabsTrigger data-testid="admin-products-tab" value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-zinc-500 py-8">No orders yet</TableCell></TableRow>
                  )}
                  {orders.map(order => (
                    <TableRow key={order.order_id} data-testid={`admin-order-${order.order_id}`}>
                      <TableCell className="text-xs font-mono">#{order.order_id.slice(-8)}</TableCell>
                      <TableCell className="text-sm">{order.user_name || order.user_email}</TableCell>
                      <TableCell className="text-sm font-medium">${order.total?.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-md ${order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : order.status === 'shipped' ? 'bg-blue-100 text-blue-800' : order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select value={order.status} onValueChange={(v) => handleOrderStatus(order.order_id, v)}>
                          <SelectTrigger data-testid={`order-status-select-${order.order_id}`} className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending_payment">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingProduct(null); setProductForm({ name: '', description: '', price: '', category: 'Phone Cases', image: '', stock: '100', featured: false }); } }}>
                <DialogTrigger asChild>
                  <Button data-testid="add-product-btn" className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md text-sm">
                    <Plus size={14} className="mr-1" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input data-testid="product-name-input" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input data-testid="product-desc-input" value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Price ($)</Label>
                        <Input data-testid="product-price-input" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} required />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input data-testid="product-stock-input" type="number" value={productForm.stock} onChange={e => setProductForm(f => ({ ...f, stock: e.target.value }))} required />
                      </div>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger data-testid="product-category-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Phone Cases', 'Screen Protectors', 'Chargers', 'Cables', 'Earphones', 'Mounts & Stands', 'Power Banks'].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input data-testid="product-image-input" value={productForm.image} onChange={e => setProductForm(f => ({ ...f, image: e.target.value }))} required />
                    </div>
                    <Button data-testid="save-product-btn" type="submit" className="w-full bg-zinc-950 text-white hover:bg-zinc-800 rounded-md">
                      {editingProduct ? 'Update' : 'Create'} Product
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.product_id} data-testid={`admin-product-${p.product_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-100 rounded overflow-hidden flex-shrink-0">
                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-medium truncate max-w-[160px]">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">{p.category}</TableCell>
                      <TableCell className="text-sm font-medium">${p.price.toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{p.stock}</TableCell>
                      <TableCell className="text-sm">{p.avg_rating || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button data-testid={`edit-product-${p.product_id}`} onClick={() => openEdit(p)} className="p-1.5 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded">
                            <Pencil size={14} />
                          </button>
                          <button data-testid={`delete-product-${p.product_id}`} onClick={() => handleDeleteProduct(p.product_id)} className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
