'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
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

  const categoryId = params.id;

  useEffect(() => {
    fetchSubCategories();
    fetchParentCategory();
  }, [categoryId]);

  const fetchParentCategory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const parent = categories.find(cat => cat.id === categoryId);
      setParentCategory(parent);
    } catch (error) {
      console.error('Error fetching parent category:', error);
    }
  };

  const fetchSubCategories = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'categories'), 
        where('parentCategory', '==', categoryId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setSubCategories(fetchedData);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIsLast = async (category) => {
    try {
      const docRef = doc(db, 'categories', category.id);
      await updateDoc(docRef, {
        isLast: !category.isLast
      });
      fetchSubCategories(); // Refresh the list
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm('Are you sure you want to delete this subcategory?')) return;

    try {
      await deleteDoc(doc(db, 'categories', category.id));
      alert('Subcategory deleted successfully!');
      fetchSubCategories();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Delete failed! Please try again.');
    }
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      
      <div className="flex-grow-1 bg-light">
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-3">
              <Link
                href="/categories"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Categories
              </Link>
              <div>
                <h2 className="fw-bold text-dark mb-1">Subcategories</h2>
                <p className="text-muted mb-0">
                  {parentCategory ? `Manage subcategories of ${parentCategory.name}` : 'Manage subcategories'}
                </p>
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
                      <th className="py-3 fw-semibold text-dark">Actions</th>
                      <th className="py-3 fw-semibold text-dark">Is Last</th>
                      <th className="pe-4 py-3 fw-semibold text-dark text-center">Menu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <p className="mt-3 text-muted">Loading subcategories...</p>
                        </td>
                      </tr>
                    ) : subCategories.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          <div className="text-muted">
                            <Package size={48} className="mb-3 opacity-50" />
                            <h5 className="fw-semibold">No subcategories found</h5>
                            <p className="mb-4">Get started by creating your first subcategory</p>
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

                          <td>
                            <h6 className="fw-semibold mb-1 text-dark">{category.name}</h6>
                          </td>

                          <td>
                            <div className="d-flex gap-2">
                              {category.isLast ? (
                                <button className="btn btn-outline-secondary btn-sm" disabled>
                                  View Sub Category
                                </button>
                              ) : (
                                <Link 
                                  href={`/categories/${category.id}`}
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  View Sub Category
                                </Link>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="text-sm fw-medium">{category.isLast ? 'Yes' : 'No'}</span>
                              <div 
                                className={`form-check form-switch cursor-pointer`}
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

                          <td className="pe-4 text-center">
                            <div className="dropdown">
                              <button
                                className="btn btn-sm btn-outline-secondary border-0 dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                  <Link 
                                    href={`/categories/edit/${category.id}`}
                                    className="dropdown-item d-flex align-items-center gap-2"
                                  >
                                    <Edit size={14} className="text-success" />
                                    Edit
                                  </Link>
                                </li>
                                <li>
                                  <hr className="dropdown-divider" />
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item d-flex align-items-center gap-2 text-danger"
                                    onClick={() => handleDelete(category)}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </li>
                              </ul>
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