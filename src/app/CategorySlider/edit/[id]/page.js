'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '../../../../firebase/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDoc, updateDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import Sidebar from '../../../../components/Sidebar';
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react';

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

  useEffect(() => {
    if (sliderId) {
      fetchMainCategories();
    }
  }, [sliderId]);

  useEffect(() => {
    if (categories.length > 0 && sliderId) {
      fetchSliderData();
    }
  }, [categories, sliderId]);

  const fetchSliderData = async () => {
    try {
      setFetchLoading(true);
      const docRef = doc(db, 'categorySlider', sliderId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const sliderData = docSnap.data();
        
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

  const fetchMainCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), where('isMainCategory', '==', true));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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
        name,
        categoryId: selectedCategory,
        categoryName: selectedCat?.name || '',
        imageUrl,
        priority: parseInt(priority) || 5,
        status,
        updatedAt: Timestamp.now(),
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

  if (fetchLoading) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <div style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #dee2e6' }}>
          <Sidebar />
        </div>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading slider data...</p>
          </div>
        </div>
      </div>
    );
  }

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
                          />
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
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
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
                               style={{ backgroundColor: '#f8f9fa' }}>
                            <input
                              type="file"
                              accept="image/*"
                              className="d-none"
                              id="imageUpload"
                              onChange={handleImageChange}
                            />
                            <label htmlFor="imageUpload" className="cursor-pointer d-block">
                              <div className="py-3">
                                <ImageIcon size={32} className="text-muted mb-2" />
                                <h6 className="fw-semibold text-dark mb-1">Click to upload new image</h6>
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
                              Image Preview
                            </label>
                            <div className="border rounded-3 p-3 text-center"
                                 style={{ backgroundColor: '#f8f9fa' }}>
                              <img
                                src={preview}
                                alt="Preview"
                                className="img-fluid rounded shadow-sm"
                                style={{ 
                                  maxHeight: '200px', 
                                  objectFit: 'cover'
                                }}
                              />
                              <div className="mt-2">
                                <small className="text-muted">Current Image Preview</small>
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
                              <span className="fw-medium">{image ? 'New selected' : 'Current image'}</span>
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
                              <span className={`badge bg-${status === 'active' ? 'success' : 'secondary'} bg-opacity-10 text-${status === 'active' ? 'success' : 'secondary'}`}>
                                {status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Ready:</span>
                              <span className="badge bg-success bg-opacity-10 text-success">
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
                        className="btn btn-outline-secondary px-4 py-2"
                        onClick={resetForm}
                        disabled={loading}
                      >
                        Reset Changes
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                        disabled={loading}
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