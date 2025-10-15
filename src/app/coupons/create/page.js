'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { db } from '../../../firebase/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { ArrowLeft, Save, Tag, Percent, DollarSign, Calendar, Package, X } from 'lucide-react';

export default function CreateCoupon() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('Percentage');
  const [discount, setDiscount] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [activeDate, setActiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [mainCategory, setMainCategory] = useState('all');
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);

  // Categories data
  const mainCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'veg', label: '🥗 Vegetarian' },
    { value: 'nonveg', label: '🍗 Non-Vegetarian' }
  ];

  const subCategories = {
    veg: ['Pizza', 'Burger', 'Pasta', 'Salad', 'Sandwich', 'Rice', 'Noodles', 'Soup', 'Appetizer', 'Dessert'],
    nonveg: ['Chicken', 'Mutton', 'Fish', 'Seafood', 'Egg', 'Chicken Pizza', 'Non-Veg Burger', 'Non-Veg Rice']
  };

  const handleSubCategoryChange = (subCat) => {
    if (selectedSubCategories.includes(subCat)) {
      setSelectedSubCategories(selectedSubCategories.filter(item => item !== subCat));
    } else {
      setSelectedSubCategories([...selectedSubCategories, subCat]);
    }
  };

  const removeSubCategory = (subCatToRemove) => {
    setSelectedSubCategories(selectedSubCategories.filter(subCat => subCat !== subCatToRemove));
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('Percentage');
    setDiscount('');
    setMinOrder('');
    setMaxDiscount('');
    setActiveDate('');
    setExpiryDate('');
    setUsageLimit('');
    setMainCategory('all');
    setSelectedSubCategories([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || !discount || !activeDate || !expiryDate) {
      alert('Please fill all required fields!');
      return;
    }

    const couponData = {
      code: code.toUpperCase(),
      discountType,
      discount: parseFloat(discount),
      minOrder: minOrder ? parseFloat(minOrder) : 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      activeDate: Timestamp.fromDate(new Date(activeDate)),
      expiryDate: Timestamp.fromDate(new Date(expiryDate)),
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      mainCategory,
      subCategories: selectedSubCategories,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      usedCount: 0
    };

    try {
      setLoading(true);
      await addDoc(collection(db, 'coupons'), couponData);
      alert('Coupon created successfully!');
      resetForm();
      router.push('/coupons');
    } catch (error) {
      console.error('Error creating coupon:', error);
      alert('Error creating coupon!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
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
                Back to Coupons
              </button>
              <h2 className="fw-bold text-dark mb-1">Create New Coupon</h2>
              <p className="text-muted mb-0">Create discount coupons for your customers</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4">
          <div className="row">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>
                    
                    {/* Basic Information */}
                    <div className="row mb-4">
                      <div className="col-12 mb-3">
                        <h5 className="fw-semibold text-dark">Basic Information</h5>
                      </div>
                      
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-medium text-dark">Coupon Code *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="WELCOME20"
                          required
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
                          <option value="Fixed">Fixed Amount</option>
                        </select>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-medium text-dark">Discount Value *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder={discountType === 'Percentage' ? '10' : '100'}
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-medium text-dark">Minimum Order Amount</label>
                        <input
                          type="number"
                          className="form-control"
                          value={minOrder}
                          onChange={(e) => setMinOrder(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Limits & Validity */}
                    <div className="row mb-4">
                      <div className="col-12 mb-3">
                        <h5 className="fw-semibold text-dark">Limits & Validity</h5>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-medium text-dark">
                          {discountType === 'Percentage' ? 'Max Discount Amount' : 'Usage Limit'}
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={discountType === 'Percentage' ? maxDiscount : usageLimit}
                          onChange={(e) => discountType === 'Percentage' ? setMaxDiscount(e.target.value) : setUsageLimit(e.target.value)}
                          placeholder={discountType === 'Percentage' ? 'No limit' : 'Unlimited'}
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-medium text-dark">Active Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={activeDate}
                          onChange={(e) => setActiveDate(e.target.value)}
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
                          required
                        />
                      </div>
                    </div>

                    {/* Category Restrictions */}
                    <div className="row mb-4">
                      <div className="col-12 mb-3">
                        <h5 className="fw-semibold text-dark">Category Restrictions</h5>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-medium text-dark">Main Category</label>
                        <select
                          className="form-select"
                          value={mainCategory}
                          onChange={(e) => {
                            setMainCategory(e.target.value);
                            setSelectedSubCategories([]);
                          }}
                        >
                          {mainCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      {mainCategory !== 'all' && (
                        <div className="col-12 mb-3">
                          <label className="form-label fw-medium text-dark">Sub Categories</label>
                          
                          {/* Selected Tags */}
                          {selectedSubCategories.length > 0 && (
                            <div className="mb-3">
                              <div className="d-flex flex-wrap gap-2">
                                {selectedSubCategories.map(subCat => (
                                  <span 
                                    key={subCat}
                                    className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 d-flex align-items-center gap-1"
                                  >
                                    {subCat}
                                    <X 
                                      size={14} 
                                      className="cursor-pointer" 
                                      onClick={() => removeSubCategory(subCat)}
                                    />
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sub Categories Grid */}
                          <div className="border rounded p-3 bg-light">
                            <div className="row g-2">
                              {subCategories[mainCategory]?.map(subCat => (
                                <div key={subCat} className="col-md-4 col-sm-6">
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={selectedSubCategories.includes(subCat)}
                                      onChange={() => handleSubCategoryChange(subCat)}
                                      id={`subcat-${subCat}`}
                                    />
                                    <label 
                                      className="form-check-label small" 
                                      htmlFor={`subcat-${subCat}`}
                                    >
                                      {subCat}
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coupon Summary */}
                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="p-3 border rounded bg-light">
                          <h6 className="fw-semibold text-dark mb-3">Coupon Summary</h6>
                          <div className="row text-center">
                            <div className="col-md-3 mb-2">
                              <div className="p-2">
                                <div className="fw-bold text-primary">{code || '---'}</div>
                                <small className="text-muted">Code</small>
                              </div>
                            </div>
                            <div className="col-md-3 mb-2">
                              <div className="p-2">
                                <div className="fw-bold text-success">
                                  {discount ? (
                                    discountType === 'Percentage' ? `${discount}%` : `₹${discount}`
                                  ) : '---'}
                                </div>
                                <small className="text-muted">Discount</small>
                              </div>
                            </div>
                            <div className="col-md-3 mb-2">
                              <div className="p-2">
                                <div className="fw-bold text-warning">
                                  {minOrder ? `₹${minOrder}` : 'No min'}
                                </div>
                                <small className="text-muted">Min Order</small>
                              </div>
                            </div>
                            <div className="col-md-3 mb-2">
                              <div className="p-2">
                                <div className="fw-bold text-info">
                                  {selectedSubCategories.length > 0 ? selectedSubCategories.length : 'All'}
                                </div>
                                <small className="text-muted">Categories</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetForm}
                        disabled={loading}
                      >
                        Clear Form
                      </button>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => router.push('/coupons')}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary d-flex align-items-center gap-2"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              Creating...
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              Create Coupon
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
      </div>
    </div>
  );
}