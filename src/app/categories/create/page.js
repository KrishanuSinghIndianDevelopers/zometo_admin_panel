"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, storage } from '../../../firebase/firebase';
import { 
  collection, 
  addDoc, 
  Timestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import Sidebar from '../../../components/Sidebar';
import { 
  ArrowLeft,
  X,
  Upload,
  PlusCircle,
  XCircle,
  Carrot,
  Beef
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function CreateCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [mainCategories, setMainCategories] = useState([]);
  const [isClient, setIsClient] = useState(false);
  
  // Safe access to searchParams
  const parentId = isClient && searchParams ? searchParams.get('parentId') : null;
  const isSubCategory = !!parentId;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    foodType: 'veg',
    isLast: false
  });

  const foodTypes = [
    { value: 'veg', label: 'Vegetarian', color: 'success', icon: Carrot },
    { value: 'non-veg', label: 'Non-Vegetarian', color: 'danger', icon: Beef }
  ];

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch main categories for subcategory creation
  useEffect(() => {
    const fetchMainCategories = async () => {
      if (!isClient) return;
      
      try {
        const q = query(
          collection(db, 'categories'), 
          where('isMainCategory', '==', true)
        );
        const querySnapshot = await getDocs(q);
        const categories = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMainCategories(categories);
      } catch (error) {
        console.error('Error fetching main categories:', error);
      }
    };

    fetchMainCategories();
  }, [isClient]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const uploadImage = async (file) => {
    if (!file) return '';
    
    try {
      const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';
      
      // Upload image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Prepare category data
      const categoryData = {
        name: formData.name.trim(),
        foodType: isSubCategory ? '' : formData.foodType, // Only main categories have foodType
        parentCategory: isSubCategory ? parentId : '', // Set parentCategory for subcategories
        isMainCategory: !isSubCategory, // If parentId exists, it's a subcategory
        isLast: formData.isLast,
        imageUrl,
        timestamp: Timestamp.now(),
      };

      // Add to Firestore
      await addDoc(collection(db, 'categories'), categoryData);
      
      alert(`${isSubCategory ? 'Subcategory' : 'Category'} created successfully!`);
      
      // Redirect based on category type
      if (isSubCategory) {
        router.push(`/categories/${parentId}`); // Go back to subcategories page
      } else {
        router.push('/categories'); // Go back to main categories page
      }
      
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking client-side
  if (!isClient) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
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
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <Link
                href={isSubCategory ? `/categories/${parentId}` : "/categories"}
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to {isSubCategory ? 'Subcategories' : 'Categories'}
              </Link>
              <div>
                <h2 className="fw-bold text-dark mb-1">
                  Create {isSubCategory ? 'Subcategory' : 'Category'}
                </h2>
                <p className="text-muted mb-0">
                  {isSubCategory 
                    ? 'Add details for your new subcategory' 
                    : 'Add details for your new category'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-primary bg-opacity-10 border-0 py-4">
                  <h4 className="fw-bold text-dark mb-0">
                    Create {isSubCategory ? 'Subcategory' : 'Category'}
                  </h4>
                  <p className="text-muted mb-0 mt-1">
                    {isSubCategory 
                      ? 'Add details for your new subcategory' 
                      : 'Add details for your new category'
                    }
                  </p>
                </div>
                
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                      {/* Show parent category info for subcategories */}
                      {isSubCategory && mainCategories.length > 0 && (
                        <div className="col-12">
                          <div className="alert alert-info">
                            <strong>Parent Category:</strong>{' '}
                            {mainCategories.find(cat => cat.id === parentId)?.name || 'Unknown'}
                          </div>
                        </div>
                      )}

                      {/* Category Name */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-dark">
                          {isSubCategory ? 'Subcategory Name' : 'Category Name'} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder={`Enter ${isSubCategory ? 'subcategory' : 'category'} name`}
                          required
                        />
                      </div>

                      {/* Food Type (Only for main categories) */}
                      {!isSubCategory && (
                        <div className="col-12">
                          <label className="form-label fw-semibold text-dark">Food Type</label>
                          <select
                            className="form-select form-select-lg"
                            name="foodType"
                            value={formData.foodType}
                            onChange={handleInputChange}
                          >
                            {foodTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Is Last Switch */}
                      <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between p-4 border rounded bg-light">
                          <label className="form-label fw-semibold text-dark mb-0">
                            Is Last Category?
                          </label>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              name="isLast"
                              id="isLast"
                              checked={formData.isLast}
                              onChange={handleInputChange}
                              style={{ width: '3rem', height: '1.5rem' }}
                            />
                            <label className="form-check-label fw-medium ms-2" htmlFor="isLast">
                              {formData.isLast ? 'YES' : 'NO'}
                            </label>
                          </div>
                        </div>
                        <small className="text-muted">
                          If enabled, this category cannot have subcategories
                        </small>
                      </div>

                      {/* Image Upload */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-dark">
                          {isSubCategory ? 'Subcategory Image' : 'Category Image'}
                        </label>
                        
                        {imagePreview ? (
                          <div className="position-relative d-inline-block">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="rounded border"
                              style={{
                                width: '200px',
                                height: '200px',
                                objectFit: 'cover'
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                              onClick={removeImage}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="border rounded p-5 text-center cursor-pointer bg-light"
                            onClick={() => document.getElementById('imageUpload').click()}
                            style={{ cursor: 'pointer' }}
                          >
                            <Upload size={48} className="text-muted mb-3" />
                            <p className="text-muted mb-2 fw-medium">
                              Click to upload {isSubCategory ? 'subcategory' : 'category'} image
                            </p>
                            <input
                              type="file"
                              className="d-none"
                              id="imageUpload"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="row mt-5 pt-4 border-top">
                      <div className="col-12">
                        <div className="d-flex gap-3 justify-content-end">
                          <Link
                            href={isSubCategory ? `/categories/${parentId}` : "/categories"}
                            className="btn btn-outline-secondary btn-lg d-flex align-items-center gap-2"
                          >
                            <XCircle size={18} />
                            Cancel
                          </Link>
                          <button
                            type="submit"
                            className="btn btn-primary btn-lg d-flex align-items-center gap-2"
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
                                <PlusCircle size={18} />
                                Create {isSubCategory ? 'Subcategory' : 'Category'}
                              </>
                            )}
                          </button>
                        </div>
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