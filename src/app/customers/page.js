'use client';

import Sidebar from '../../components/Sidebar'; 
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
  Users,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
  DollarSign,
  Mail,
  Search,
  Filter,
  Eye,
  Package,
  Home,
  Settings
} from 'lucide-react';



export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('orderDate', 'desc'));
        const snapshot = await getDocs(q);

        const ordersData = snapshot.docs.map(doc => {
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

        // Process orders to extract unique customers with their details
        const customerMap = new Map();

        ordersData.forEach(order => {
          const phone = order.receiverPhone;
          if (!customerMap.has(phone)) {
            customerMap.set(phone, {
              id: phone,
              name: order.receiverName,
              phone: order.receiverPhone,
              email: order.email || 'Not provided',
              totalOrders: 0,
              totalSpent: 0,
              firstOrderDate: order.orderDate,
              lastOrderDate: order.orderDate,
              addresses: new Set(),
              orders: [],
              buildingName: order.buildingName,
              floorNo: order.floorNo,
              houseNo: order.houseNo,
              fullAddress: order.fullAddress,
              city: order.city,
              state: order.state,
              pinCode: order.pinCode,
              landmark: order.landmark
            });
          }

          const customer = customerMap.get(phone);
          customer.totalOrders += 1;
          customer.totalSpent += order.totalAmount || 0;
          customer.lastOrderDate = order.orderDate > customer.lastOrderDate ? order.orderDate : customer.lastOrderDate;
          customer.firstOrderDate = order.orderDate < customer.firstOrderDate ? order.orderDate : customer.firstOrderDate;
          customer.addresses.add(`${order.buildingName}, ${order.fullAddress}, ${order.city}`);
          customer.orders.push(order);
        });

        const customersArray = Array.from(customerMap.values()).map(customer => ({
          ...customer,
          addresses: Array.from(customer.addresses),
          avgOrderValue: customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0
        }));

        setCustomers(customersArray);
        setFilteredCustomers(customersArray);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

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
      year: 'numeric'
    });
  };

  const getCustomerTier = (totalSpent) => {
    if (totalSpent >= 10000) return { label: 'VIP', color: 'primary' };
    if (totalSpent >= 5000) return { label: 'Regular', color: 'success' };
    if (totalSpent >= 1000) return { label: 'New', color: 'warning' };
    return { label: 'Basic', color: 'secondary' };
  };

  const viewCustomerOrders = (customer) => {
    // Navigate to orders page with customer filter
    router.push(`/orders?customer=${customer.phone}`);
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
            <p className="mt-3 text-muted">Loading customers...</p>
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">Customers Management</h2>
              <p className="text-muted mb-0">View and manage all customer information</p>
            </div>
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <Users size={16} className="me-1" />
                {customers.length} Total Customers
              </div>
            </div>
          </div>

          {/* Search and Stats */}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-medium text-dark">Search Customers</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-light"
                  placeholder="Search by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium text-dark">Results</label>
              <div className="p-2 bg-light rounded border-0">
                <small className="text-muted">
                  Showing {filteredCustomers.length} of {customers.length} customers
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-5">
              <Users size={64} className="text-muted mb-3 opacity-50" />
              <h5 className="fw-semibold text-dark">No customers found</h5>
              <p className="text-muted">
                {searchTerm ? 'No customers match your search criteria' : 'No customer data available'}
              </p>
            </div>
          ) : (
            <div className="row">
              {/* Customers List */}
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4 py-3 fw-semibold text-dark">Customer</th>
                            <th className="py-3 fw-semibold text-dark">Contact Info</th>
                            <th className="py-3 fw-semibold text-dark">Orders & Spending</th>
                            <th className="py-3 fw-semibold text-dark">Customer Tier</th>
                            <th className="py-3 fw-semibold text-dark">Last Order</th>
                            <th className="pe-4 py-3 fw-semibold text-dark text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map((customer) => {
                            const tier = getCustomerTier(customer.totalSpent);
                            return (
                              <tr key={customer.id} className="border-top">
                                {/* Customer Info */}
                                <td className="ps-4">
                                  <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                      <Users size={16} className="text-muted" />
                                      <h6 className="fw-semibold mb-0 text-dark">{customer.name}</h6>
                                    </div>
                                    <div className="small text-muted">
                                      Member since {formatDate(customer.firstOrderDate)}
                                    </div>
                                  </div>
                                </td>

                                {/* Contact Info */}
                                <td>
                                  <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                      <Phone size={14} className="text-muted" />
                                      <span className="fw-medium text-dark">{customer.phone}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 small text-muted">
                                      <Mail size={12} />
                                      <span>{customer.email}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 small text-muted">
                                      <MapPin size={12} />
                                      <span>{customer.city}, {customer.state}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Orders & Spending */}
                                <td>
                                  <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                      <ShoppingCart size={14} className="text-muted" />
                                      <span className="fw-semibold">{customer.totalOrders} orders</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2 small text-muted">
                                      <DollarSign size={12} />
                                      <span>Total: {formatCurrency(customer.totalSpent)}</span>
                                    </div>
                                    <div className="small text-muted">
                                      Avg: {formatCurrency(customer.avgOrderValue)}
                                    </div>
                                  </div>
                                </td>

                                {/* Customer Tier */}
                                <td>
                                  <span className={`badge bg-${tier.color}`}>
                                    {tier.label}
                                  </span>
                                </td>

                                {/* Last Order */}
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <Calendar size={14} className="text-muted" />
                                    <small className="text-muted">
                                      {formatDate(customer.lastOrderDate)}
                                    </small>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="pe-4 text-center">
                                  <div className="btn-group">
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => viewCustomerOrders(customer)}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-info"
                                      data-bs-toggle="modal"
                                      data-bs-target="#customerDetailsModal"
                                      onClick={() => setSelectedCustomer(customer)}
                                    >
                                      Details
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="modal fade" id="customerDetailsModal" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Customer Details - {selectedCustomer.name}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Basic Information */}
                  <div className="col-md-6 mb-4">
                    <h6 className="fw-semibold text-dark mb-3">Basic Information</h6>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Full Name</label>
                      <p className="fw-semibold">{selectedCustomer.name}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Phone Number</label>
                      <p className="fw-semibold text-success">{selectedCustomer.phone}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Email Address</label>
                      <p className="fw-semibold">{selectedCustomer.email}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Customer Since</label>
                      <p className="fw-semibold">{formatDate(selectedCustomer.firstOrderDate)}</p>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="col-md-6 mb-4">
                    <h6 className="fw-semibold text-dark mb-3">Primary Address</h6>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Building/House</label>
                      <p className="fw-semibold">
                        {selectedCustomer.buildingName}, Floor {selectedCustomer.floorNo}, House {selectedCustomer.houseNo}
                      </p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Full Address</label>
                      <p className="fw-semibold">{selectedCustomer.fullAddress}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">City/State/Pincode</label>
                      <p className="fw-semibold">
                        {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pinCode}
                      </p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Landmark</label>
                      <p className="fw-semibold">{selectedCustomer.landmark || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Order Statistics */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-semibold text-dark mb-3">Order Statistics</h6>
                    <div className="row text-center">
                      <div className="col-md-3 mb-3">
                        <div className="card border-0 bg-primary bg-opacity-10">
                          <div className="card-body py-3">
                            <div className="fw-bold text-primary fs-4">{selectedCustomer.totalOrders}</div>
                            <small className="text-muted">Total Orders</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="card border-0 bg-success bg-opacity-10">
                          <div className="card-body py-3">
                            <div className="fw-bold text-success fs-4">{formatCurrency(selectedCustomer.totalSpent)}</div>
                            <small className="text-muted">Total Spent</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="card border-0 bg-warning bg-opacity-10">
                          <div className="card-body py-3">
                            <div className="fw-bold text-warning fs-4">{formatCurrency(selectedCustomer.avgOrderValue)}</div>
                            <small className="text-muted">Avg Order Value</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3 mb-3">
                        <div className="card border-0 bg-info bg-opacity-10">
                          <div className="card-body py-3">
                            <div className="fw-bold text-info fs-4">{formatDate(selectedCustomer.lastOrderDate)}</div>
                            <small className="text-muted">Last Order</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders Preview */}
                <div className="row">
                  <div className="col-12">
                    <h6 className="fw-semibold text-dark mb-3">Recent Orders</h6>
                    {selectedCustomer.orders.slice(0, 3).map((order, index) => (
                      <div key={index} className="card border-0 bg-light mb-2">
                        <div className="card-body py-2">
                          <div className="row align-items-center">
                            <div className="col-md-4">
                              <small className="fw-semibold">Order #{order.id.slice(-8)}</small>
                            </div>
                            <div className="col-md-3">
                              <small className="text-muted">{formatDate(order.orderDate)}</small>
                            </div>
                            <div className="col-md-3">
                              <small className="fw-semibold">{formatCurrency(order.totalAmount)}</small>
                            </div>
                            <div className="col-md-2">
                              <span className={`badge bg-${order.status === 'delivered' ? 'success' : 'warning'}`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedCustomer.orders.length > 3 && (
                      <div className="text-center mt-2">
                        <small className="text-muted">
                          +{selectedCustomer.orders.length - 3} more orders
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => viewCustomerOrders(selectedCustomer)}
                >
                  View All Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}