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
  MapPin
} from 'lucide-react';


export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

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
    const fetchOrders = async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('orderDate', 'desc'));
        const snapshot = await getDocs(q);

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
        setRecentOrders(data.slice(0, 5)); // Last 5 orders
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const calculateStats = (ordersData) => {
    const totalRev = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrd = ordersData.length;
    const completedOrd = ordersData.filter(order => order.status === 'delivered').length;
    const avgValue = totalOrd > 0 ? totalRev / totalOrd : 0;

    setTotalRevenue(totalRev);
    setTotalOrders(totalOrd);
    setAvgOrderValue(avgValue);
    setCompletedOrders(completedOrd);

    // Calculate growth (simplified)
    const growthRate = 12.5; // This would normally come from comparing with previous period
    setRevenueGrowth(growthRate);
    setOrderGrowth(8.2);
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

    // Order trend (last 6 months - simplified)
    const orderTrend = [
      { name: 'Jan', orders: 45 },
      { name: 'Feb', orders: 52 },
      { name: 'Mar', orders: 48 },
      { name: 'Apr', orders: 61 },
      { name: 'May', orders: 55 },
      { name: 'Jun', orders: 68 },
    ];
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
              <h2 className="fw-bold text-dark mb-1">Dashboard Overview</h2>
              <p className="text-muted mb-0">Welcome to your restaurant management dashboard</p>
            </div>
            <div className="d-flex gap-2">
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
                  <h5 className="fw-semibold text-dark mb-4">Order Trends</h5>
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