'use client';

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import BootstrapClient from '../../components/BootstrapClient';
import { 
  PlusCircle, Edit, Trash2, Eye, MoreHorizontal, Package, Filter,
  ChevronRight, Folder
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [uniqueVendors, setUniqueVendors] = useState([]);

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
      await fetchCategories(userObj);
    } catch (error) {
      alert('Authentication error. Please login again.');
      router.push('/login');
    }
  };

  const fetchCategories = async (userObj) => {
    try {
      const allCategoriesSnapshot = await getDocs(collection(db, 'categories'));
      const allCategories = allCategoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      let mainCats = [];

      if (isAdminUser) {
        // ADMIN: Show ALL categories including own
        mainCats = allCategories.filter(cat => {
          const hasNoParent = !cat.parentCategory || cat.parentCategory === '';
          return hasNoParent;
        });
        
        const vendors = [...new Set(mainCats.map(cat => cat.vendorId).filter(Boolean))];
        setUniqueVendors(vendors);
      } else {
        // VENDOR: Show only own categories
        const vendorUid = userObj.documentId || userObj.uid;
        mainCats = allCategories.filter(cat => {
          const isVendorCategory = cat.vendorId === vendorUid;
          const hasNoParent = !cat.parentCategory || cat.parentCategory === '';
          return isVendorCategory && hasNoParent;
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
        fetchCategories(user);
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

  return (
    <div className="d-flex min-vh-100">
      <Sidebar />
      <BootstrapClient />
      
      <div className="flex-grow-1 bg-light">
        {/* Fixed Header Section with Blue Background */}
        <div className="p-4 mb-2 border-bottom" style={{backgroundColor: '#e3f2fd', borderBottom: '2px solid #bbdefb'}}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">Main Categories Management</h2>
              <p className="text-muted mb-0">
                {isAdminUser ? 'Manage all categories' : 'Manage your categories'}
              </p>
            </div>
            
            <div className="text-end">
              <div className={`badge ${isAdminUser ? 'bg-warning' : 'bg-primary'} bg-opacity-10 ${isAdminUser ? 'text-warning' : 'text-primary'} border px-3 py-2 me-3`}>
                <Package size={16} className="me-1" />
                {filteredCategories.length} {isAdminUser ? 'Total' : 'My'} Categories
              </div>
              <Link href="/categories/create" className="btn btn-primary d-flex align-items-center gap-2">
                <PlusCircle size={18} />
                Add Category
              </Link>
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
                            {filteredCategories.length} of {mainCategories.length} categories showing
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
                          <option value="all">All Vendors ({mainCategories.length})</option>
                          <option value="admin">Admin ({mainCategories.filter(cat => cat.vendorId === 'admin').length})</option>
                          {uniqueVendors.filter(vendor => vendor !== 'admin').map(vendor => (
                            <option key={vendor} value={vendor}>
                              {getVendorDisplayName(vendor)} ({mainCategories.filter(cat => cat.vendorId === vendor).length})
                            </option>
                          ))}
                        </select>
                        
                        <div className="bg-white rounded px-3 py-2 border">
                          <small className="text-primary fw-bold">{filteredCategories.length}</small>
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
                      <th className="ps-4 py-3">Image</th>
                      <th className="py-3">Name</th>
                      {isAdminUser && <th className="py-3">Vendor</th>}
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
                                <small className="text-muted">
                                  {getVendorDisplayName(category.vendorId)}
                                </small>
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
        </div>
      </div>
    </div>
  );
}