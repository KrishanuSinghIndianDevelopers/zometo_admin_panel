'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, storage } from '../../../../firebase/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import Sidebar from '../../../../components/Sidebar';
import { 
  ArrowLeft,
  Save,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  Package
} from 'lucide-react';
import Link from 'next/link';

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    foodType: 'veg',
    isLast: false
  });
  const [priority, setPriority] = useState('5');

  const categoryId = params.id;

  useEffect(() => {
    checkAuthAndFetchCategory();
  }, [categoryId]);

  const checkAuthAndFetchCategory = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      const userObj = JSON.parse(userData);
      setUser(userObj);
      await fetchCategory(userObj);
    } catch (error) {
      alert('Authentication error. Please login again.');
      router.push('/login');
    }
  };

  const fetchCategory = async (userObj) => {
    try {
      setFetchLoading(true);
      const docRef = doc(db, 'categories', categoryId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const categoryData = docSnap.data();
        
        // Check permissions
        const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
        const vendorUid = userObj.documentId || userObj.uid;
        const isOwner = categoryData.vendorId === vendorUid;
        
        if (!isAdminUser && !isOwner) {
          setError('You do not have permission to edit this category');
          setFetchLoading(false);
          return;
        }
        
        setFormData({
          name: categoryData.name || '',
          foodType: categoryData.foodType || 'veg',
          isLast: categoryData.isLast || false
        });
        setPriority(categoryData.priority?.toString() || '5');
        
        if (categoryData.imageUrl) {
          setImagePreview(categoryData.imageUrl);
        }
      } else {
        alert('Category not found');
        router.push('/categories');
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      alert('Failed to load category');
    } finally {
      setFetchLoading(false);
    }
  };

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
      // Validate file size (5MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size should be less than 10MB');
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, WEBP)');
        return;
      }
      
      setImageFile(file);
      setError('');
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    setImageFile(null);
    setImagePreview('');
    setError('');
    const fileInput = document.getElementById('imageFile');
    if (fileInput) fileInput.value = '';
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
    setError('');
    
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = imagePreview;
      
      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Prepare category data
      const categoryData = {
        name: formData.name.trim(),
        foodType: formData.foodType,
        priority: parseInt(priority) || 5,
        isLast: formData.isLast,
        imageUrl: imageUrl,
        updatedAt: Timestamp.now(),
      };

      const docRef = doc(db, 'categories', categoryId);
      await updateDoc(docRef, categoryData);
      
      alert('Category updated successfully!');
      router.push('/categories');
      
    } catch (error) {
      console.error('Error updating category:', error);
      setError(error.message || 'Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-muted">Loading category...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdminUser = user?.role === 'admin' || user?.role === 'main_admin';
  const isMainAdmin = user?.role === 'main_admin';

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-grow-1 bg-light">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <Link
                href="/categories"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Categories
              </Link>
              <div>
                <h2 className="fw-bold text-dark mb-1">Update Category</h2>
                <p className="text-muted mb-0">Modify the details of your category</p>
                {isAdminUser && (
                  <small className="text-info d-flex align-items-center gap-1 mt-1">
                    <Shield size={14} />
                    {isMainAdmin ? 'Main Admin Mode' : 'Admin Mode'}: Editing category
                  </small>
                )}
              </div>
            </div>
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <Package size={16} className="me-1" />
                Edit Category
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-8">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body p-4 p-md-5">
                  
                  {/* Error Display */}
                  {error && (
                    <div className="alert alert-danger border-0 shadow-sm mb-4">
                      <div className="d-flex align-items-center">
                        <AlertCircle size={20} className="me-2" />
                        <div>
                          <h6 className="fw-bold mb-1">Error</h6>
                          <p className="mb-0">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      {/* Left Column - Form Fields */}
                      <div className="col-md-6">
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Category Name *
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter category name"
                            required
                            maxLength={100}
                          />
                          <div className="form-text text-end">
                            {formData.name.length}/100 characters
                          </div>
                        </div>

                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-4">
                              <label className="form-label fw-semibold text-dark mb-2">
                                Priority
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-lg border-0 shadow-sm"
                                style={{ backgroundColor: '#f8f9fa' }}
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                min="1"
                                max="1000"
                                placeholder="1-1000"
                              />
                              <div className="form-text">Higher priority shows first</div>
                            </div>
                          </div>
                        </div>

                        {/* Food Type */}
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Food Type *
                          </label>
                          <select
                            className="form-select form-select-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            name="foodType"
                            value={formData.foodType}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="veg">🥕 Vegetarian</option>
                            <option value="non-veg">🍗 Non-Vegetarian</option>
                          </select>
                          <div className="form-text">
                            Select food type for this category
                          </div>
                        </div>

                        {/* Subcategory Option */}
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Can have subcategories?
                          </label>
                          <select
                            className="form-select form-select-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            value={formData.isLast ? 'no' : 'yes'}
                            onChange={(e) => setFormData({...formData, isLast: e.target.value === 'no'})}
                          >
                            <option value="yes">✅ Yes - Can have subcategories</option>
                            <option value="no">❌ No - Final category</option>
                          </select>
                          <div className="form-text">
                            {formData.isLast 
                              ? 'This category cannot have subcategories' 
                              : 'This category can have nested subcategories'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Image Upload & Preview */}
                      <div className="col-md-6">
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Update Image
                          </label>
                          <div className="border border-2 border-dashed rounded-3 p-4 text-center"
                               style={{ 
                                 backgroundColor: '#f8f9fa',
                                 borderColor: imageFile ? '#0d6efd' : '#dee2e6'
                               }}>
                            <input
                              type="file"
                              accept="image/jpeg, image/jpg, image/png, image/webp"
                              className="d-none"
                              id="imageFile"
                              onChange={handleImageChange}
                            />
                            <label htmlFor="imageFile" className="cursor-pointer d-block">
                              <div className="py-3">
                                <Package 
                                  size={32} 
                                  className={`mb-2 ${imageFile ? 'text-primary' : 'text-muted'}`} 
                                />
                                <h6 className={`fw-semibold mb-1 ${imageFile ? 'text-primary' : 'text-dark'}`}>
                                  {imageFile ? 'New Image Selected' : 'Click to upload new image'}
                                </h6>
                                <p className="text-muted mb-0 small">
                                  PNG, JPG, WEBP up to 10MB
                                </p>
                                <small className="text-info">Leave empty to keep current image</small>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Image Preview */}
                        {imagePreview && (
                          <div className="mb-4">
                            <label className="form-label fw-semibold text-dark mb-2">
                              {imageFile ? 'New Image Preview' : 'Current Image'}
                            </label>
                            <div className="border rounded-3 p-3 text-center"
                                 style={{ backgroundColor: '#f8f9fa' }}>
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="img-fluid rounded shadow-sm"
                                style={{ 
                                  maxHeight: '200px', 
                                  objectFit: 'cover',
                                  maxWidth: '100%'
                                }}
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                                }}
                              />
                              <div className="mt-2">
                                <small className={`badge ${imageFile ? 'bg-primary' : 'bg-secondary'}`}>
                                  {imageFile ? 'New Image' : 'Current Image'}
                                </small>
                                {imageFile && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger ms-2"
                                    onClick={clearForm}
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form Summary */}
                    <div className="mt-4 p-4 rounded-4 border" style={{ backgroundColor: '#f8f9fa' }}>
                      <h6 className="fw-semibold text-dark mb-3">Category Summary</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="small">
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Name:</span>
                              <span className="fw-medium">{formData.name || 'Not set'}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Food Type:</span>
                              <span className="fw-medium">
                                {formData.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Image:</span>
                              <span className={`badge ${imageFile ? 'bg-primary' : 'bg-success'}`}>
                                {imageFile ? 'New selected' : 'Current image'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="small">
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Priority:</span>
                              <span className="fw-medium">{priority}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Subcategories:</span>
                              <span className={`badge bg-${formData.isLast ? 'secondary' : 'success'}`}>
                                {formData.isLast ? 'Not Allowed' : 'Allowed'}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Ready to Update:</span>
                              <span className={`badge bg-${formData.name ? 'success' : 'warning'}`}>
                                {formData.name ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-between align-items-center mt-5 pt-4 border-top">
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center gap-2"
                        onClick={clearForm}
                        disabled={loading}
                      >
                        <ArrowLeft size={16} />
                        Reset Changes
                      </button>
                      <div className="d-flex gap-2">
                        <Link
                          href="/categories"
                          className="btn btn-outline-primary px-4 py-2"
                          disabled={loading}
                        >
                          Cancel
                        </Link>
                        <button
                          type="submit"
                          className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                          disabled={loading || !formData.name}
                        >
                          {loading ? (
                            <>
                              <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              Updating Category...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Update Category
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