'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import Sidebar from '../../../components/Sidebar';
import { ArrowLeft, Save, Image as ImageIcon, Package, PlusCircle } from 'lucide-react';

export default function CreateCategorySlider() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priority, setPriority] = useState('5');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    fetchMainCategories();
  }, []);

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
    if (!name || !selectedCategory || !image) {
      return alert('Please fill all required fields and upload an image.');
    }

    setLoading(true);

    try {
      const storage = getStorage();
      const imageRef = ref(storage, `categorySlider/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      const selectedCat = categories.find(cat => cat.id === selectedCategory);

      const categorySliderData = {
        name,
        categoryId: selectedCategory,
        categoryName: selectedCat?.name || '',
        imageUrl,
        priority: parseInt(priority) || 5,
        status,
        timestamp: Timestamp.now(),
      };

      await addDoc(collection(db, 'categorySlider'), categorySliderData);
      
      alert('Category slider created successfully!');
      resetForm();
      router.push('/CategorySlider');
    } catch (error) {
      console.error('Error creating category slider:', error);
      alert('Failed to create category slider!');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedCategory('');
    setImage(null);
    setPreview('');
    setPriority('5');
    setStatus('active');
  };

return (
  <div className="d-flex" style={{ minHeight: '100vh' }}>
    <div className="d-flex" style={{ minHeight: '100vh' }}>
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
            <h2 className="fw-bold text-dark mb-1">Create Category Slider</h2>
            <p className="text-muted mb-0">Add a new category slider banner</p>
          </div>
          <div className="text-end">
            <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
              <ImageIcon size={16} className="me-1" />
              Category Slider
            </div>
          </div>
        </div>
      </div>

      {/* Form Content - Single Row Layout */}
      <div className="p-4">
        <div className="row">
          {/* Main Form Card */}
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-lg rounded-4 h-100">
              <div className="card-body p-4 p-md-5">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Form Fields - Full Width in Single Column */}
                    <div className="col-12">
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
                              max="100"
                              placeholder="1-100"
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

                      {/* Image Upload Section */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-dark mb-2">
                          Upload Image *
                        </label>
                        <div className="border-2 border-dashed rounded-3 p-4 text-center"
                             style={{ backgroundColor: '#f8f9fa' }}>
                          <input
                            type="file"
                            accept="image/*"
                            className="d-none"
                            id="imageUpload"
                            onChange={handleImageChange}
                            required
                          />
                          <label htmlFor="imageUpload" className="cursor-pointer d-block">
                            <div className="py-3">
                              <ImageIcon size={25} className="text-muted mb-2" />
                              <h6 className="fw-semibold text-dark mb-1">Click to upload image</h6>
                              <p className="text-muted mb-0 small">
                                PNG, JPG, WEBP up to 5MB
                              </p>
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
                              <small className="text-muted">Preview</small>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex justify-content-between align-items-center mt-4 pt-4 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4 py-2"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Reset Form
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
                          Creating Slider...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Create Category Slider
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Summary Card - Side by Side */}
          <div className="col-12 col-lg-4 mt-3 mt-lg-0">
            <div className="card border-0 shadow-lg rounded-4 h-100">
              <div className="card-body p-4">
                <h6 className="fw-semibold text-dark mb-3">Slider Summary</h6>
                <div className="small">
                  <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                    <span className="text-muted">Title:</span>
                    <span className="fw-medium text-end">{name || 'Not set'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                    <span className="text-muted">Category:</span>
                    <span className="fw-medium text-end">
                      {categories.find(cat => cat.id === selectedCategory)?.name || 'Not selected'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                    <span className="text-muted">Image:</span>
                    <span className="fw-medium text-end">{image ? 'Selected' : 'Not selected'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                    <span className="text-muted">Priority:</span>
                    <span className="fw-medium text-end">{priority}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 pb-2 border-bottom">
                    <span className="text-muted">Status:</span>
                    <span className={`badge bg-${status === 'active' ? 'success' : 'secondary'} bg-opacity-10 text-${status === 'active' ? 'success' : 'secondary'}`}>
                      {status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Ready to Create:</span>
                    <span className={`badge bg-${name && selectedCategory && image ? 'success' : 'warning'} bg-opacity-10 text-${name && selectedCategory && image ? 'success' : 'warning'}`}>
                      {name && selectedCategory && image ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}