'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import Sidebar from '../../../components/Sidebar';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  ArrowLeft,
  MoreHorizontal,
  Package
} from 'lucide-react';
import Link from 'next/link';

export default function SubCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const [subCategories, setSubCategories] = useState([]);
  const [parentCategory, setParentCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [error, setError] = useState(null);

  // ✅ FIX: Try different ways to get the ID
  const categoryId = params.id || params.categoryId || params.slug;

  console.log('🚀 SubCategoryPage params:', params);
  console.log('🎯 Category ID:', categoryId);

  useEffect(() => {
    console.log('📅 useEffect triggered');
    
    if (categoryId) {
      console.log('✅ Category ID found, fetching data...');
      fetchData();
    } else {
      console.log('❌ No category ID found in params');
      setError('No category ID provided in URL');
      setLoading(false);
    }
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [categoryId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Starting to fetch data for category:', categoryId);

      await Promise.all([
        fetchParentCategory(),
        fetchSubCategories()
      ]);

    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchParentCategory = async () => {
    try {
      console.log('🔍 Fetching parent category...');
      const allCategoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categories = allCategoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const parent = categories.find(cat => cat.id === categoryId);
      console.log('✅ Parent category found:', parent);
      setParentCategory(parent);
      
      if (!parent) {
        setError(`Parent category with ID "${categoryId}" not found`);
      }
    } catch (error) {
      console.error('Error fetching parent category:', error);
      setError('Failed to load parent category');
    }
  };

  const fetchSubCategories = async () => {
    try {
      console.log('🔄 Fetching subcategories for:', categoryId);
      const allCategoriesSnapshot = await getDocs(collection(db, 'categories'));
      const allCategories = allCategoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log('📊 Total categories in database:', allCategories.length);

      // Filter subcategories
      const subCats = allCategories.filter(cat => {
        const isSubcategory = cat.parentCategory === categoryId;
        return isSubcategory;
      });

      console.log('✅ Subcategories found:', subCats.length);
      setSubCategories(subCats);

    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setError('Failed to load subcategories');
    }
  };

  const toggleIsLast = async (category) => {
    try {
      const docRef = doc(db, 'categories', category.id);
      await updateDoc(docRef, {
        isLast: !category.isLast
      });
      fetchSubCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}" subcategory?`)) return;

    try {
      await deleteDoc(doc(db, 'categories', category.id));
      alert('Subcategory deleted successfully!');
      fetchSubCategories();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Delete failed! Please try again.');
    }
  };

  const toggleDropdown = (categoryId, e) => {
    if (e) e.stopPropagation();
    setActiveDropdown(activeDropdown === categoryId ? null : categoryId);
  };

  // Show error if no category ID
  if (!categoryId) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="alert alert-danger">
              <h5>Invalid URL</h5>
              <p>No category ID provided in the URL.</p>
              <p className="small text-muted">Please go back and select a category.</p>
              <Link 
                href="/categories"
                className="btn btn-primary mt-2"
              >
                Back to Categories
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading subcategories...</p>
            <p className="text-info small">Category ID: {categoryId}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="alert alert-danger">
              <h5>Error Loading Page</h5>
              <p>{error}</p>
              <p className="small text-muted">Category ID: {categoryId}</p>
              <button 
                onClick={fetchData}
                className="btn btn-primary mt-2"
              >
                Try Again
              </button>
              <Link 
                href="/categories"
                className="btn btn-outline-secondary mt-2 ms-2"
              >
                Back to Categories
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      
      <div className="flex-grow-1 bg-light">
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-3">

              <div>
 <Link
  href="/categories"
  className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center gap-2 rounded-pill px-3 py-2"
  style={{
    transition: "all 0.2s ease",
    backgroundColor: "#f8f9fa",
  }}
  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e9ecef")}
  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
>
  <ArrowLeft size={16} />
  Back to Categories
</Link>

                <h2 className="fw-bold text-dark mb-1">
                  {parentCategory ? `Subcategories of "${parentCategory.name}"` : 'Subcategories'}
                </h2>
                <p className="text-muted mb-0">
                  {parentCategory 
                    ? `Manage subcategories under ${parentCategory.name}` 
                    : 'Manage subcategories'
                  }
                </p>
                <small className="text-info">
                  Parent ID: <code>{categoryId}</code>
                </small>
                
              </div>
              
            </div>
            
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 me-3">
                <Package size={16} className="me-1" />
                {subCategories.length} Subcategories
              </div>
              <Link
                href={`/categories/create?parentId=${categoryId}`}
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                <PlusCircle size={18} />
                Add Subcategory
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4 py-3 fw-semibold text-dark">Image</th>
                      <th className="py-3 fw-semibold text-dark">Name</th>
                      <th className="py-3 fw-semibold text-dark">Food Type</th>
                      <th className="py-3 fw-semibold text-dark">Actions</th>
                      <th className="py-3 fw-semibold text-dark">Is Last</th>
                      <th className="pe-4 py-3 fw-semibold text-dark text-center">Menu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subCategories.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="text-muted">
                            <Package size={48} className="mb-3 opacity-50" />
                            <h5 className="fw-semibold">No subcategories found</h5>
                            <p className="mb-3">No subcategories found for "{parentCategory?.name}"</p>
                            <Link
                              href={`/categories/create?parentId=${categoryId}`}
                              className="btn btn-primary"
                            >
                              <PlusCircle size={18} className="me-2" />
                              Create First Subcategory
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      subCategories.map((category) => (
                        <tr key={category.id} className="border-top">
                          {/* Image */}
                          <td className="ps-4">
                            {category.imageUrl ? (
                              <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="rounded-circle"
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                style={{
                                  width: '60px',
                                  height: '60px'
                                }}
                              >
                                <Package size={24} className="text-muted" />
                              </div>
                            )}
                          </td>

                          {/* Name */}
                          <td>
                            <h6 className="fw-semibold mb-1 text-dark">{category.name}</h6>
                            <small className="text-muted">Subcategory</small>
                          </td>

                          {/* Food Type */}
                          <td>
                            <span className={`badge ${
                              category.foodType === 'veg' 
                                ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' 
                                : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
                            } d-flex align-items-center gap-1`}>
                              {category.foodType === 'veg' ? '🥕 Vegetarian' : '🍗 Non-Vegetarian'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="d-flex gap-2">
                              {category.isLast ? (
                                <button className="btn btn-outline-secondary btn-sm" disabled>
                                  Final Level
                                </button>
                              ) : (
                                <Link 
                                  href={`/categories/${category.id}`}
                                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                                >
                                  View Subcategories
                                </Link>
                              )}
                            </div>
                          </td>

                          {/* Is Last Toggle */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge ${category.isLast ? 'bg-success' : 'bg-secondary'}`}>
                                {category.isLast ? 'Yes' : 'No'}
                              </span>
                              <div 
                                className="form-check form-switch cursor-pointer"
                                onClick={() => toggleIsLast(category)}
                              >
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={category.isLast}
                                  onChange={() => {}}
                                  style={{ width: '2.5rem', height: '1.25rem' }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 3-Dot Menu */}
                          <td className="pe-4 text-center">
                            <div className="dropdown-container position-relative">
                              <button
                                className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                                type="button"
                                onClick={(e) => toggleDropdown(category.id, e)}
                                style={{ width: '32px', height: '32px' }}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              
                              {activeDropdown === category.id && (
                                <div 
                                  className="dropdown-menu show position-absolute end-0 mt-1"
                                  style={{ 
                                    zIndex: 1000,
                                    minWidth: '180px'
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link 
                                    href={`/categories/edit/${category.id}`}
                                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                                    onClick={() => setActiveDropdown(null)}
                                  >
                                    <Edit size={16} className="text-success" />
                                    <span>Edit</span>
                                  </Link>

                                  {!category.isLast && (
                                    <Link 
                                      href={`/categories/${category.id}`}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2"
                                      onClick={() => setActiveDropdown(null)}
                                    >
                                      <span>View Subcategories</span>
                                    </Link>
                                  )}

                                  <hr className="my-1" />
                                  
                                  <button
                                    className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      handleDelete(category);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
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
        </div>
      </div>
    </div>
  );
}