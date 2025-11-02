'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../../components/Sidebar';
import { db } from '../../../../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc,
  Timestamp,
  getDocs 
} from 'firebase/firestore';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [coupon, setCoupon] = useState(null);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('Percentage');
  const [discount, setDiscount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [activeDate, setActiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [isActive, setIsActive] = useState(true);

  const couponId = params.id;

  console.log('🆔 Coupon ID from params:', couponId);

  // Check authentication and fetch data
  useEffect(() => {
    if (couponId) {
      checkAuthAndFetchData();
    }
  }, [couponId]);

  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      fetchSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
      setSelectedSubCategory('all');
    }
  }, [selectedCategory]);

  const checkAuthAndFetchData = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    setCurrentUser(userObj);
    fetchCouponAndCategories(userObj);
  };

  const fetchCouponAndCategories = async (userObj) => {
    try {
      setFetchLoading(true);
      
      console.log('📥 Fetching coupon with ID:', couponId);
      
      // Fetch coupon data
      const couponDoc = await getDoc(doc(db, 'coupons', couponId));
      
      if (!couponDoc.exists()) {
        console.log('❌ Coupon not found with ID:', couponId);
        alert('Coupon not found!');
        router.push('/coupons');
        return;
      }

      const couponData = {
        id: couponDoc.id,
        ...couponDoc.data(),
      };

      console.log('✅ Coupon data found:', couponData);

      // Check permissions
      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      if (!isAdminUser) {
        const vendorUid = userObj.documentId || userObj.uid;
        const vendorEmail = userObj.email;
        
        const canEdit = 
          couponData.createdBy === vendorUid || 
          couponData.createdBy === vendorEmail ||
          couponData.createdBy === userObj.userId;
        
        console.log('🔐 Permission check:', {
          couponCreatedBy: couponData.createdBy,
          vendorUid,
          vendorEmail,
          canEdit
        });

        if (!canEdit) {
          alert('You do not have permission to edit this coupon!');
          router.push('/coupons');
          return;
        }
      }

      setCoupon(couponData);

      // Set form values from coupon data
      setCode(couponData.code || '');
      setDiscountType(couponData.discountType || 'Percentage');
      setDiscount(couponData.discount?.toString() || '');
      setMinOrder(couponData.minOrder?.toString() || '');
      setMaxUsage(couponData.maxUsage?.toString() || '');
      
      // Format dates
      const activeDateObj = couponData.activeDate?.toDate();
      const expiryDateObj = couponData.expiryDate?.toDate();
      
      setActiveDate(activeDateObj ? activeDateObj.toISOString().split('T')[0] : '');
      setExpiryDate(expiryDateObj ? expiryDateObj.toISOString().split('T')[0] : '');
      
      setSelectedCategory(couponData.category || 'all');
      setSelectedSubCategory(couponData.subCategory || 'all');
      setIsActive(couponData.isActive !== false);

      // Fetch categories
      await fetchCategories(userObj, couponData.category);
    } catch (error) {
      console.error('❌ Error fetching coupon:', error);
      alert('Error loading coupon data!');
      router.push('/coupons');
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchCategories = async (userObj, currentCategory) => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const activeCategories = categoriesData.filter(cat => cat.isActive !== false);
      
      // Filter categories based on user role
      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      let filteredCategories = [];

      if (isAdminUser) {
        // Admin can see ALL categories
        filteredCategories = activeCategories;
      } else {
        // Vendor can only see their own categories
        const vendorUid = userObj.documentId || userObj.uid;
        filteredCategories = activeCategories.filter(cat => 
          cat.vendorId === vendorUid || cat.createdBy === vendorUid
        );
      }
      
      setCategories(filteredCategories);

      // If current category is not in filtered list, add it
      if (currentCategory && currentCategory !== 'all') {
        const currentCatExists = filteredCategories.some(cat => cat.id === currentCategory);
        if (!currentCatExists) {
          const originalCategory = categoriesData.find(cat => cat.id === currentCategory);
          if (originalCategory) {
            setCategories([...filteredCategories, originalCategory]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubCategories = async (categoryId) => {
    try {
      const subCategoriesSnapshot = await getDocs(collection(db, 'subcategories'));
      const subCategoriesData = subCategoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Filter subcategories by selected category and user
      const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'main_admin';
      let filteredSubCategories = subCategoriesData.filter(
        subCat => subCat.categoryId === categoryId && subCat.isActive !== false
      );

      if (!isAdminUser && currentUser) {
        // Vendor can only see subcategories from their own categories
        const vendorUid = currentUser.documentId || currentUser.uid;
        filteredSubCategories = filteredSubCategories.filter(subCat => 
          subCat.vendorId === vendorUid || subCat.createdBy === vendorUid
        );
      }
      
      setSubCategories(filteredSubCategories);

      // If current subcategory is not in filtered list, add it
      if (selectedSubCategory && selectedSubCategory !== 'all') {
        const currentSubCatExists = filteredSubCategories.some(subCat => subCat.id === selectedSubCategory);
        if (!currentSubCatExists) {
          const originalSubCategory = subCategoriesData.find(subCat => subCat.id === selectedSubCategory);
          if (originalSubCategory) {
            setSubCategories([...filteredSubCategories, originalSubCategory]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || !discount || !activeDate || !expiryDate) {
      alert('Please fill all required fields!');
      return;
    }

    // Validate dates
    const active = new Date(activeDate);
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (active < today) {
      alert('Active date cannot be in the past!');
      return;
    }

    if (expiry <= active) {
      alert('Expiry date must be after active date!');
      return;
    }

    const couponData = {
      code: code.toUpperCase().trim(),
      discountType,
      discount: parseFloat(discount),
      minOrder: minOrder ? parseFloat(minOrder) : 0,
      maxUsage: maxUsage ? parseInt(maxUsage) : null,
      activeDate: Timestamp.fromDate(new Date(activeDate)),
      expiryDate: Timestamp.fromDate(new Date(expiryDate)),
      category: selectedCategory,
      subCategory: selectedSubCategory,
      updatedAt: Timestamp.now(),
      isActive: isActive,
    };

    console.log('💾 Updating coupon with data:', couponData);

    try {
      setLoading(true);
      await updateDoc(doc(db, 'coupons', couponId), couponData);
      alert('Coupon updated successfully!');
      router.push('/coupons');
    } catch (error) {
      console.error('Error updating coupon:', error);
      alert('Error updating coupon!');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'main_admin';

  if (fetchLoading) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-muted">Loading coupon data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <p className="text-muted">Coupon not found</p>
            <button
              className="btn btn-primary"
              onClick={() => router.push('/coupons')}
            >
              Back to Coupons
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex min-vh-100">
      <Sidebar />
      
      <div className="flex-grow-1">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 mb-2"
                onClick={() => router.push('/coupons')}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <h2 className="fw-bold text-dark mb-1">Edit Coupon</h2>
              <p className="text-muted mb-0">
                {isAdminUser 
                  ? 'Edit discount coupon for all products' 
                  : 'Edit your discount coupon'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                
                {/* Basic Information */}
                <div className="row mb-4">
                  <div className="col-12 mb-3">
                    <h5 className="fw-semibold text-dark">Coupon Details</h5>
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Coupon Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Ex. SUMMER25"
                      required
                      maxLength={20}
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Discount Type *</label>
                    <select
                      className="form-select"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <option value="Percentage">Percentage %</option>
                      <option value="Fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Discount Value *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder={discountType === 'Percentage' ? 'Ex. 20' : '100'}
                      min="1"
                      max={discountType === 'Percentage' ? '100' : '10000'}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Minimum Order Price</label>
                    <input
                      type="number"
                      className="form-control"
                      value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      placeholder="Ex. 3"
                      min="0"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="row mb-4">
                  <div className="col-12 mb-3">
                    <h5 className="fw-semibold text-dark">Product Category</h5>
                    {!isAdminUser && categories.length === 0 && (
                      <div className="alert alert-warning mt-2">
                        <small>No categories found. This coupon will work on all products.</small>
                      </div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Select Category</label>
                    <select
                      className="form-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">All Categories (Works on all products)</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.emoji || '📦'} {category.name}
                        </option>
                      ))}
                    </select>
                    {!isAdminUser && (
                      <div className="form-text">
                        Showing only your categories
                      </div>
                    )}
                  </div>

                  {selectedCategory !== 'all' && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-medium text-dark">Sub Category</label>
                      <select
                        className="form-select"
                        value={selectedSubCategory}
                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                      >
                        <option value="all">All Sub Categories</option>
                        {subCategories.map(subCategory => (
                          <option key={subCategory.id} value={subCategory.id}>
                            {subCategory.emoji || '🍽️'} {subCategory.name}
                          </option>
                        ))}
                      </select>
                      {subCategories.length === 0 && selectedCategory !== 'all' && (
                        <div className="form-text text-warning">
                          No sub-categories found for this category
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Limits & Validity */}
                <div className="row mb-4">
                  <div className="col-12 mb-3">
                    <h5 className="fw-semibold text-dark">Validity & Limits</h5>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Usage Limit per Customer</label>
                    <input
                      type="number"
                      className="form-control"
                      value={maxUsage}
                      onChange={(e) => setMaxUsage(e.target.value)}
                      placeholder="Unlimited"
                      min="1"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Active Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={activeDate}
                      onChange={(e) => setActiveDate(e.target.value)}
                      min={getTodayDate()}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Expiry Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={activeDate || getTodayDate()}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-medium text-dark">Coupon Status</label>
                    <select
                      className="form-select"
                      value={isActive}
                      onChange={(e) => setIsActive(e.target.value === 'true')}
                    >
                      <option value={true}>Active</option>
                      <option value={false}>Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Coupon Info */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="alert alert-info">
                      <strong>Coupon Information:</strong><br />
                      • Created: {coupon.createdAt?.toDate().toLocaleDateString()}<br />
                      • Used: {coupon.usedCount || 0} times<br />
                      • Created by: {coupon.createdByName || coupon.createdBy}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => router.push('/coupons')}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => router.push('/coupons')}
                      disabled={loading}
                    >
                      Discard Changes
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary d-flex align-items-center gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="spinner-border spinner-border-sm" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Update Coupon
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}