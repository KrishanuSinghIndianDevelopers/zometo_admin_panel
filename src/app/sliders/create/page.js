'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import Sidebar from '../../../components/Sidebar';
import { ArrowLeft, Save, Image as ImageIcon, Package } from 'lucide-react';

export default function CreateSlider() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [mainCategory, setMainCategory] = useState('all');
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [nestedSubCategories, setNestedSubCategories] = useState([]);

  // Fetch main categories from Firebase
  useEffect(() => {
    fetchMainCategories();
  }, []);

  // Fetch subcategories when main category changes
  useEffect(() => {
    if (mainCategory && mainCategory !== 'all') {
      fetchSubCategories(mainCategory);
    } else {
      setSubCategories([]);
      setNestedSubCategories([]);
    }
  }, [mainCategory]);

  const fetchMainCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), where('isMainCategory', '==', true));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const mainCategoriesList = [
        { value: 'all', label: 'All Categories', id: 'all' }
      ];
      
      categoriesData.forEach(cat => {
        if (cat.id && cat.name) {
          mainCategoriesList.push({
            value: cat.id,
            label: cat.name,
            id: cat.id,
            foodType: cat.foodType
          });
        }
      });
      
      setCategories(mainCategoriesList);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubCategories = async (parentId) => {
    try {
      const q = query(collection(db, 'categories'), where('parentCategory', '==', parentId));
      const querySnapshot = await getDocs(q);
      const subCategoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setSubCategories(subCategoriesData);
      setNestedSubCategories([]);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const fetchNestedSubCategories = async (parentId) => {
    try {
      const q = query(collection(db, 'categories'), where('parentCategory', '==', parentId));
      const querySnapshot = await getDocs(q);
      const nestedSubCategoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setNestedSubCategories(nestedSubCategoriesData);
    } catch (error) {
      console.error('Error fetching nested subcategories:', error);
    }
  };

  const handleSubCategoryChange = (subCatId, subCatName) => {
    setSelectedSubCategories(prev => {
      const exists = prev.find(item => item.id === subCatId);
      if (exists) {
        return prev.filter(item => item.id !== subCatId);
      } else {
        return [...prev, { id: subCatId, name: subCatName }];
      }
    });
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
    if (!title || !subtitle || !image || !mainCategory) {
      return alert('Please fill all required fields and select an image.');
    }

    setLoading(true);

    try {
      const customId = `slider-${Date.now()}`;
      const storage = getStorage();
      const imageRef = ref(storage, `SliderImages/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      // Get main category name
      const selectedMainCategory = categories.find(cat => cat.value === mainCategory);
      
      const sliderData = {
        id: customId,
        title,
        subtitle,
        mainCategory: mainCategory,
        mainCategoryName: selectedMainCategory ? selectedMainCategory.label : 'All Categories',
        subCategories: selectedSubCategories,
        imageUrl,
        timestamp: Timestamp.now(),
        isActive: true
      };

      await setDoc(doc(db, 'imageSliders', customId), sliderData);

      alert('Slider image uploaded successfully!');
      resetForm();
      router.push('/sliders');
    } catch (error) {
      console.error('Error uploading slider image:', error);
      alert('Failed to upload slider image!');
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setMainCategory('all');
    setSelectedSubCategories([]);
    setImage(null);
    setPreview('');
    setSubCategories([]);
    setNestedSubCategories([]);
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#ffffff', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header with Blue Background */}
        <div 
          className="p-4 border-bottom"
          style={{ 
            backgroundColor: '#dbeafe',
            background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)'
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <button
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 mb-2"
                onClick={() => router.push('/sliders')}
              >
                <ArrowLeft size={16} />
                Back to Sliders
              </button>
              <h2 className="fw-bold text-dark mb-1">Create New Slider</h2>
              <p className="text-muted mb-0">Upload a new slider banner with category mapping</p>
            </div>
            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <ImageIcon size={16} className="me-1" />
                Banner Slider
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-4">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
              <div className="card border-0 shadow-lg rounded-4">
                <div className="card-body p-4 p-md-5">
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      {/* Left Column - Text Fields */}
                      <div className="col-md-6">
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter slider title"
                            required
                          />
                        </div>

                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Subtitle *
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="Enter slider subtitle"
                            required
                          />
                        </div>

                        {/* Image Upload */}
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Upload Image *
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            className="form-control form-control-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            onChange={handleImageChange}
                            required
                          />
                          <div className="form-text">
                            Supported formats: JPG, PNG, WebP. Recommended size: 1200×400px
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Categories & Preview */}
                      <div className="col-md-6">
                        {/* Category Selection */}
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Main Category *
                          </label>
                          <select
                            className="form-select form-select-lg border-0 shadow-sm"
                            style={{ backgroundColor: '#f8f9fa' }}
                            value={mainCategory}
                            onChange={(e) => {
                              setMainCategory(e.target.value);
                              setSelectedSubCategories([]);
                            }}
                            required
                          >
                            {categories.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sub Categories */}
                        {mainCategory !== 'all' && subCategories.length > 0 && (
                          <div className="mb-4">
                            <label className="form-label fw-semibold text-dark mb-2">
                              Sub Categories (Optional)
                            </label>
                            <div 
                              className="border rounded-3 p-3" 
                              style={{ 
                                backgroundColor: '#f8f9fa', 
                                maxHeight: '200px', 
                                overflowY: 'auto' 
                              }}
                            >
                              <div className="row g-2">
                                {subCategories.map(subCat => (
                                  <div key={subCat.id} className="col-6">
                                    <div className="form-check">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={selectedSubCategories.some(item => item.id === subCat.id)}
                                        onChange={() => handleSubCategoryChange(subCat.id, subCat.name)}
                                      />
                                      <label className="form-check-label small">{subCat.name}</label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {selectedSubCategories.length > 0 && (
                              <div className="mt-2">
                                <small className="text-muted">
                                  Selected: {selectedSubCategories.map(sc => sc.name).join(', ')}
                                </small>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Image Preview */}
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark mb-2">
                            Image Preview
                          </label>
                          <div 
                            className="border border-2 border-dashed rounded-3 p-4 d-flex align-items-center justify-content-center"
                            style={{ 
                              backgroundColor: '#f8f9fa', 
                              minHeight: '200px',
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #e9ecef 10px, #e9ecef 20px)'
                            }}
                          >
                            {preview ? (
                              <img
                                src={preview}
                                alt="Preview"
                                className="img-fluid rounded shadow-sm"
                                style={{ 
                                  maxHeight: '180px', 
                                  objectFit: 'cover',
                                  width: '100%'
                                }}
                              />
                            ) : (
                              <div className="text-center text-muted">
                                <ImageIcon size={48} className="mb-2 opacity-50" />
                                <p className="mb-1 fw-medium">No image selected</p>
                                <small>Preview will appear here</small>
                              </div>
                            )}
                          </div>
                        </div>
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
                              <span className="fw-medium">{title || 'Not set'}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Subtitle:</span>
                              <span className="fw-medium">{subtitle || 'Not set'}</span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Image:</span>
                              <span className="fw-medium">{image ? 'Selected' : 'Not selected'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="small">
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Main Category:</span>
                              <span className="fw-medium">
                                {categories.find(cat => cat.value === mainCategory)?.label || 'Not selected'}
                              </span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                              <span className="text-muted">Sub Categories:</span>
                              <span className="fw-medium">
                                {selectedSubCategories.length > 0 
                                  ? `${selectedSubCategories.length} selected` 
                                  : mainCategory === 'all' ? 'All categories' : 'All subcategories'
                                }
                              </span>
                            </div>
                            <div className="d-flex justify-content-between">
                              <span className="text-muted">Status:</span>
                              <span className="badge bg-success bg-opacity-10 text-success">
                                Ready to create
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
                            Create Slider
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