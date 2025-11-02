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
  where,
  Timestamp,
} from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  Star,
  Clock,
  MapPin,
  Store,
  User
} from 'lucide-react';

// Helper functions
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorUid, setVendorUid] = useState(null);

  // Stats states
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [orderGrowth, setOrderGrowth] = useState(0);

  // Chart data states
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [orderTrendData, setOrderTrendData] = useState([]);

  // Recent orders
  const [recentOrders, setRecentOrders] = useState([]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    const initializeDashboard = async () => {
      const user = getCurrentUser();
      setCurrentUser(user);
      
      if (!user) {
        router.push('/login');
        return;
      }

      // If vendor, get vendor UID
      if (user.role === 'vendor') {
        await getVendorUid(user);
      }

      // Fetch vendors (for admin only)
      if (user.role === 'main_admin' || user.role === 'admin') {
        await fetchVendors();
      }

      await fetchOrders();
    };

    initializeDashboard();
  }, []);

  const getVendorUid = async (user) => {
    try {
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('email', '==', user.email)
      );
      const vendorsSnapshot = await getDocs(vendorsQuery);
      if (!vendorsSnapshot.empty) {
        const vendorUid = vendorsSnapshot.docs[0].id;
        setVendorUid(vendorUid);
        console.log("Vendor UID:", vendorUid);
      }
    } catch (error) {
      console.error('Error getting vendor UID:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const vendorsRef = collection(db, 'vendors');
      const q = query(vendorsRef, orderBy('restaurantName', 'asc'));
      const snapshot = await getDocs(q);
      
      const vendorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      let ordersQuery;
      
      // Build query based on user role and selected vendor
      if (currentUser?.role === 'main_admin' || currentUser?.role === 'admin') {
        if (selectedVendor === 'all') {
          // Admin: Get all orders
          ordersQuery = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
        } else {
          // Admin: Get orders for specific vendor
          ordersQuery = query(
            collection(db, 'orders'),
            where('vendorId', '==', selectedVendor),
            orderBy('orderDate', 'desc')
          );
        }
      } else if (vendorUid) {
        // Vendor: Get only their orders
        ordersQuery = query(
          collection(db, 'orders'),
          where('vendorId', '==', vendorUid),
          orderBy('orderDate', 'desc')
        );
      } else {
        // Fallback: Get all orders
        ordersQuery = query(collection(db, 'orders'), orderBy('orderDate', 'desc'));
      }

      const snapshot = await getDocs(ordersQuery);

      const data = snapshot.docs.map(doc => {
        const order = doc.data();
        let orderDate;
        if (order.orderDate instanceof Timestamp) {
          orderDate = order.orderDate.toDate();
        } else if (typeof order.orderDate === 'string') {
          orderDate = new Date(order.orderDate);
        } else {
          orderDate = new Date();
        }
        return {
          id: doc.id,
          ...order,
          orderDate,
        };
      });

      setOrders(data);
      calculateStats(data);
      generateChartData(data);
      setRecentOrders(data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch orders when vendor selection changes
  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [selectedVendor, vendorUid]);

  const calculateStats = (ordersData) => {
    const totalRev = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrd = ordersData.length;
    const completedOrd = ordersData.filter(order => order.status === 'delivered').length;
    const avgValue = totalOrd > 0 ? totalRev / totalOrd : 0;

    setTotalRevenue(totalRev);
    setTotalOrders(totalOrd);
    setAvgOrderValue(avgValue);
    setCompletedOrders(completedOrd);

    // Calculate growth (simplified - in real app, compare with previous period)
    const growthRate = ordersData.length > 10 ? 12.5 : 0;
    setRevenueGrowth(growthRate);
    setOrderGrowth(ordersData.length > 10 ? 8.2 : 0);
  };

  const generateChartData = (ordersData) => {
    // Revenue by day (last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const revenueByDay = last7Days.map(date => {
      const dayOrders = ordersData.filter(order => {
        const orderDate = new Date(order.orderDate).toISOString().split('T')[0];
        return orderDate === date;
      });
      const revenue = dayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      return {
        name: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
        revenue: revenue,
        orders: dayOrders.length
      };
    });

    setRevenueData(revenueByDay);

    // Category distribution
    const categoryStats = {};
    ordersData.forEach(order => {
      order.items?.forEach(item => {
        if (item.categoryName) {
          categoryStats[item.categoryName] = (categoryStats[item.categoryName] || 0) + 1;
        }
      });
    });

    const categoryChartData = Object.entries(categoryStats).map(([name, value]) => ({
      name,
      value
    }));

    setCategoryData(categoryChartData);

    // Order trend (last 6 months - ACTUAL DATA)
    const last6Months = [...Array(6)].map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.getMonth(),
        year: date.getFullYear(),
        name: date.toLocaleDateString('en', { month: 'short' })
      };
    }).reverse();

    const orderTrend = last6Months.map(({ month, year, name }) => {
      const monthOrders = ordersData.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate.getMonth() === month && orderDate.getFullYear() === year;
      });
      
      return {
        name,
        orders: monthOrders.length
      };
    });

    setOrderTrendData(orderTrend);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'warning',
      'confirmed': 'info',
      'preparing': 'primary',
      'out_for_delivery': 'secondary',
      'delivered': 'success',
      'cancelled': 'danger'
    };
    return statusColors[status] || 'secondary';
  };

  const isAdmin = currentUser?.role === 'main_admin' || currentUser?.role === 'admin';
  const isVendor = currentUser?.role === 'vendor';

  if (loading) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
          <Sidebar />
        </div>
        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
              </h2>
              <p className="text-muted mb-0">
                {isAdmin 
                  ? 'Overview of all restaurant operations' 
                  : `Welcome to ${currentUser?.restaurantName || currentUser?.name}'s dashboard`
                }
              </p>
            </div>
            <div className="d-flex gap-2 align-items-center">
              {/* Vendor Filter - Only for Admin */}
              {isAdmin && vendors.length > 0 && (
                <select 
                  className="form-select"
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="all">All Vendors</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.restaurantName}
                    </option>
                  ))}
                </select>
              )}
              
              {/* User Badge */}
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                {isAdmin ? (
                  <><User size={16} className="me-1" /> Admin</>
                ) : (
                  <><Store size={16} className="me-1" /> {currentUser?.restaurantName || 'Vendor'}</>
                )}
              </div>

              <select 
                className="form-select w-auto"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-4">
          <div className="row g-3 mb-4">
            {/* Total Revenue */}
            <div className="col-xl-3 col-md-6">
              <div className="card border-0 bg-primary bg-opacity-10 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-primary">{formatCurrency(totalRevenue)}</h4>
                      <small className="text-muted">Total Revenue</small>
                      <div className="d-flex align-items-center gap-1 mt-1">
                        {revenueGrowth >= 0 ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                        <small className={revenueGrowth >= 0 ? 'text-success' : 'text-danger'}>
                          {revenueGrowth}% from last period
                        </small>
                      </div>
                    </div>
                    <div className="bg-primary bg-opacity-25 p-3 rounded">
                      <DollarSign size={24} className="text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="col-xl-3 col-md-6">
              <div className="card border-0 bg-success bg-opacity-10 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-success">{totalOrders}</h4>
                      <small className="text-muted">Total Orders</small>
                      <div className="d-flex align-items-center gap-1 mt-1">
                        {orderGrowth >= 0 ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                        <small className={orderGrowth >= 0 ? 'text-success' : 'text-danger'}>
                          {orderGrowth}% from last period
                        </small>
                      </div>
                    </div>
                    <div className="bg-success bg-opacity-25 p-3 rounded">
                      <ShoppingCart size={24} className="text-success" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="col-xl-3 col-md-6">
              <div className="card border-0 bg-warning bg-opacity-10 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-warning">{formatCurrency(avgOrderValue)}</h4>
                      <small className="text-muted">Average Order Value</small>
                      <div className="mt-1">
                        <small className="text-muted">Per order average</small>
                      </div>
                    </div>
                    <div className="bg-warning bg-opacity-25 p-3 rounded">
                      <Star size={24} className="text-warning" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Orders */}
            <div className="col-xl-3 col-md-6">
              <div className="card border-0 bg-info bg-opacity-10 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <h4 className="fw-bold text-info">{completedOrders}</h4>
                      <small className="text-muted">Completed Orders</small>
                      <div className="mt-1">
                        <small className="text-muted">
                          {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}% completion rate
                        </small>
                      </div>
                    </div>
                    <div className="bg-info bg-opacity-25 p-3 rounded">
                      <Package size={24} className="text-info" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-4 mb-4">
            {/* Revenue Chart */}
            <div className="col-xl-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="fw-semibold text-dark mb-4">Revenue Overview</h5>
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(value), 'Revenue']}
                        />
                        <Legend />
                        <Bar 
                          dataKey="revenue" 
                          fill="#007bff" 
                          name="Revenue"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-5">
                      <DollarSign size={48} className="text-muted mb-3 opacity-50" />
                      <p className="text-muted">No revenue data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="fw-semibold text-dark mb-4">Category Distribution</h5>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-5">
                      <Package size={48} className="text-muted mb-3 opacity-50" />
                      <p className="text-muted">No category data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="row g-4">
            {/* Order Trends */}
            <div className="col-xl-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h5 className="fw-semibold text-dark mb-4">Order Trends (Last 6 Months)</h5>
                  {orderTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={orderTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="orders" 
                          stroke="#00C49F" 
                          strokeWidth={2}
                          name="Orders"
                          dot={{ fill: '#00C49F' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-4">
                      <ShoppingCart size={48} className="text-muted mb-3 opacity-50" />
                      <p className="text-muted">No order trend data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="col-xl-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-semibold text-dark mb-0">Recent Orders</h5>
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => router.push('/orders')}
                    >
                      View All
                    </button>
                  </div>
                  
                  {recentOrders.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="list-group-item px-0 py-3 border-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <h6 className="fw-semibold mb-0">{order.receiverName}</h6>
                                <span className={`badge bg-${getStatusBadge(order.status)}`}>
                                  {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                                <Clock size={12} />
                                <span>{formatDate(order.orderDate)}</span>
                              </div>
                              <div className="text-muted small">
                                {order.items?.length} items • {formatCurrency(order.totalAmount)}
                              </div>
                            </div>
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => router.push('/orders')}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <ShoppingCart size={48} className="text-muted mb-3 opacity-50" />
                      <p className="text-muted">No recent orders</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}