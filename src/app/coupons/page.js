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
  orderBy,
  where 
} from 'firebase/firestore';
import { Plus, Edit, Trash2, Tag, Calendar, Users, Store, Filter, MoreVertical } from 'lucide-react';

export default function CouponsList() {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [uniqueVendors, setUniqueVendors] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    checkAuthAndFetchCoupons();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    applyVendorFilter();
  }, [vendorFilter, coupons]);

  const checkAuthAndFetchCoupons = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    console.log('Current User:', userObj); // Debug
    setCurrentUser(userObj);
    fetchCoupons(userObj);
  };

 const fetchCoupons = async (userObj) => {
  try {
    setLoading(true);
    
    const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
    
    console.log('👤 Current User:', userObj);
    
    if (isAdminUser) {
      // ADMIN: Show ALL coupons
      const couponsQuery = query(
        collection(db, 'coupons'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(couponsQuery);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      console.log('👑 Admin sees all coupons:', data);
      setCoupons(data);
      
      const vendors = [...new Set(data.map(coupon => coupon.createdBy).filter(Boolean))];
      setUniqueVendors(vendors);
    } else {
      // VENDOR: Pehle check karo konsa field use karna hai
      const possibleIds = [
        userObj.documentId,
        userObj.uid, 
        userObj.email,
        userObj.userId
      ].filter(Boolean);
      
      console.log('🔍 Vendor will search with these IDs:', possibleIds);
      
      // Pehle sab coupons lao
      const allCouponsQuery = query(collection(db, 'coupons'));
      const allSnapshot = await getDocs(allCouponsQuery);
      const allCoupons = allSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      console.log('📊 All coupons in database:', allCoupons);
      
      // Phir filter karo
      const vendorCoupons = allCoupons.filter(coupon => {
        return possibleIds.some(id => coupon.createdBy === id);
      });
      
      // Sort by date
      vendorCoupons.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('✅ Vendor coupons found:', vendorCoupons);
      setCoupons(vendorCoupons);
    }
  } catch (error) {
    console.error('❌ Error fetching coupons:', error);
    setCoupons([]);
  } finally {
    setLoading(false);
  }
};

  const applyVendorFilter = () => {
    if (vendorFilter === 'all') {
      setFilteredCoupons(coupons);
    } else {
      const vendorCoupons = coupons.filter(coupon => coupon.createdBy === vendorFilter);
      setFilteredCoupons(vendorCoupons);
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;

    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      alert('Coupon deleted successfully!');
      fetchCoupons(currentUser);
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Error deleting coupon!');
    }
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

  // Check if user can edit/delete coupon
  const canModifyCoupon = (coupon) => {
    if (!currentUser) return false;
    
    // Admin can modify all coupons
    if (currentUser.role === 'admin' || currentUser.role === 'main_admin') return true;
    
    // Vendor can only modify their own coupons
    const vendorUid = currentUser.documentId || currentUser.uid;
    const canModify = coupon.createdBy === vendorUid;
    
    console.log('Permission check:', {
      couponCode: coupon.code,
      couponCreatedBy: coupon.createdBy,
      vendorUid,
      canModify
    });
    
    return canModify;
  };

  const toggleDropdown = (couponId, e) => {
    e?.stopPropagation();
    setActiveDropdown(activeDropdown === couponId ? null : couponId);
  };

  const getVendorDisplayName = (coupon) => {
    if (coupon.createdByName) {
      return coupon.createdByName;
    }
    
    if (coupon.createdByRole === 'admin') {
      return 'Admin';
    }
    
    return `Vendor: ${coupon.createdBy?.substring(0, 10)}...`;
  };

  if (loading) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-muted">Loading coupons...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'main_admin';

  return (
    <div className="d-flex min-vh-100">
      <Sidebar />
      
      <div className="flex-grow-1 bg-light">
        {/* Fixed Header Section with Blue Background */}
        <div className="p-4 mb-2 border-bottom" style={{backgroundColor: '#e3f2fd', borderBottom: '2px solid #bbdefb'}}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                {isAdminUser ? 'All Coupons Management' : 'My Coupons Management'}
              </h2>
              <p className="text-muted mb-0">
                {isAdminUser ? 'Manage all system coupons' : 'Manage your coupons'}
              </p>
            </div>
            
            <div className="text-end">
              <div className={`badge ${isAdminUser ? 'bg-warning' : 'bg-primary'} bg-opacity-10 ${isAdminUser ? 'text-warning' : 'text-primary'} border px-3 py-2 me-3`}>
                <Tag size={16} className="me-1" />
                {filteredCoupons.length} {isAdminUser ? 'Total' : 'My'} Coupons
              </div>
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={() => router.push('/coupons/create')}
              >
                <Plus size={18} />
                Create Coupon
              </button>
            </div>
          </div>

          {isAdminUser && (
            <div className="mt-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body py-3">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary rounded-circle p-2">
                          <Filter size={18} className="text-white" />
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-0">Vendor Filter</h6>
                          <small className="text-muted">
                            {filteredCoupons.length} of {coupons.length} coupons showing
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="d-flex align-items-center gap-3">
                        <select 
                          className="form-select form-select-sm border-primary"
                          value={vendorFilter}
                          onChange={(e) => setVendorFilter(e.target.value)}
                          style={{minWidth: '200px'}}
                        >
                          <option value="all">All Vendors ({coupons.length})</option>
                          {uniqueVendors.map(vendor => {
                            const vendorCoupons = coupons.filter(coupon => coupon.createdBy === vendor);
                            const vendorName = vendorCoupons[0]?.createdByName || `Vendor: ${vendor.substring(0, 20)}...`;
                            return (
                              <option key={vendor} value={vendor}>
                                {vendorName} ({vendorCoupons.length})
                              </option>
                            );
                          })}
                        </select>
                        
                        <div className="bg-white rounded px-3 py-2 border">
                          <small className="text-primary fw-bold">{filteredCoupons.length}</small>
                          <small className="text-muted"> showing</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4 py-3">Code</th>
                      <th className="py-3">Discount</th>
                      {isAdminUser && <th className="py-3">Vendor</th>}
                      <th className="py-3">Category</th>
                      <th className="py-3">Validity</th>
                      <th className="py-3">Usage</th>
                      <th className="py-3">Status</th>
                      <th className="pe-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoupons.length === 0 ? (
                      <tr>
                        <td colSpan={isAdminUser ? 8 : 7} className="text-center py-5">
                          <div className="text-muted">
                            <Tag size={48} className="mb-3 opacity-50" />
                            <h5 className="fw-semibold">No coupons found</h5>
                            <p className="mb-4">
                              {isAdminUser 
                                ? 'No coupons have been created yet' 
                                : 'Get started by creating your first coupon'
                              }
                            </p>
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
                      filteredCoupons.map((coupon) => {
                        const userCanModify = canModifyCoupon(coupon);
                        console.log(`Coupon ${coupon.code} - Can modify: ${userCanModify}`); // Debug
                        
                        return (
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
                                    <div>Min: ₹{coupon.minOrder}</div>
                                  )}
                                  {coupon.maxUsage && (
                                    <div>Max use: {coupon.maxUsage}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Vendor (Only for Admin) */}
                            {isAdminUser && (
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  {coupon.createdByRole === 'vendor' ? (
                                    <Store size={14} className="text-warning" />
                                  ) : (
                                    <Users size={14} className="text-primary" />
                                  )}
                                  <small className="text-muted">
                                    {getVendorDisplayName(coupon)}
                                  </small>
                                </div>
                              </td>
                            )}

                            {/* Category */}
                            <td>
                              <div>
                                <span className={`badge ${
                                  coupon.category === 'all' 
                                    ? 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25'
                                    : 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
                                }`}>
                                  {coupon.category === 'all' ? 'All Categories' : 'Specific Category'}
                                </span>
                                {coupon.subCategory && coupon.subCategory !== 'all' && (
                                  <div className="mt-1">
                                    <small className="text-muted">With sub-category</small>
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

                            {/* Actions with 3-dot dropdown */}
                            <td className="pe-4 text-center">
                              <div className="dropdown-container position-relative">
                                <button
                                  className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                                  onClick={(e) => toggleDropdown(coupon.id, e)}
                                  style={{ width: '32px', height: '32px' }}
                                >
                                  <MoreVertical size={16} />
                                </button>
                                
                                {activeDropdown === coupon.id && (
                                  <div className="dropdown-menu show position-absolute end-0 mt-1" style={{zIndex: 9999, minWidth: '150px'}}>
                                    {userCanModify && (
                                      <>
                                        <button
                                          className="dropdown-item py-2 d-flex align-items-center gap-2"
                                          onClick={() => {
                                            setActiveDropdown(null);
                                            router.push(`/coupons/edit/${coupon.id}`);
                                          }}
                                        >
                                          <Edit size={16} />
                                          Edit Coupon
                                        </button>
                                        <button
                                          className="dropdown-item py-2 text-danger d-flex align-items-center gap-2"
                                          onClick={() => {
                                            setActiveDropdown(null);
                                            handleDelete(coupon.id);
                                          }}
                                        >
                                          <Trash2 size={16} />
                                          Delete Coupon
                                        </button>
                                      </>
                                    )}
                                    {!userCanModify && (
                                      <span className="dropdown-item py-2 text-muted small">
                                        Read-only access
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Results Count */}
          {!loading && filteredCoupons.length > 0 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="text-muted small">
                Showing {filteredCoupons.length} coupon{filteredCoupons.length !== 1 ? 's' : ''}
                {isAdminUser && ' from all vendors'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}