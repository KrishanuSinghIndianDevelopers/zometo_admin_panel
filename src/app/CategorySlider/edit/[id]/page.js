'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '../../../../firebase/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDoc, updateDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import Sidebar from '../../../../components/Sidebar';
import { ArrowLeft, Save, Image as ImageIcon, Shield, AlertCircle } from 'lucide-react';

export default function EditCategorySlider() {
  const router = useRouter();
  const params = useParams();
  const sliderId = params.id;

  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priority, setPriority] = useState('5');
  const [status, setStatus] = useState('active');
  const [user, setUser] = useState(null);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, [sliderId]);

  const checkAuthAndFetchData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      const userObj = JSON.parse(userData);
      setUser(userObj);
      await fetchMainCategories(userObj);
    } catch (error) {
      console.error('Authentication error:', error);
      router.push('/login');
    }
  };

  useEffect(() => {
    if (categories.length > 0 && sliderId && user) {
      fetchSliderData();
    }
  }, [categories, sliderId, user]);

  const fetchSliderData = async () => {
    try {
      setFetchLoading(true);
      const docRef = doc(db, 'categorySlider', sliderId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const sliderData = docSnap.data();
        
        // Enhanced permission check
        const vendorUid = user.documentId || user.uid;
        const sliderVendorId = sliderData.vendorId || sliderData.vendorUid || sliderData.vendorDocumentId;
        
        const isAdmin = user.role === 'admin' || user.role === 'main_admin';
        const isOwner = sliderVendorId === vendorUid;
        
        if (!isAdmin && !isOwner) {
          setPermissionError(true);
          return;
        }
        
        setName(sliderData.name || '');
        setSelectedCategory(sliderData.categoryId || '');
        setPriority(sliderData.priority?.toString() || '5');
        setStatus(sliderData.status || 'active');
        
        if (sliderData.imageUrl) {
          setPreview(sliderData.imageUrl);
        }
      } else {
        alert('Category slider not found!');
        router.push('/CategorySlider');
      }
    } catch (error) {
      console.error('Error fetching slider:', error);
      alert('Failed to fetch slider data!');
      router.push('/CategorySlider');
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchMainCategories = async (userObj) => {
    try {
      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      const vendorUid = userObj.documentId || userObj.uid;

      let categoriesQuery;
      
      if (isAdminUser) {
        categoriesQuery = query(
          collection(db, 'categories'),
          where('isMainCategory', '==', true)
        );
      } else {
        categoriesQuery = query(
          collection(db, 'categories'),
          where('isMainCategory', '==', true),
          where('vendorId', '==', vendorUid)
        );
      }

      const querySnapshot = await getDocs(categoriesQuery);
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Failed to fetch categories');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // File size validation (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      
      // File type validation
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, WEBP)');
        return;
      }
      
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !selectedCategory) {
      return alert('Please fill all required fields.');
    }

    setLoading(true);

    try {
      const vendorUid = user.documentId || user.uid;

      let imageUrl = preview;

      // Upload new image if changed
      if (image) {
        const storage = getStorage();
        const imageRef = ref(storage, `categorySlider/${Date.now()}-${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const selectedCat = categories.find(cat => cat.id === selectedCategory);

      const sliderData = {
        name: name.trim(),
        categoryId: selectedCategory,
        categoryName: selectedCat?.name || '',
        imageUrl,
        priority: parseInt(priority) || 5,
        status,
        updatedAt: Timestamp.now(),
        // Ensure vendor reference
        vendorId: vendorUid,
        vendorUid: vendorUid,
        vendorDocumentId: vendorUid
      };

      const sliderRef = doc(db, 'categorySlider', sliderId);
      await updateDoc(sliderRef, sliderData);
      
      alert('Category slider updated successfully!');
      router.push('/CategorySlider');
    } catch (error) {
      console.error('Error updating category slider:', error);
      alert('Failed to update category slider!');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    fetchSliderData();
    setImage(null);
  };

  // Permission Error Component
  if (permissionError) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <div style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #dee2e6' }}>
          <Sidebar />
        </div>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="alert alert-danger border-0 shadow-sm p-4 rounded-4">
              <AlertCircle size={48} className="text-danger mb-3" />
              <h4 className="fw-bold text-dark mb-3">Access Denied</h4>
              <p className="text-muted mb-4">
                You don't have permission to edit this slider. <br />
                You can only edit sliders that belong to your restaurant.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => router.push('/CategorySlider')}
              >
                Back to Category Sliders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <div style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #dee2e6' }}>
          <Sidebar />
        </div>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading slider data...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdminUser = user?.role === 'admin' || user?.role === 'main_admin';

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #dee2e6' }}>
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
                onClick={() => router.push('/CategorySlider')}
              >
                <ArrowLeft size={16} />
                Back to Category Sliders
              </button>
              <h2 className="fw-bold text-dark mb-1">Edit Category Slider</h2>
              <p className="text-muted mb-0">Update category slider information</p>
              {isAdminUser && (
                <small className="text-info d-flex align-items-center gap-1 mt-1">
                  <Shield size={14} />
                  Admin Mode: Editing all vendors' sliders
                </small>
              )}
            </div>
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <ImageIcon size={16} className="me-1" />
                Edit Slider
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
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      {/* Left Column - Form Fields */}
                      <div className="col-md-6">
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Slider Title *
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter slider title"
                            required
                            maxLength={100}
                          />
                          <div className="form-text text-end">
                            {name.length}/100 characters
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Select Category *
                          </label>
                          <select
                            className="form-select form-select-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            required
                          >
                            <option value="">Choose a category</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                                {!isAdminUser && (
                                  <span className="text-muted"></span>
                                )}
                              </option>
                            ))}
                          </select>
                          {categories.length === 0 && (
                            <div className="alert alert-warning mt-2">
                              No categories found. Please create categories first.
                            </div>
                          )}
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
                          <div className="col-md-6">
                            <div className="mb-4">
                              <label className="form-label fw-semibold text-dark mb-2">
                                Status
                              </label>
                              <select
                                className="form-select form-select-lg border-0 shadow-sm"
                                style={{ backgroundColor: '#f8f9fa' }}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
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
                                 borderColor: image ? '#0d6efd' : '#dee2e6'
                               }}>
                            <input
                              type="file"
                              accept="image/jpeg, image/jpg, image/png, image/webp"
                              className="d-none"
                              id="imageUpload"
                              onChange={handleImageChange}
                            />
                            <label htmlFor="imageUpload" className="cursor-pointer d-block">
                              <div className="py-3">
                                <ImageIcon 
                                  size={32} 
                                  className={`mb-2 ${image ? 'text-primary' : 'text-muted'}`} 
                                />
                                <h6 className={`fw-semibold mb-1 ${image ? 'text-primary' : 'text-dark'}`}>
                                  {image ? 'New Image Selected' : 'Click to upload new image'}
                                </h6>
                                <p className="text-muted mb-0 small">
                                  PNG, JPG, WEBP up to 5MB
                                </p>
                                <small className="text-info">Leave empty to keep current image</small>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Image Preview */}
                        {preview && (
                          <div className="mb-4">
                            <label className="form-label fw-semibold text-dark mb-2">
                              {image ? 'New Image Preview' : 'Current Image'}
                            </label>
                            <div className="border rounded-3 p-3 text-center"
                                 style={{ backgroundColor: '#f8f9fa' }}>
                              <img
                                src={preview}
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
                                <small className={`badge ${image ? 'bg-primary' : 'bg-secondary'}`}>
                                  {image ? 'New Image' : 'Current Image'}
                                </small>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form Summary */}
                    <div className="mt-4 p-4 rounded-4 border" style={{ backgroundColor: '#f8f9fa' }}>
                      <h6 className="fw-semibold text-dark mb-3">Slider Summary</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="small">
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Title:</span>
                              <span className="fw-medium">{name || 'Not set'}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Category:</span>
                              <span className="fw-medium">
                                {categories.find(cat => cat.id === selectedCategory)?.name || 'Not selected'}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Image:</span>
                              <span className={`badge ${image ? 'bg-primary' : 'bg-success'}`}>
                                {image ? 'New selected' : 'Current image'}
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
                              <span className="text-muted">Status:</span>
                              <span className={`badge bg-${status === 'active' ? 'success' : 'secondary'}`}>
                                {status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Ready to Update:</span>
                              <span className={`badge bg-${name && selectedCategory ? 'success' : 'warning'}`}>
                                {name && selectedCategory ? 'Yes' : 'No'}
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
                        onClick={resetForm}
                        disabled={loading}
                      >
                        <ArrowLeft size={16} />
                        Reset Changes
                      </button>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary px-4 py-2"
                          onClick={() => router.push('/CategorySlider')}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                          disabled={loading || !name || !selectedCategory}
                        >
                          {loading ? (
                            <>
                              <div className="spinner-border spinner-border-sm" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              Updating Slider...
                            </>
                          ) : (
                            <>
                              <Save size={18} />
                              Update Category Slider
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