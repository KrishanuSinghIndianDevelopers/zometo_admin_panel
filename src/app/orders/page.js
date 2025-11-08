'use client';
import Sidebar from '../../components/Sidebar'; 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase/firebase';
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { 
  Filter, 
  Calendar, 
  Package, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  DollarSign, 
  Tag,
  Home,
  ShoppingCart,
  Users,
  Settings,
  Store,
  Truck,
  CheckCircle,
  Clock4,
  Edit3,
  CreditCard,
  XCircle
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [selectedDate, setSelectedDate] = useState('');
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  
  // ✅ NEW: Vendor/Admin Filter States
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [uniqueVendors, setUniqueVendors] = useState([]);

  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  // ✅ NEW: Check authentication and user role
  const checkAuthAndFetchOrders = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    console.log('Current User:', userObj);
    setCurrentUser(userObj);
    fetchOrders(userObj);
  };

  // ✅ UPDATED: Fetch orders with vendor/admin logic
  const fetchOrders = async (userObj) => {
    try {
      setLoading(true);
      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, orderBy('orderDate', 'desc'));
      const snapshot = await getDocs(q);

      let data = snapshot.docs.map(doc => {
        const order = doc.data();
        let orderDate;
        if (order.orderDate instanceof Timestamp) {
          orderDate = order.orderDate.toDate();
        } else if (typeof order.orderDate === 'string') {
          orderDate = new Date(order.orderDate);
        } else {
          orderDate = new Date();
        }
        
        // ✅ FIX: Handle payment status properly
        let paymentStatus = order.paymentStatus || 'unpaid';
        // If Razorpay payment IDs exist, consider it paid
        if (order.razorpayPaymentId || order.status === 'Paid') {
          paymentStatus = 'paid';
        }
        
        return {
          id: doc.id,
          ...order,
          orderDate,
          // Ensure status exists, default to 'confirmed' (since pending is removed)
          status: order.status === 'Paid' ? 'confirmed' : (order.status || 'confirmed'),
          // Ensure payment status is correctly set
          paymentStatus: paymentStatus
        };
      });

      // ✅ Filter orders based on user role
      if (!isAdminUser) {
        // Vendor: Show only their own orders
        const vendorId = userObj.documentId || userObj.uid;
        data = data.filter(order => order.vendorId === vendorId);
      }

      setOrders(data);
      setFilteredOrders(data);

      // ✅ Extract unique vendors for admin filter
      if (isAdminUser) {
        const vendors = [...new Set(data.map(order => order.vendorId).filter(Boolean))];
        console.log('📊 Unique vendors:', vendors);
        setUniqueVendors(vendors);
      }

      // Category logic (existing)
      const allCats = new Set();
      const catCount = {};
      data.forEach(order => {
        order.items?.forEach(item => {
          if (item.categoryName) {
            allCats.add(item.categoryName);
            catCount[item.categoryName] =
              (catCount[item.categoryName] || 0) + parseInt(item.quantity || 0);
          }
        });
      });

      setCategories(['All', ...Array.from(allCats)]);
      setCategoryCounts(
        Object.entries(catCount).map(([name, qty]) => ({ name, qty }))
      );
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Apply all filters including vendor filter
  useEffect(() => {
    let filtered = [...orders];
    
    // Vendor Filter
    if (vendorFilter !== 'all') {
      if (vendorFilter === 'admin_only') {
        filtered = filtered.filter(order => 
          !order.vendorId || order.vendorRole === 'admin' || order.vendorRole === 'main_admin'
        );
      } else {
        filtered = filtered.filter(order => order.vendorId === vendorFilter);
      }
    }
    
    // Date Filter
    if (selectedDate) {
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === selected.getTime();
      });
    }
    
    // Category Filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(order =>
        order.items?.some(item => item.categoryName === selectedCategory)
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, vendorFilter, selectedCategory, selectedDate]);

  // ✅ NEW: Get vendor display name
  const getVendorDisplayName = (vendorId) => {
    const vendorOrders = orders.filter(order => order.vendorId === vendorId);
    if (vendorOrders.length > 0) {
      return vendorOrders[0]?.vendorName || `Vendor: ${vendorId.substring(0, 10)}...`;
    }
    return `Vendor: ${vendorId.substring(0, 10)}...`;
  };

  // ✅ NEW: Update order status in Firebase
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrder(orderId);
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );

      console.log(`✅ Order ${orderId} status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'confirmed': 'info',
      'preparing': 'primary',
      'out_for_delivery': 'secondary',
      'delivered': 'success',
      'cancelled': 'danger'
    };
    return statusColors[status] || 'secondary';
  };

  // ✅ NEW: Get payment status badge
  const getPaymentStatusBadge = (paymentStatus) => {
    const paymentColors = {
      'paid': 'success',
      'unpaid': 'danger',
      'pending': 'warning',
      'failed': 'danger'
    };
    return paymentColors[paymentStatus] || 'secondary';
  };

  // ✅ UPDATED: Status tracking component - REMOVED payment status from here
  const StatusTracker = ({ order }) => {
    const statusSteps = [
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, clickable: false },
      { key: 'preparing', label: 'Preparing', icon: Package, clickable: true },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, clickable: true },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle, clickable: false }
    ];

    const currentStatusIndex = statusSteps.findIndex(step => step.key === order.status);

    const handleStatusClick = async (newStatus) => {
      if (updatingOrder === order.id) return; // Prevent multiple clicks
      
      // Only allow moving forward in status for clickable steps
      const newStatusIndex = statusSteps.findIndex(step => step.key === newStatus);
      if (newStatusIndex < currentStatusIndex) {
        if (!confirm('Are you sure you want to move this order to a previous status?')) {
          return;
        }
      }
      
      await updateOrderStatus(order.id, newStatus);
    };

    return (
      <div className="status-tracker">
        <div className="d-flex justify-content-between align-items-center position-relative">
          {/* Connection lines */}
          <div 
            className="position-absolute bg-secondary opacity-25"
            style={{
              top: '50%',
              left: '0',
              right: '0',
              height: '2px',
              transform: 'translateY(-50%)',
              zIndex: 1
            }}
          ></div>
          
          {statusSteps.map((step, index) => {
            const IconComponent = step.icon;
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isClickable = step.clickable && currentUser && 
                              (currentUser.role === 'admin' || currentUser.role === 'main_admin' || currentUser.role === 'vendor');
            
            return (
              <div key={step.key} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 2 }}>
                {isClickable ? (
                  <button
                    className={`rounded-circle d-flex align-items-center justify-content-center border-0 ${
                      isCompleted ? 'bg-primary text-white' : 'bg-light text-muted'
                    } ${isCurrent ? 'border border-primary border-2' : ''}`}
                    style={{
                      width: '40px',
                      height: '40px',
                      transition: 'all 0.3s ease',
                      cursor: isClickable ? 'pointer' : 'default'
                    }}
                    onClick={() => handleStatusClick(step.key)}
                    disabled={updatingOrder === order.id || !isClickable}
                    title={isClickable ? `Set status to ${step.label}` : 'Read only'}
                  >
                    {updatingOrder === order.id && isCurrent ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      <IconComponent size={18} />
                    )}
                  </button>
                ) : (
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center ${
                      isCompleted ? 'bg-success text-white' : 'bg-light text-muted'
                    } ${isCurrent ? 'border border-success border-2' : ''}`}
                    style={{
                      width: '40px',
                      height: '40px',
                      transition: 'all 0.3s ease'
                    }}
                    title={`${step.label} (Auto from Mobile App)`}
                  >
                    <IconComponent size={18} />
                  </div>
                )}
                <small 
                  className={`mt-2 fw-medium text-center ${isCompleted ? 'text-primary' : 'text-muted'}`}
                  style={{ fontSize: '0.75rem', minWidth: '80px' }}
                >
                  {step.label}
                </small>
              </div>
            );
          })}
        </div>
        
        {/* ✅ REMOVED: Payment Status from here - it's already in Payment column */}
        
        {/* Quick Action Buttons - Only for clickable statuses */}
        <div className="mt-3 text-center">
          {currentStatusIndex < statusSteps.length - 1 && statusSteps[currentStatusIndex + 1]?.clickable && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleStatusClick(statusSteps[currentStatusIndex + 1].key)}
              disabled={updatingOrder === order.id}
            >
              <Edit3 size={14} className="me-1" />
              Move to {statusSteps[currentStatusIndex + 1].label}
            </button>
          )}
        </div>
      </div>
    );
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats based on filtered orders
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const totalDiscount = filteredOrders.reduce((sum, order) => sum + (order.totalDiscount || 0), 0);
  const totalOrders = filteredOrders.length;

  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'main_admin';

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                {isAdminUser ? 'All Orders Management' : 'My Orders Management'}
              </h2>
              <p className="text-muted mb-0">
                {isAdminUser ? 'View and manage all orders' : 'View and manage your orders'}
              </p>
            </div>
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <Package size={16} className="me-1" />
                {totalOrders} {isAdminUser ? 'Total' : 'My'} Orders
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card border-0 bg-primary bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-primary">₹{totalRevenue.toLocaleString()}</h4>
                      <small className="text-muted">Total Revenue</small>
                    </div>
                    <DollarSign size={24} className="text-primary opacity-50" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-success bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-success">₹{totalDiscount.toLocaleString()}</h4>
                      <small className="text-muted">Total Discount</small>
                    </div>
                    <Tag size={24} className="text-success opacity-50" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-warning bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-warning">{totalOrders}</h4>
                      <small className="text-muted">Total Orders</small>
                    </div>
                    <ShoppingCart size={24} className="text-warning opacity-50" />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 bg-info bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-info">
                        {orders.filter(order => order.paymentStatus === 'paid').length}
                      </h4>
                      <small className="text-muted">Paid Orders</small>
                    </div>
                    <CreditCard size={24} className="text-info opacity-50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="row g-3">
            {/* Vendor Filter - Only for Admin */}
            {isAdminUser && (
              <div className="col-md-4">
                <label className="form-label fw-medium text-dark">Filter by Vendor</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-0">
                    <Users size={18} />
                  </span>
                  <select
                    className="form-select border-0 bg-light"
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                  >
                    <option value="all">All Vendors ({orders.length})</option>
                    <option value="admin_only">
                      Admin Orders Only ({orders.filter(o => !o.vendorId || o.vendorRole === 'admin' || o.vendorRole === 'main_admin').length})
                    </option>
                    {uniqueVendors.map(vendor => {
                      const vendorOrders = orders.filter(order => order.vendorId === vendor);
                      const vendorName = getVendorDisplayName(vendor);
                      return (
                        <option key={vendor} value={vendor}>
                          {vendorName} ({vendorOrders.length})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            <div className="col-md-4">
              <label className="form-label fw-medium text-dark">Filter by Date</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0">
                  <Calendar size={18} />
                </span>
                <input
                  type="date"
                  className="form-control border-0 bg-light"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-4">
              <label className="form-label fw-medium text-dark">Filter by Category</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0">
                  <Filter size={18} />
                </span>
                <select
                  className="form-select border-0 bg-light"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="row mt-3">
            <div className="col-12">
              <div className="p-2 bg-light rounded border-0">
                <small className="text-muted">
                  Showing {filteredOrders.length} of {orders.length} orders
                  {isAdminUser && vendorFilter !== 'all' && (
                    <span className="text-primary fw-medium">
                      {vendorFilter === 'admin_only' ? ' (Admin Orders Only)' : ` (Vendor: ${getVendorDisplayName(vendorFilter)})`}
                    </span>
                  )}
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-5">
              <Package size={64} className="text-muted mb-3 opacity-50" />
              <h5 className="fw-semibold text-dark">No orders found</h5>
              <p className="text-muted">No orders match your current filters</p>
            </div>
          ) : (
            <div className="row">
              {/* Orders List */}
              <div className="col-12">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4 py-3 fw-semibold text-dark">Customer</th>
                            {isAdminUser && <th className="py-3 fw-semibold text-dark">Vendor</th>}
                            <th className="py-3 fw-semibold text-dark">Order Details</th>
                            <th className="py-3 fw-semibold text-dark">Amount</th>
                            <th className="py-3 fw-semibold text-dark">Payment</th>
                            <th className="py-3 fw-semibold text-dark">Status</th>
                            <th className="py-3 fw-semibold text-dark">Order Progress</th>
                            <th className="py-3 fw-semibold text-dark">Date & Time</th>
                            <th className="pe-4 py-3 fw-semibold text-dark text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order, index) => (
                            <tr key={order.id} className="border-top">
                              {/* Customer Info */}
                              <td className="ps-4">
                                <div>
                                  <div className="d-flex align-items-center gap-2 mb-1">
                                    <User size={16} className="text-muted" />
                                    <h6 className="fw-semibold mb-0 text-dark">{order.receiverName}</h6>
                                  </div>
                                  <div className="d-flex align-items-center gap-2 small text-muted">
                                    <Phone size={14} />
                                    <span style={{ color: 'green' }}>{order.receiverPhone}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Vendor Info - Only for Admin */}
                              {isAdminUser && (
                                <td>
                                  <div className="d-flex align-items-center gap-1">
                                    {order.vendorRole === 'vendor' ? (
                                      <Store size={14} className="text-warning" />
                                    ) : (
                                      <Users size={14} className="text-primary" />
                                    )}
                                    <small className="text-muted">
                                      {order.vendorName || (order.vendorRole === 'admin' ? 'Admin' : `Vendor: ${order.vendorId?.substring(0, 8)}...`)}
                                    </small>
                                  </div>
                                </td>
                              )}

                              {/* Order Details */}
                              <td>
                                <div>
                                  <div className="mb-1">
                                    <small className="text-muted">
                                      {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                                    </small>
                                  </div>
                                  <div>
                                    <small className="text-dark">
                                      {order.items?.slice(0, 2).map(item => 
                                        `${item.title} (${item.quantity})`
                                      ).join(', ')}
                                      {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                                    </small>
                                  </div>
                                  {order.items?.[0]?.categoryName && (
                                    <div>
                                      <small className="text-muted">
                                        Category: {order.items[0].categoryName}
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Amount */}
                              <td>
                                <div>
                                  <h6 className="fw-semibold text-dark mb-1">
                                    ₹{order.totalAmount}
                                  </h6>
                                  {order.totalDiscount > 0 && (
                                    <small className="text-success">
                                      <Tag size={12} className="me-1" />
                                      Saved ₹{order.totalDiscount}
                                    </small>
                                  )}
                                </div>
                              </td>

                              {/* ✅ FIXED: Payment Status - Now correctly shows PAID for Razorpay orders */}
                              <td>
                                <span className={`badge bg-${getPaymentStatusBadge(order.paymentStatus)}`}>
                                  {order.paymentStatus === 'paid' ? (
                                    <>
                                      <CreditCard size={12} className="me-1" />
                                      PAID
                                    </>
                                  ) : (
                                    <>
                                      <XCircle size={12} className="me-1" />
                                      UNPAID
                                    </>
                                  )}
                                </span>
                              </td>

                              {/* Status */}
                              <td>
                                <span className={`badge bg-${getStatusBadge(order.status)}`}>
                                  {order.status?.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </td>

                              {/* ✅ FIXED: Order Progress Tracker - No payment status here */}
                              <td style={{ minWidth: '300px' }}>
                                <StatusTracker order={order} />
                              </td>

                              {/* Date & Time */}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Clock size={14} className="text-muted" />
                                  <small className="text-muted">
                                    {formatDate(order.orderDate)}
                                  </small>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="pe-4 text-center">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  data-bs-toggle="modal"
                                  data-bs-target={`#orderModal${index}`}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Chart */}
          {categoryCounts.length > 0 && (
            <div className="row mt-4">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-semibold text-dark mb-4">
                      {isAdminUser && vendorFilter !== 'all' ? 'Filtered ' : ''}
                      Category-wise Sales Performance
                    </h5>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryCounts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="qty" 
                          fill="#007bff" 
                          name="Units Sold"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modals */}
      {filteredOrders.map((order, index) => (
        <div className="modal fade" id={`orderModal${index}`} key={order.id} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Order Details - #{order.id.slice(-8)}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                {/* Customer Information */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-semibold text-dark mb-3">
                      <User size={18} className="me-2" />
                      Customer Information
                    </h6>
                  </div>
                  <div className="col-md-6 mb-2">
                    <label className="fw-medium text-muted">Name</label>
                    <p className="fw-semibold">{order.receiverName}</p>
                  </div>
                  <div className="col-md-6 mb-2">
                    <label className="fw-medium text-muted">Phone</label>
                    <p className="fw-semibold text-success">{order.receiverPhone}</p>
                  </div>
                  <div className="col-12 mb-2">
                    <label className="fw-medium text-muted">
                      <MapPin size={14} className="me-1" />
                      Full Address
                    </label>
                    <p className="fw-semibold">
                      {order.buildingName}, Floor {order.floorNo}, House {order.houseNo}, {order.fullAddress}, {order.city}, {order.state} - {order.pinCode}
                    </p>
                  </div>
                  <div className="col-12 mb-2">
                    <label className="fw-medium text-muted">Landmark</label>
                    <p className="fw-semibold">{order.landmark || 'N/A'}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-semibold text-dark mb-3">
                      <Package size={18} className="me-2" />
                      Order Items
                    </h6>
                  </div>
                  {order.items?.map((item, idx) => (
                    <div className="col-12 mb-3" key={idx}>
                      <div className="card border-0 bg-light">
                        <div className="card-body">
                          <div className="row align-items-center">
                            <div className="col-2">
                              <img 
                                src={item.imageUrl} 
                                alt={item.title}
                                className="img-fluid rounded"
                                style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="col-6">
                              <h6 className="fw-semibold mb-1">{item.title}</h6>
                              <div className="d-flex gap-3 small text-muted">
                                <span>Type: {item.foodType}</span>
                                <span>Category: {item.categoryName}</span>
                              </div>
                            </div>
                            <div className="col-4 text-end">
                              <div className="fw-semibold text-dark">₹{item.totalPrice}</div>
                              <div className="small text-muted">Qty: {item.quantity}</div>
                              {item.discountedAmount > 0 && (
                                <div className="small text-success">
                                  Discount: ₹{item.discountedAmount}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="row">
                  <div className="col-12">
                    <div className="card border-0 bg-primary bg-opacity-10">
                      <div className="card-body">
                        <div className="row text-center">
                          <div className="col-md-3">
                            <div className="fw-semibold text-dark fs-5">₹{order.totalAmount}</div>
                            <small className="text-muted">Total Amount</small>
                          </div>
                          <div className="col-md-3">
                            <div className="fw-semibold text-success fs-5">₹{order.totalDiscount}</div>
                            <small className="text-muted">Total Discount</small>
                          </div>
                          <div className="col-md-3">
                            <div className="fw-semibold text-dark fs-5">{order.items?.length}</div>
                            <small className="text-muted">Total Items</small>
                          </div>
                          <div className="col-md-3">
                            <div className={`fw-semibold fs-5 text-${getPaymentStatusBadge(order.paymentStatus)}`}>
                              {order.paymentStatus?.toUpperCase()}
                            </div>
                            <small className="text-muted">Payment Status</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}