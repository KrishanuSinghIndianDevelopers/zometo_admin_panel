'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar'; 
import { Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function CreateCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendorData, setVendorData] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', 
    foodType: 'veg',
    isLast: false 
  });
  const [priority, setPriority] = useState('5');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');

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

  const showFoodTypeField = !parentId;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
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
    setFormData({ name: '', foodType: 'veg', isLast: false });
    setPriority('5');
    setImageFile(null);
    setImagePreview(null);
    setError('');
    const fileInput = document.getElementById('imageFile');
    if (fileInput) fileInput.value = '';
  };

  // ✅ NEW: Client-side image upload function (same as edit page)
  const uploadImageToFirebase = async (file) => {
    if (!file) return '';
    
    try {
      // Import Firebase Storage dynamically
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage();
      
      const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`);
      console.log('📤 Uploading image to Firebase...', file.name, file.type);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      return downloadURL;
      
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw new Error('Failed to upload image: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name) {
      setError('Please enter category name');
      return;
    }

    setSubmitting(true);
    
    try {
      let imageUrl = '';

      // ✅ NEW: Upload image client-side before calling server action
      if (imageFile) {
        try {
          console.log('🖼️ Starting image upload...', imageFile.name);
          imageUrl = await uploadImageToFirebase(imageFile);
          console.log('✅ Image upload completed:', imageUrl);
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          // Don't stop the process if image upload fails
          setError('Category will be created without image: ' + uploadError.message);
          // Continue with category creation
        }
      }

      const formDataToSend = new FormData();
      
      // Add text data
      formDataToSend.append('name', formData.name);
      formDataToSend.append('foodType', formData.foodType);
      formDataToSend.append('isLast', formData.isLast.toString());
      formDataToSend.append('priority', priority);
      formDataToSend.append('isMainCategory', parentId ? 'false' : 'true');
      formDataToSend.append('imageUrl', imageUrl); // ✅ Add the uploaded image URL
      
      if (parentId) formDataToSend.append('parentId', parentId);
      
      const isMainAdmin = userRole === 'main_admin';
      const isAdmin = userRole === 'admin';
      const isVendor = userRole === 'vendor';
      
      if (isMainAdmin || isAdmin) {
        formDataToSend.append('vendorUid', 'admin');
        formDataToSend.append('vendorAuthUid', 'admin');
        formDataToSend.append('isAdminCategory', 'true');
        formDataToSend.append('status', 'approved');
      } else {
        const vendorDocumentId = vendorData?.documentId;
        if (!vendorDocumentId) {
          setError('Vendor information missing.');
          setSubmitting(false);
          return;
        }
        formDataToSend.append('vendorUid', vendorDocumentId);
        formDataToSend.append('vendorAuthUid', vendorData?.uid);
        formDataToSend.append('isAdminCategory', 'false');
        formDataToSend.append('status', 'pending');
      }
      
      formDataToSend.append('currentUser', JSON.stringify(vendorData));
      formDataToSend.append('userRole', userRole);

      console.log('🔄 Calling server action with image URL:', imageUrl);

      // Call server action
      const { createCategory } = await import('../../actions/categoryActionServer');
      const result = await createCategory(formDataToSend);
      
      if (result.success) {
        const successMessage = isMainAdmin || isAdmin 
          ? 'Category created successfully!' + (imageUrl ? ' With image.' : '')
          : 'Category submitted for approval!' + (imageUrl ? ' With image.' : '');
        
        alert(successMessage);
        
        // Redirect after success
        setTimeout(() => {
          if (parentId) {
            router.push(`/categories/${parentId}`);
          } else {
            router.push('/categories');
          }
        }, 1000);
        
      } else {
        setError(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Submission error:', error);
      
      // More specific error messages
      if (error.message.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
        setError('Network connection lost. Please check your internet connection and try again.');
      } else {
        setError(error.message || 'Failed to create category. Please try again.');
      }
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

  const isMainAdmin = userRole === 'main_admin';
  const isAdmin = userRole === 'admin';
  const isVendor = userRole === 'vendor';

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-md-3 col-lg-2 p-0" style={{ backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6', minHeight: '100vh' }}>
          <Sidebar />
        </div> 
        
        <div className="col-md-9 col-lg-10 p-4" style={{ backgroundColor: '#f8fbfd' }}>
          {/* Header Card */}
          <div className="card border-0 shadow-sm mb-4" style={{ 
            backgroundColor: isMainAdmin ? '#d1ecf1' : isAdmin ? '#fff3cd' : '#e3f2fd', 
            borderLeft: `4px solid ${isMainAdmin ? '#0dcaf0' : isAdmin ? '#ffc107' : '#2196F3'}` 
          }}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1 className="h3 fw-bold text-dark mb-1">
                    {parentId ? 'Create Subcategory' : 'Create Main Category'}
                    {isMainAdmin && ' (Main Admin)'}
                    {isAdmin && ' (Admin)'}
                  </h1>
                  <p className="text-muted mb-0">
                    {parentId ? 'Add a new subcategory' : 
                     isMainAdmin ? 'Create global category (Auto-approved)' :
                     isAdmin ? 'Create admin category (Auto-approved)' :
                     'Add category (Requires admin approval)'}
                  </p>
                </div>
                <button 
                  onClick={() => router.back()} 
                  className="btn btn-outline-secondary"
                  disabled={submitting}
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>

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

          {/* Approval Notice for Vendors */}
          {isVendor && !error && (
            <div className="alert alert-warning border-0 shadow-sm mb-4">
              <div className="d-flex align-items-center">
                <Clock size={20} className="me-2" />
                <div>
                  <h6 className="fw-bold mb-1">Approval Required</h6>
                  <p className="mb-0">
                    Your category will be submitted for admin approval and will be visible only after it's approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Form Card */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {!canCreateCategory() ? (
                <div className="alert alert-danger">
                  <AlertCircle size={20} className="me-2" />
                  <h5 className="d-inline">Cannot Create Category</h5>
                  <p className="mt-2">You don't have permission to create categories.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-lg-6">
                      {/* Category Name */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-dark">Category Name *</label>
                        <input 
                          type="text" 
                          className="form-control form-control-lg"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Enter category name"
                          required 
                          disabled={submitting}
                        />
                      </div>

                      {/* Priority */}
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-4">
                            <label className="form-label fw-semibold text-dark">Priority</label>
                            <input
                              type="number"
                              className="form-control form-control-lg"
                              value={priority}
                              onChange={(e) => setPriority(e.target.value)}
                              min="1"
                              max="1000"
                              placeholder="1-1000"
                              disabled={submitting}
                            />
                            <div className="form-text text-muted">Higher priority shows first</div>
                          </div>
                        </div>
                      </div>

                      {/* Food Type - Only for Main Categories */}
                      {showFoodTypeField && (
                        <div className="mb-4">
                          <label className="form-label fw-semibold text-dark">Food Type *</label>
                          <select 
                            className="form-select form-select-lg"
                            value={formData.foodType}
                            onChange={(e) => setFormData({...formData, foodType: e.target.value})}
                            required
                            disabled={submitting}
                          >
                            <option value="veg">🥕 Vegetarian</option>
                            <option value="non-veg">🍗 Non-Vegetarian</option>
                          </select>
                          <div className="form-text text-muted">
                            Select food type for this main category
                          </div>
                        </div>
                      )}

                      {/* Subcategory Option */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-dark">Can have subcategories?</label>
                        <select 
                          className="form-select form-select-lg"
                          value={formData.isLast ? 'no' : 'yes'}
                          onChange={(e) => setFormData({...formData, isLast: e.target.value === 'no'})}
                          disabled={submitting}
                        >
                          <option value="yes">✅ Yes - Can have subcategories</option>
                          <option value="no">❌ No - Final category</option>
                        </select>
                        <div className="form-text text-muted">
                          {formData.isLast 
                            ? 'This category cannot have subcategories' 
                            : 'This category can have nested subcategories'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Image Upload Section */}
                    <div className="col-lg-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold text-dark">Category Image</label>
                        <input 
                          id="imageFile"
                          type="file" 
                          className="form-control form-control-lg"
                          onChange={handleImageChange}
                          accept="image/*"
                          disabled={submitting}
                        />
                        <div className="form-text text-muted">
                          Upload a square image for best results (Max: 10MB)
                          {submitting && <span className="text-warning"> - Upload in progress...</span>}
                        </div>
                      </div>

                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="mb-4 p-3 border rounded">
                          <label className="form-label fw-semibold text-dark">Image Preview</label>
                          <div className="text-center">
                            <img 
                              src={imagePreview} 
                              alt="Preview" 
                              className="img-fluid rounded shadow-sm" 
                              style={{ maxHeight: '200px', objectFit: 'cover' }} 
                            />
                            <div className="mt-2">
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => { 
                                  setImageFile(null); 
                                  setImagePreview(null); 
                                  document.getElementById('imageFile').value = ''; 
                                }}
                                disabled={submitting}
                              >
                                Remove Image
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Summary */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className={`alert ${isMainAdmin ? 'alert-info' : isAdmin ? 'alert-warning' : 'alert-secondary'} border-0`}>
                        <div className="d-flex align-items-center">
                          {isMainAdmin || isAdmin ? (
                            <CheckCircle size={20} className="me-2" />
                          ) : (
                            <Clock size={20} className="me-2" />
                          )}
                          <div>
                            <strong>Status: </strong>
                            {isMainAdmin && 'Main Admin Category - Auto Approved'}
                            {isAdmin && 'Admin Category - Auto Approved'}
                            {isVendor && 'Vendor Category - Pending Admin Approval'}
                            {submitting && <span className="ms-2 text-warning">(Processing...)</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="d-flex gap-3 flex-wrap">
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-lg px-4 d-flex align-items-center gap-2"
                          disabled={submitting || !formData.name}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm"></span>
                              {imageFile ? 'Uploading...' : 'Creating...'}
                            </>
                          ) : (
                            <>
                              {isVendor ? <Clock size={18} /> : <CheckCircle size={18} />}
                              {parentId ? 'Create Subcategory' : 'Create Category'}
                              {isVendor && ' (Submit for Approval)'}
                            </>
                          )}
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-lg px-4"
                          onClick={clearForm} 
                          disabled={submitting}
                        >
                          Clear Form
                        </button>
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