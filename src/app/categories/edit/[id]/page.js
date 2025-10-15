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
  where
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
  X,
  Upload,
  PlusCircle,
  XCircle,
  Carrot,
  Beef
} from 'lucide-react';
import Link from 'next/link';

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [mainCategories, setMainCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    foodType: 'veg',
    isMainCategory: true,
    parentCategory: '',
    isLast: false
  });

  const categoryId = params.id;

  const foodTypes = [
    { value: 'veg', label: 'Vegetarian', color: 'success', icon: Carrot },
    { value: 'non-veg', label: 'Non-Vegetarian', color: 'danger', icon: Beef }
  ];

  useEffect(() => {
    fetchCategory();
    fetchMainCategories();
  }, [categoryId]);

  const fetchMainCategories = async () => {
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

  const fetchCategory = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'categories', categoryId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const categoryData = docSnap.data();
        setFormData({
          name: categoryData.name || '',
          foodType: categoryData.foodType || 'veg',
          isMainCategory: categoryData.isMainCategory || true,
          parentCategory: categoryData.parentCategory || '',
          isLast: categoryData.isLast || false
        });
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
      setLoading(false);
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

    // Validate subcategory has parent
    if (!formData.isMainCategory && !formData.parentCategory) {
      alert('Please select a parent category for subcategory');
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
        foodType: formData.isMainCategory ? formData.foodType : '',
        parentCategory: formData.isMainCategory ? '' : formData.parentCategory,
        isMainCategory: formData.isMainCategory,
        isLast: formData.isLast,
        ...(imageUrl && { imageUrl }),
      };

      const docRef = doc(db, 'categories', categoryId);
      await updateDoc(docRef, categoryData);
      
      alert('Category updated successfully!');
      router.push('/categories');
      
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-primary bg-opacity-10 border-0 py-4">
                  <h4 className="fw-bold text-dark mb-0">Update Category</h4>
                  <p className="text-muted mb-0 mt-1">Modify the details of your category</p>
                </div>
                
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                      {/* Category Type */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-dark">Category Type</label>
                        <div className="d-flex gap-4">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="isMainCategory"
                              id="mainCategory"
                              value="true"
                              checked={formData.isMainCategory}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label fw-medium" htmlFor="mainCategory">
                              Main Category
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="isMainCategory"
                              id="subCategory"
                              value="false"
                              checked={!formData.isMainCategory}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label fw-medium" htmlFor="subCategory">
                              Sub Category
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Category Name */}
                      <div className="col-12">
                        <label className="form-label fw-semibold text-dark">
                          Category Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-lg"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Enter category name"
                          required
                        />
                      </div>

                      {/* Food Type (Only for main categories) */}
                      {formData.isMainCategory && (
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

                      {/* Parent Category (Only for subcategories) */}
                      {!formData.isMainCategory && (
                        <div className="col-12">
                          <label className="form-label fw-semibold text-dark">
                            Parent Category <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select form-select-lg"
                            name="parentCategory"
                            value={formData.parentCategory}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="">Select Parent Category</option>
                            {mainCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
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
                        <label className="form-label fw-semibold text-dark">Category Image</label>
                        
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
                          >
                            <Upload size={48} className="text-muted mb-3" />
                            <p className="text-muted mb-2 fw-medium">Click to upload category image</p>
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
                            href="/categories"
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
                                Updating...
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