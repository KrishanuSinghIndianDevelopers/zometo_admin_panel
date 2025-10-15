'use client';

import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import BootstrapClient from '../../components/BootstrapClient';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Eye,
  ArrowLeft,
  MoreHorizontal,
  Carrot,
  Beef,
  Package,
  EyeOff,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const foodTypes = [
    { value: 'veg', label: 'Vegetarian', color: 'success', icon: Carrot },
    { value: 'non-veg', label: 'Non-Vegetarian', color: 'danger', icon: Beef }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Fetch all categories first
      const q = query(collection(db, 'categories'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setCategories(fetchedData);
      
      // Filter only main categories for display
      const mainCats = fetchedData.filter(cat => cat.isMainCategory);
      setMainCategories(mainCats);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  // Count subcategories for each main category
  const getSubcategoryCount = (categoryId) => {
    return categories.filter(cat => cat.parentCategory === categoryId).length;
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeleteLoading(true);
    try {
      // Check if main category has subcategories
      const hasSubcategories = getSubcategoryCount(categoryToDelete.id) > 0;
      if (hasSubcategories) {
        alert('Cannot delete main category with existing subcategories. Please delete subcategories first.');
        setShowDeleteDialog(false);
        setCategoryToDelete(null);
        return;
      }

      await deleteDoc(doc(db, 'categories', categoryToDelete.id));
      alert('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Delete failed! Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  const getFoodTypeBadge = (category) => {
    const typeConfig = foodTypes.find(t => t.value === category.foodType) || foodTypes[0];
    const Icon = typeConfig.icon;
    
    return (
      <span className={`badge bg-${typeConfig.color} bg-opacity-10 text-${typeConfig.color} border border-${typeConfig.color} border-opacity-25 d-flex align-items-center gap-1`}>
        <Icon size={12} />
        {typeConfig.label}
      </span>
    );
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <BootstrapClient />
      
      <div className="flex-grow-1 bg-light">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-3">
              <Link
                href="/products"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Products
              </Link>
              <div>
                <h2 className="fw-bold text-dark mb-1">Main Categories Management</h2>
                <p className="text-muted mb-0">Manage your main food categories</p>
              </div>
            </div>
            
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 me-3">
                <Package size={16} className="me-1" />
                {mainCategories.length} Main Categories
              </div>
              <Link
                href="/categories/create"
                className="btn btn-primary d-flex align-items-center gap-2"
              >
                <PlusCircle size={18} />
                Add Main Category
              </Link>
            </div>
          </div>
        </div>

        {/* Categories Table */}
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
                      <th className="py-3 fw-semibold text-dark">Subcategories</th>
                      <th className="py-3 fw-semibold text-dark">Is Last</th>
                      <th className="py-3 fw-semibold text-dark">View Subcategories</th>
                      <th className="pe-4 py-3 fw-semibold text-dark text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <p className="mt-3 text-muted">Loading categories...</p>
                        </td>
                      </tr>
                    ) : mainCategories.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <div className="text-muted">
                            <Package size={48} className="mb-3 opacity-50" />
                            <h5 className="fw-semibold">No main categories found</h5>
                            <p className="mb-4">Get started by creating your first main category</p>
                            <Link
                              href="/categories/create"
                              className="btn btn-primary"
                            >
                              <PlusCircle size={18} className="me-2" />
                              Create First Main Category
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      mainCategories.map((category) => {
                        const subcategoryCount = getSubcategoryCount(category.id);
                        const canViewSubcategories = !category.isLast && subcategoryCount > 0;
                        
                        return (
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
                              <div>
                                <h6 className="fw-semibold mb-1 text-dark">{category.name}</h6>
                                {category.isLast && (
                                  <span className="text-xs text-danger ml-2">(Final Level)</span>
                                )}
                              </div>
                            </td>

                            {/* Food Type */}
                            <td>
                              {getFoodTypeBadge(category)}
                            </td>

                            {/* Subcategories Count */}
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <FolderOpen size={16} className="text-primary" />
                                <span className="fw-semibold text-dark">{subcategoryCount}</span>
                                <small className="text-muted">subcategories</small>
                              </div>
                            </td>

                            {/* Is Last */}
                            <td>
                              {category.isLast ? (
                                <span className="badge bg-success">Yes</span>
                              ) : (
                                <span className="badge bg-secondary">No</span>
                              )}
                            </td>

                            {/* View Subcategories */}
                            <td>
                              {canViewSubcategories ? (
                                <Link 
                                  href={`/categories/${category.id}`}
                                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                                >
                                  <Eye size={14} />
                                  View Subcategories
                                </Link>
                              ) : category.isLast ? (
                                <span className="text-muted small d-flex align-items-center gap-2">
                                  <EyeOff size={14} />
                                  Final Level
                                </span>
                              ) : (
                                <Link 
                                  href={`/categories/create?parentId=${category.id}`}
                                  className="btn btn-outline-success btn-sm d-flex align-items-center gap-2"
                                >
                                  <PlusCircle size={14} />
                                  Add Subcategory
                                </Link>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="pe-4 text-center">
                              <div className="dropdown">
                                <button
                                  className="btn btn-sm btn-outline-secondary border-0 dropdown-toggle"
                                  type="button"
                                  id={`dropdownMenuButton-${category.id}`}
                                  data-bs-toggle="dropdown"
                                  aria-expanded="false"
                                  data-bs-auto-close="true"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                                <ul 
                                  className="dropdown-menu dropdown-menu-end"
                                  aria-labelledby={`dropdownMenuButton-${category.id}`}
                                >
                                  <li>
                                    <Link 
                                      href={`/categories/edit/${category.id}`}
                                      className="dropdown-item d-flex align-items-center gap-2"
                                    >
                                      <Edit size={14} className="text-success" />
                                      Edit
                                    </Link>
                                  </li>

                                  {canViewSubcategories && (
                                    <li>
                                      <Link 
                                        href={`/categories/${category.id}`}
                                        className="dropdown-item d-flex align-items-center gap-2"
                                      >
                                        <Eye size={14} className="text-primary" />
                                        View Subcategories
                                      </Link>
                                    </li>
                                  )}

                                  {!category.isLast && subcategoryCount === 0 && (
                                    <li>
                                      <Link 
                                        href={`/categories/create?parentId=${category.id}`}
                                        className="dropdown-item d-flex align-items-center gap-2"
                                      >
                                        <PlusCircle size={14} className="text-info" />
                                        Add Subcategory
                                      </Link>
                                    </li>
                                  )}

                                  <li><hr className="dropdown-divider" /></li>
                                  
                                  <li>
                                    <button
                                      className="dropdown-item d-flex align-items-center gap-2 text-danger"
                                      onClick={() => handleDeleteClick(category)}
                                      disabled={subcategoryCount > 0}
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                      {subcategoryCount > 0 && (
                                        <small className="text-muted ms-1">
                                          ({subcategoryCount} subcategories)
                                        </small>
                                      )}
                                    </button>
                                  </li>
                                </ul>
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

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelDelete}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete the category <strong>"{categoryToDelete?.name}"</strong>?
                  This action cannot be undone.
                </p>
                {getSubcategoryCount(categoryToDelete?.id) > 0 && (
                  <div className="alert alert-warning mt-3">
                    <strong>Warning:</strong> This category has {getSubcategoryCount(categoryToDelete?.id)} subcategories. 
                    You must delete all subcategories first.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleCancelDelete}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading || getSubcategoryCount(categoryToDelete?.id) > 0}
                >
                  {deleteLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}