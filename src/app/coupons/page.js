'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { db } from '../../firebase/firebase';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { Plus, Edit, Trash2, Eye, Tag, Calendar } from 'lucide-react';

export default function CouponsList() {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      alert('Coupon deleted successfully!');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Error deleting coupon!');
    }
  };

  const toggleActionMenu = (couponId, e) => {
    e?.stopPropagation();
    setShowActionMenu(showActionMenu === couponId ? null : couponId);
  };

  const closeActionMenu = () => {
    setShowActionMenu(null);
  };

  const isCouponActive = (coupon) => {
    const now = new Date();
    const active = coupon.activeDate?.toDate();
    const expiry = coupon.expiryDate?.toDate();
    return active <= now && expiry >= now && coupon.isActive;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header with Blue-100 Background */}
        <div 
          className="p-4 border-bottom"
          style={{ 
            backgroundColor: '#dbeafe',
            background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)'
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="fw-bold text-dark mb-1">Coupon Management</h2>
              <p className="text-muted mb-0">Manage your discount coupons and promotions</p>
            </div>
            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => router.push('/coupons/create')}
            >
              <Plus size={18} />
              Create Coupon
            </button>
          </div>

          {/* Stats Summary */}
          <div className="row g-3">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <h4 className="fw-bold text-primary">{coupons.length}</h4>
                  <small className="text-muted">Total Coupons</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <h4 className="fw-bold text-success">
                    {coupons.filter(coupon => isCouponActive(coupon)).length}
                  </h4>
                  <small className="text-muted">Active Coupons</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <h4 className="fw-bold text-warning">
                    {coupons.filter(coupon => coupon.usedCount > 0).length}
                  </h4>
                  <small className="text-muted">Used Coupons</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <h4 className="fw-bold text-danger">
                    {coupons.filter(coupon => !isCouponActive(coupon)).length}
                  </h4>
                  <small className="text-muted">Expired Coupons</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coupons Table */}
        <div className="p-4">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" className="ps-4 py-3 fw-semibold text-dark">Coupon Code</th>
                      <th scope="col" className="py-3 fw-semibold text-dark">Discount Details</th>
                      <th scope="col" className="py-3 fw-semibold text-dark">Categories</th>
                      <th scope="col" className="py-3 fw-semibold text-dark">Validity Period</th>
                      <th scope="col" className="py-3 fw-semibold text-dark">Usage</th>
                      <th scope="col" className="py-3 fw-semibold text-dark">Status</th>
                      <th scope="col" className="text-center py-3 fw-semibold text-dark">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <div className="d-flex justify-content-center">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </div>
                          <p className="mt-3 text-muted">Loading coupons...</p>
                        </td>
                      </tr>
                    ) : coupons.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <div className="text-muted">
                            <Tag size={48} className="mb-3 opacity-50" />
                            <h5 className="fw-semibold">No coupons found</h5>
                            <p className="mb-4">Get started by creating your first coupon</p>
                            <button
                              className="btn btn-primary"
                              onClick={() => router.push('/coupons/create')}
                            >
                              Create First Coupon
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr key={coupon.id} className="border-top">
                          {/* Coupon Code */}
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-2">
                              <div className="bg-primary bg-opacity-10 p-2 rounded">
                                <Tag size={20} className="text-primary" />
                              </div>
                              <div>
                                <h6 className="fw-bold text-primary mb-0">{coupon.code}</h6>
                                <small className="text-muted">
                                  Created: {formatDate(coupon.createdAt)}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* Discount Details */}
                          <td>
                            <div>
                              <h6 className="fw-semibold text-dark mb-1">
                                {coupon.discountType === 'Percentage' 
                                  ? `${coupon.discount}% OFF`
                                  : `₹${coupon.discount} OFF`
                                }
                              </h6>
                              <div className="small text-muted">
                                {coupon.minOrder > 0 && (
                                  <div>Min order: ₹{coupon.minOrder}</div>
                                )}
                                {coupon.maxDiscount && (
                                  <div>Max discount: ₹{coupon.maxDiscount}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Categories */}
                          <td>
                            <div>
                              <span className={`badge ${
                                coupon.mainCategory === 'veg' 
                                  ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' 
                                  : coupon.mainCategory === 'nonveg'
                                  ? 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
                                  : 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
                              }`}>
                                {coupon.mainCategory === 'all' ? 'All Categories' : 
                                 coupon.mainCategory === 'veg' ? '🥗 Veg' : '🍗 Non-Veg'}
                              </span>
                              {coupon.subCategories && coupon.subCategories.length > 0 && (
                                <div className="mt-1">
                                  <small className="text-muted">
                                    {coupon.subCategories.slice(0, 2).join(', ')}
                                    {coupon.subCategories.length > 2 && ` +${coupon.subCategories.length - 2} more`}
                                  </small>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Validity Period */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Calendar size={16} className="text-muted" />
                              <div>
                                <small className="text-muted d-block">
                                  {formatDate(coupon.activeDate)}
                                </small>
                                <small className="text-muted d-block">
                                  to {formatDate(coupon.expiryDate)}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* Usage */}
                          <td>
                            <div>
                              <small className="text-muted d-block">
                                Used: {coupon.usedCount || 0} times
                              </small>
                              <small className="text-muted d-block">
                                Limit: {coupon.usageLimit || 'Unlimited'}
                              </small>
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <span className={`badge ${
                              isCouponActive(coupon) 
                                ? 'bg-success' 
                                : 'bg-danger'
                            }`}>
                              {isCouponActive(coupon) ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="text-center position-relative">
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => router.push(`/coupons/edit/${coupon.id}`)}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(coupon.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Results Count */}
          {!loading && coupons.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close action menu when clicking outside */}
      {showActionMenu && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 999 }}
          onClick={closeActionMenu}
        />
      )}
    </div>
  );
}