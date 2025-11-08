'use client';

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import BootstrapClient from '../../components/BootstrapClient';
import { 
  PlusCircle, Edit, Trash2, Eye, MoreHorizontal, Package, Filter,
  ChevronRight, Folder, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [pendingCategories, setPendingCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [uniqueVendors, setUniqueVendors] = useState([]);
  const [activeTab, setActiveTab] = useState('approved'); // 'approved' or 'pending'

  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchCategories();
    
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
  }, [vendorFilter, mainCategories]);

  const checkAuthAndFetchCategories = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      const userObj = JSON.parse(userData);
      setUser(userObj);
      await fetchAllCategories(userObj);
    } catch (error) {
      alert('Authentication error. Please login again.');
      router.push('/login');
    }
  };

  const fetchAllCategories = async (userObj) => {
    try {
      // Fetch approved categories
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const allCategories = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch pending categories (only for admin users)
      let pendingCats = [];
      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      
      if (isAdminUser) {
        const pendingSnapshot = await getDocs(collection(db, 'pending_categories'));
        pendingCats = pendingSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch vendor details for pending categories to get restaurant names
        for (let pendingCat of pendingCats) {
          if (pendingCat.vendorId && pendingCat.vendorId !== 'admin') {
            try {
              const vendorDoc = await getDoc(doc(db, 'vendors', pendingCat.vendorId));
              if (vendorDoc.exists()) {
                const vendorData = vendorDoc.data();
                pendingCat.restaurantName = vendorData.restaurantName || vendorData.businessName || vendorData.name || 'Restaurant';
                pendingCat.vendorName = vendorData.name || 'Vendor';
              }
            } catch (error) {
              console.error('Error fetching vendor details:', error);
              // Fallback names if vendor fetch fails
              pendingCat.restaurantName = 'Restaurant';
              pendingCat.vendorName = 'Vendor';
            }
          }
        }
      }

      setPendingCategories(pendingCats);

      // Filter main categories
      let mainCats = [];
      if (isAdminUser) {
        // ADMIN: Show ALL categories including own
        mainCats = allCategories.filter(cat => {
          const hasNoParent = !cat.parentCategory || cat.parentCategory === '';
          return hasNoParent;
        });
        
        // Fetch vendor details for main categories to get restaurant names
        for (let mainCat of mainCats) {
          if (mainCat.vendorId && mainCat.vendorId !== 'admin') {
            try {
              const vendorDoc = await getDoc(doc(db, 'vendors', mainCat.vendorId));
              if (vendorDoc.exists()) {
                const vendorData = vendorDoc.data();
                mainCat.restaurantName = vendorData.restaurantName || vendorData.businessName || vendorData.name || 'Restaurant';
                mainCat.vendorName = vendorData.name || 'Vendor';
              }
            } catch (error) {
              console.error('Error fetching vendor details:', error);
              // Fallback names if vendor fetch fails
              mainCat.restaurantName = 'Restaurant';
              mainCat.vendorName = 'Vendor';
            }
          } else if (mainCat.vendorId === 'admin') {
            mainCat.restaurantName = 'Admin Categories';
            mainCat.vendorName = 'Admin';
          }
        }
        
        const vendors = [...new Set(mainCats.map(cat => cat.vendorId).filter(Boolean))];
        setUniqueVendors(vendors);
      } else {
        // VENDOR: Show only own approved categories
        const vendorUid = userObj.documentId || userObj.uid;
        mainCats = allCategories.filter(cat => {
          const isVendorCategory = cat.vendorId === vendorUid;
          const hasNoParent = !cat.parentCategory || cat.parentCategory === '';
          const isApproved = cat.status === 'approved';
          return isVendorCategory && hasNoParent && isApproved;
        });
      }

      setCategories(allCategories);
      setMainCategories(mainCats);
      setFilteredCategories(mainCats);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  const applyVendorFilter = () => {
    if (vendorFilter === 'all') {
      setFilteredCategories(mainCategories);
    } else if (vendorFilter === 'admin') {
      const adminCategories = mainCategories.filter(cat => cat.vendorId === 'admin');
      setFilteredCategories(adminCategories);
    } else {
      const vendorCategories = mainCategories.filter(cat => cat.vendorId === vendorFilter);
      setFilteredCategories(vendorCategories);
    }
  };

  // 🔴 ADMIN APPROVAL FUNCTIONS
  const approveCategory = async (pendingCategory) => {
    try {
      // Clean data - remove undefined fields
      const cleanData = {
        name: pendingCategory.name,
        foodType: pendingCategory.foodType || 'veg',
        priority: pendingCategory.priority || 5,
        parentCategory: pendingCategory.parentCategory || '',
        isMainCategory: Boolean(pendingCategory.isMainCategory),
        isLast: Boolean(pendingCategory.isLast),
        imageUrl: pendingCategory.imageUrl || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'approved',
        isActive: true,
        isGlobal: false,
        accessibleToAll: false,
        createdBy: 'vendor',
        isAdminCategory: false,
        vendorId: pendingCategory.vendorId,
        vendorName: pendingCategory.vendorName || 'Vendor',
        restaurantName: pendingCategory.restaurantName || 'Restaurant',
        approvedBy: user.role,
        approvedAt: Timestamp.now(),
      };

      // Remove any undefined values
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });

      await addDoc(collection(db, 'categories'), cleanData);
      await deleteDoc(doc(db, 'pending_categories', pendingCategory.id));
      
      alert('Category approved successfully!');
      await fetchAllCategories(user);
      
    } catch (error) {
      console.error('Error approving category:', error);
      alert('Failed to approve category.');
    }
  };

  const rejectCategory = async (pendingCategory) => {
    try {
      if (!confirm(`Reject category "${pendingCategory.name}" from ${pendingCategory.restaurantName || pendingCategory.vendorName}?`)) {
        return;
      }
      
      // Remove from pending categories
      await deleteDoc(doc(db, 'pending_categories', pendingCategory.id));
      
      alert('Category rejected successfully!');
      await fetchAllCategories(user);
      
    } catch (error) {
      console.error('Error rejecting category:', error);
      alert('Failed to reject category.');
    }
  };

  const getSubcategoryCount = (categoryId) => {
    return categories.filter(cat => cat.parentCategory === categoryId).length;
  };

  const canModifyCategory = (category) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'main_admin') return true;
    const vendorUid = user.documentId || user.uid;
    return category.vendorId === vendorUid;
  };

  const handleDeleteClick = (category) => {
    const subcategoryCount = getSubcategoryCount(category.id);
    if (subcategoryCount > 0) {
      if (!window.confirm(`This category has ${subcategoryCount} subcategories. Deleting it will also remove all subcategories. Are you sure?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Delete "${category.name}"?`)) return;
    }
    
    deleteDoc(doc(db, 'categories', category.id))
      .then(() => {
        alert('Category deleted successfully!');
        fetchAllCategories(user);
      })
      .catch((error) => {
        console.error('Delete error:', error);
        alert('Delete failed!');
      });
  };

  const toggleDropdown = (categoryId, e) => {
    e?.stopPropagation();
    setActiveDropdown(activeDropdown === categoryId ? null : categoryId);
  };

  const getVendorDisplayName = (vendorId) => {
    if (vendorId === 'admin') return 'Admin Categories';
    
    const vendorCategory = mainCategories.find(cat => cat.vendorId === vendorId);
    if (vendorCategory?.restaurantName) {
      return vendorCategory.restaurantName;
    }
    
    if (vendorCategory?.vendorName) {
      return vendorCategory.vendorName;
    }
    
    return `Vendor: ${vendorId.substring(0, 10)}...`;
  };

  if (loading) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-muted">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdminUser = user?.role === 'admin' || user?.role === 'main_admin';
  const isMainAdmin = user?.role === 'main_admin';

  return (
    <div className="d-flex min-vh-100">
      <Sidebar />
      <BootstrapClient />
      
      <div className="flex-grow-1 bg-light">
        {/* Fixed Header Section */}
        <div className="p-4 mb-2 border-bottom" style={{backgroundColor: '#e3f2fd', borderBottom: '2px solid #bbdefb'}}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">Categories Management</h2>
              <p className="text-muted mb-0">
                {isAdminUser ? 'Manage all categories and approvals' : 'Manage your categories'}
              </p>
            </div>
            
            <div className="text-end">
              <div className={`badge ${isAdminUser ? 'bg-warning' : 'bg-primary'} bg-opacity-10 ${isAdminUser ? 'text-warning' : 'text-primary'} border px-3 py-2 me-3`}>
                <Package size={16} className="me-1" />
                {activeTab === 'approved' ? filteredCategories.length : pendingCategories.length} 
                {activeTab === 'approved' ? ' Approved' : ' Pending'} Categories
              </div>
              <Link href="/categories/create" className="btn btn-primary d-flex align-items-center gap-2">
                <PlusCircle size={18} />
                Add Category
              </Link>
            </div>
          </div>

          {/* Tabs for Admin Users */}
          {isAdminUser && (
            <div className="mt-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary rounded-circle p-2">
                          <Filter size={18} className="text-white" />
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-0">Category Management</h6>
                          <small className="text-muted">
                            {activeTab === 'approved' 
                              ? `${filteredCategories.length} approved categories` 
                              : `${pendingCategories.length} pending approvals`
                            }
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="d-flex align-items-center gap-3 justify-content-end">
                        {/* Tabs */}
                        <div className="btn-group" role="group">
                          <button
                            type="button"
                            className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setActiveTab('approved')}
                          >
                            <CheckCircle size={16} className="me-2" />
                            Approved ({filteredCategories.length})
                          </button>
                          <button
                            type="button"
                            className={`btn ${activeTab === 'pending' ? 'btn-warning' : 'btn-outline-warning'} position-relative`}
                            onClick={() => setActiveTab('pending')}
                          >
                            <Clock size={16} className="me-2" />
                            Pending Approval 
                            {pendingCategories.length > 0 && (
                              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                {pendingCategories.length}
                              </span>
                            )}
                          </button>
                        </div>
                        
                        {/* Vendor Filter (only for approved tab) */}
                        {activeTab === 'approved' && (
                          <select 
                            className="form-select form-select-sm border-primary"
                            value={vendorFilter}
                            onChange={(e) => setVendorFilter(e.target.value)}
                            style={{minWidth: '200px'}}
                          >
                            <option value="all">All Vendors ({mainCategories.length})</option>
                            <option value="admin">Admin ({mainCategories.filter(cat => cat.vendorId === 'admin').length})</option>
                            {uniqueVendors.filter(vendor => vendor !== 'admin').map(vendor => (
                              <option key={vendor} value={vendor}>
                                {getVendorDisplayName(vendor)} ({mainCategories.filter(cat => cat.vendorId === vendor).length})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          {/* PENDING APPROVAL TAB CONTENT */}
          {activeTab === 'pending' && isAdminUser ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                {pendingCategories.length === 0 ? (
                  <div className="text-center py-5">
                    <CheckCircle size={64} className="text-success mb-3 opacity-50" />
                    <h5 className="fw-semibold text-dark">No Pending Approvals</h5>
                    <p className="text-muted">All vendor categories have been reviewed.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-warning">
                        <tr>
                          <th className="ps-4 py-3">Image</th>
                          <th className="py-3">Category Name</th>
                          <th className="py-3">Restaurant</th>
                          <th className="py-3">Food Type</th>
                          <th className="py-3">Requested</th>
                          <th className="py-3">Priority</th>
                          <th className="pe-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingCategories.map((category) => (
                          <tr key={category.id} className="border-top">
                            <td className="ps-4">
                              {category.imageUrl ? (
                                <img src={category.imageUrl} alt={category.name} className="rounded" style={{width: '60px', height: '60px', objectFit: 'cover'}} />
                              ) : (
                                <div className="rounded bg-light d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                                  <Package size={24} className="text-muted" />
                                </div>
                              )}
                            </td>

                            <td>
                              <h6 className="fw-semibold mb-1 text-dark">{category.name}</h6>
                              <small className="text-muted">
                                {category.isMainCategory ? 'Main Category' : 'Subcategory'}
                                {category.parentCategory && ` → Parent: ${category.parentCategory}`}
                              </small>
                            </td>

                            <td>
                              <div>
                                <h6 className="fw-semibold text-dark mb-1">
                                  {category.restaurantName || category.vendorName || 'My Restaurant'}
                                </h6>
                                {category.vendorEmail && (
                                  <small className="text-muted">{category.vendorEmail}</small>
                                )}
                                <div className="mt-1">
                                  <span className="badge bg-warning">Vendor</span>
                                  {/* {category.vendorId && (
                                    <small className="text-muted ms-1">ID: {category.vendorId.substring(0, 8)}...</small>
                                  )} */}
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className={`badge ${category.foodType === 'veg' ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${category.foodType === 'veg' ? 'text-success' : 'text-danger'} border`}>
                                {category.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                              </span>
                            </td>

                            <td>
                              <small className="text-muted">
                                {category.requestedAt?.toDate?.().toLocaleDateString() || 'Recently'}
                              </small>
                            </td>

                            <td>
                              <span className="badge bg-info">{category.priority}</span>
                            </td>

                            <td className="pe-4 text-center">
                              <div className="d-flex gap-2 justify-content-center">
                                <button
                                  className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                  onClick={() => approveCategory(category)}
                                  title="Approve Category"
                                >
                                  <CheckCircle size={16} />
                                  Approve
                                </button>
                                <button
                                  className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                                  onClick={() => rejectCategory(category)}
                                  title="Reject Category"
                                >
                                  <XCircle size={16} />
                                  Reject
                                </button>
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => {
                                    // View category details modal or page
                                    alert(`Category: ${category.name}\nRestaurant: ${category.restaurantName || category.vendorName}\nFood Type: ${category.foodType}\nPriority: ${category.priority}`);
                                  }}
                                  title="View Details"
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* APPROVED CATEGORIES TAB CONTENT */
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4 py-3">Image</th>
                        <th className="py-3">Name</th>
                        {isAdminUser && <th className="py-3">Restaurant</th>}
                        <th className="py-3">Food Type</th>
                        <th className="py-3">Subcategories</th>
                        <th className="py-3">Is Last</th>
                        <th className="py-3">Actions</th>
                        <th className="pe-4 py-3 text-center">Menu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={isAdminUser ? 8 : 7} className="text-center py-5">
                            <div className="text-muted">
                              <Package size={48} className="mb-3 opacity-50" />
                              <h5 className="fw-semibold">No categories found</h5>
                              <Link href="/categories/create" className="btn btn-primary">
                                <PlusCircle size={18} className="me-2" />
                                Create First Category
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((category) => {
                          const subcategoryCount = getSubcategoryCount(category.id);
                          const canViewSubcategories = !category.isLast || subcategoryCount > 0;
                          const userCanModify = canModifyCategory(category);
                          
                          return (
                            <tr key={category.id} className="border-top">
                              <td className="ps-4">
                                {category.imageUrl ? (
                                  <img src={category.imageUrl} alt={category.name} className="rounded-circle" style={{width: '60px', height: '60px', objectFit: 'cover'}} />
                                ) : (
                                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                                    <Package size={24} className="text-muted" />
                                  </div>
                                )}
                              </td>

                              <td>
                                <h6 className="fw-semibold mb-1 text-dark">{category.name}</h6>
                                <small className="text-muted">Main Category</small>
                              </td>

                              {isAdminUser && (
                                <td>
                                  <div>
                                    <h6 className="fw-semibold text-dark mb-1">
                                      {category.restaurantName || category.vendorName || 'Restaurant'}
                                    </h6>
                                    <span className={`badge ${category.vendorId === 'admin' ? 'bg-primary' : 'bg-success'}`}>
                                      {category.vendorId === 'admin' ? 'Admin' : 'Vendor'}
                                    </span>
                                    {/* {category.vendorId && category.vendorId !== 'admin' && (
                                      <small className="text-muted ms-1 d-block">ID33: {category.vendorId.substring(0, 8)}...</small>
                                    )} */}
                                  </div>
                                </td>
                              )}

                              <td>
                                <span className={`badge ${category.foodType === 'veg' ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${category.foodType === 'veg' ? 'text-success' : 'text-danger'} border`}>
                                  {category.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                                </span>
                              </td>

                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-semibold text-dark">{subcategoryCount}</span>
                                  <small className="text-muted">subcategories</small>
                                  {canViewSubcategories && (
                                    <ChevronRight size={16} className="text-muted" />
                                  )}
                                </div>
                              </td>

                              <td>
                                <span className={`badge ${category.isLast ? 'bg-success' : 'bg-secondary'}`}>
                                  {category.isLast ? 'Yes' : 'No'}
                                </span>
                              </td>

                              <td>
                                {canViewSubcategories ? (
                                  <Link 
                                    href={`/categories/${category.id}`} 
                                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                                  >
                                    <Folder size={14} />
                                    View Subcategories
                                  </Link>
                                ) : (
                                  <span className="text-muted small">Final Level</span>
                                )}
                              </td>

                              <td className="pe-4 text-center">
                                <div className="dropdown-container position-relative">
                                  <button
                                    className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                                    onClick={(e) => toggleDropdown(category.id, e)}
                                    style={{ width: '32px', height: '32px' }}
                                    disabled={!userCanModify}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                  
                                  {activeDropdown === category.id && (
                                    <div className="dropdown-menu show position-absolute end-0 mt-1" style={{zIndex: 9999, minWidth: '200px'}}>
                                      <Link 
                                        href={`/categories/edit/${category.id}`} 
                                        className="dropdown-item py-2 d-flex align-items-center gap-2"
                                        onClick={() => setActiveDropdown(null)}
                                      >
                                        <Edit size={16} />
                                        Edit Category
                                      </Link>
                                      
                                      {canViewSubcategories && (
                                        <Link 
                                          href={`/categories/${category.id}`} 
                                          className="dropdown-item py-2 d-flex align-items-center gap-2"
                                          onClick={() => setActiveDropdown(null)}
                                        >
                                          <Eye size={16} />
                                          View Subcategories
                                        </Link>
                                      )}
                                      
                                      {!category.isLast && (
                                        <Link 
                                          href={`/categories/create?parent=${category.id}`} 
                                          className="dropdown-item py-2 d-flex align-items-center gap-2"
                                          onClick={() => setActiveDropdown(null)}
                                        >
                                          <PlusCircle size={16} />
                                          Add Subcategory
                                        </Link>
                                      )}
                                      
                                      <hr className="my-1" />
                                      
                                      <button 
                                        className="dropdown-item py-2 text-danger d-flex align-items-center gap-2" 
                                        onClick={() => handleDeleteClick(category)}
                                      >
                                        <Trash2 size={16} />
                                        Delete Category
                                      </button>
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
          )}
        </div>
      </div>
    </div>
  );
}