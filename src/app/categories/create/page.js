'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar'; 

export default function CreateCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendorData, setVendorData] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', 
    foodType: 'veg', // ✅ Food Type wapas add kiya
    isLast: false 
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setVendorData(user);
      setUserRole(user.role || 'vendor');
    }

    const urlParentId = searchParams.get('parentId');
    if (urlParentId) setParentId(urlParentId);
  }, [searchParams]);

  // ✅ Food Type field sirf MAIN CATEGORY ke liye show karein
  const showFoodTypeField = !parentId; // parentId nahi hai toh main category hai

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const clearForm = () => {
    setFormData({ name: '', foodType: 'veg', isLast: false });
    setImageFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById('imageFile');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Please enter category name');
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('foodType', formData.foodType); // ✅ Food Type bhejna
      formDataToSend.append('isLast', formData.isLast.toString());
      formDataToSend.append('isMainCategory', parentId ? 'false' : 'true');
      
      if (parentId) formDataToSend.append('parentId', parentId);
      
      const isAdminUser = userRole === 'admin' || userRole === 'main_admin';
      if (isAdminUser) {
        formDataToSend.append('vendorUid', 'admin');
        formDataToSend.append('vendorAuthUid', 'admin');
        formDataToSend.append('isAdminCategory', 'true');
      } else {
        const vendorDocumentId = vendorData?.documentId;
        if (!vendorDocumentId) {
          alert('Vendor information missing.');
          return;
        }
        formDataToSend.append('vendorUid', vendorDocumentId);
        formDataToSend.append('vendorAuthUid', vendorData?.uid);
        formDataToSend.append('isAdminCategory', 'false');
      }
      
      formDataToSend.append('currentUser', JSON.stringify(vendorData));
      formDataToSend.append('userRole', userRole);
      if (imageFile) formDataToSend.append('imageFile', imageFile);

      const { createCategory } = await import('../../actions/categoryActionServer');
      const result = await createCategory(formDataToSend);
      
      if (result.success) {
        alert('Category created successfully!');
        if (parentId) router.push(`/categories/${parentId}`);
        else router.push('/categories');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to create category.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateCategory = () => {
    const isAdminUser = userRole === 'admin' || userRole === 'main_admin';
    if (isAdminUser) return true;
    if (userRole === 'vendor' && vendorData?.documentId) return true;
    return false;
  };

  const isAdminUser = userRole === 'admin' || userRole === 'main_admin';

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-3 col-lg-2 p-0" style={{ backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6', minHeight: '100vh' }}>
          <Sidebar />
        </div> 
        
        <div className="col-md-9 col-lg-10 p-4" style={{ backgroundColor: '#f8fbfd' }}>
          <div className="card border-0 shadow-sm mb-4" style={{ backgroundColor: isAdminUser ? '#fff3cd' : '#e3f2fd', borderLeft: `4px solid ${isAdminUser ? '#ffc107' : '#2196F3'}` }}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="h3 fw-bold text-dark mb-1">
                    {parentId ? 'Create Subcategory' : 'Create Main Category'}
                    {isAdminUser && ' (Admin)'}
                  </h1>
                  <p className="text-muted mb-0">
                    {parentId ? 'Add a new subcategory' : isAdminUser ? 'Add a new global category' : 'Add a new category'}
                  </p>
                </div>
                <button onClick={() => router.back()} className="btn btn-outline-secondary">← Back</button>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {!canCreateCategory() ? (
                <div className="alert alert-danger">
                  <h5>❌ Cannot Create Category</h5>
                  <p>You don't have permission to create categories.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Category Name *</label>
                        <input 
                          type="text" 
                          className="form-control form-control-lg" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Enter category name"
                          required 
                        />
                      </div>

                      {/* ✅ Food Type field - SIRF MAIN CATEGORY ke liye */}
                      {showFoodTypeField && (
                        <div className="mb-4">
                          <label className="form-label fw-semibold">Food Type *</label>
                          <select 
                            className="form-select form-select-lg"
                            value={formData.foodType}
                            onChange={(e) => setFormData({...formData, foodType: e.target.value})}
                            required
                          >
                            <option value="veg">🥕 Vegetarian</option>
                            <option value="non-veg">🍗 Non-Vegetarian</option>
                          </select>
                          <div className="form-text">
                            Select food type for this main category
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Can have subcategories?</label>
                        <select 
                          className="form-select form-select-lg"
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

                    <div className="col-lg-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Category Image</label>
                        <input 
                          id="imageFile"
                          type="file" 
                          className="form-control form-control-lg" 
                          onChange={handleImageChange}
                          accept="image/*"
                        />
                        <div className="form-text">
                          Upload a square image for best results
                        </div>
                      </div>

                      {imagePreview && (
                        <div className="mb-4 p-3 border rounded">
                          <label className="form-label fw-semibold">Image Preview</label>
                          <div className="text-center">
                            <img src={imagePreview} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                            <div className="mt-2">
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setImageFile(null); setImagePreview(null); document.getElementById('imageFile').value = ''; }}>
                                Remove Image
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="d-flex gap-3 flex-wrap">
                        <button type="submit" className="btn btn-primary btn-lg px-4" disabled={submitting || !formData.name}>
                          {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <>{parentId ? '📂 Create Subcategory' : '📁 Create Category'}</>}
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-lg px-4" onClick={clearForm} disabled={submitting}>🗑️ Clear</button>
                      </div>
                    </div>
                  </div>

                  {/* Debug Info */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className={`alert ${isAdminUser ? 'alert-warning' : 'alert-info'}`}>
                        <small>
                          Creating: <strong>{parentId ? 'Subcategory' : 'Main Category'}</strong><br/>
                          {showFoodTypeField && `Food Type: ${formData.foodType}`}
                        </small>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}