'use client';
import Sidebar from '../../../components/Sidebar'; 
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '../../../firebase/firebase';
import { 
  collection, 
  addDoc, 
  Timestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ArrowLeft,
  Send,
  Users,
  Store,
  AlertTriangle,
  Info,
  CheckCircle,
  Megaphone,
  Calendar,
  Upload,
  X,
  Image as ImageIcon,
  MessageCircle
} from 'lucide-react';

export default function CreateNotification() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [vendors, setVendors] = useState([]);
  const fileInputRef = useRef(null);

  // Real form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    targetAudience: 'customers_only', // Default for customers
    imageUrl: '',
    expiryDate: '',
    isActive: true
  });

  const notificationTypes = [
    { value: 'info', label: 'Information', icon: Info, color: 'primary' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'warning' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'success' },
    { value: 'urgent', label: 'Urgent', icon: Megaphone, color: 'danger' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'secondary' },
    { value: 'medium', label: 'Medium', color: 'primary' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'critical', label: 'Critical', color: 'danger' }
  ];

  // Options for admin only
  const audienceOptions = [
    { value: 'customers_only', label: 'Customers Only', icon: Users, description: 'Send to all customers' },
    { value: 'vendors_only', label: 'Vendors Only', icon: Store, description: 'Send to all vendors' }
  ];

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  const checkAuthAndRole = async () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      router.push('/login');
      return;
    }

    try {
      const userObj = JSON.parse(userData);
      console.log('User Object:', userObj);
      
      // Check if user is admin
      if (userObj.role !== 'main_admin' && userObj.role !== 'admin') {
        alert('Only admin can create notifications');
        router.push('/');
        return;
      }
      
      setCurrentUser(userObj);
      await fetchVendors();
      
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/login');
    }
  };

  const fetchVendors = async () => {
    try {
      const q = query(
        collection(db, 'vendors'),
        where('status', 'in', ['Active', 'active', 'approved'])
      );
      const querySnapshot = await getDocs(q);
      const vendorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorsData);
      console.log('Real vendors loaded:', vendorsData.length);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Real file validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);

    // Create real preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToFirebase = async () => {
    if (!imageFile) return '';

    try {
      setUploading(true);
      
      // Create real unique filename
      const timestamp = Date.now();
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `notifications/${timestamp}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      // Real file upload
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, imageFile);
      
      // Get real download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Real validation
      if (!formData.title.trim() || !formData.message.trim()) {
        alert('Please fill in all required fields');
        return;
      }

      let imageUrl = '';
      
      // Upload real image if selected
      if (imageFile) {
        imageUrl = await uploadImageToFirebase();
      }

      // Real user identifier
      const userIdentifier = currentUser.email || currentUser.name || 'unknown_user';
      
      // Prepare vendor IDs if sending to vendors
      const vendorIds = formData.targetAudience === 'vendors_only' ? 
        vendors.map(vendor => vendor.id) : [];

      // Real notification data
      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        vendorIds: vendorIds, // Store vendor IDs for targeting
        imageUrl: imageUrl,
        expiryDate: formData.expiryDate ? Timestamp.fromDate(new Date(formData.expiryDate)) : null,
        isActive: formData.isActive,
        createdBy: userIdentifier,
        createdByName: currentUser.name || currentUser.email,
        createdByRole: currentUser.role,
        timestamp: Timestamp.now(),
        readBy: []
      };

      console.log('Saving real notification data:', notificationData);

      // Add real data to Firestore
      await addDoc(collection(db, 'notifications'), notificationData);

      alert('Notification created successfully!');
      router.push('/notification');
      
    } catch (error) {
      console.error('Error creating notification:', error);
      alert(error.message || 'Failed to create notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Real Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1" style={{ overflowX: 'hidden' }}>
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-outline-secondary border-0"
                onClick={() => router.push('/notification')}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="fw-bold text-dark mb-1">Create Notification</h2>
                <p className="text-muted mb-0">
                  Send notifications to customers or vendors
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="badge bg-primary bg-opacity-10 text-primary p-2">
                Admin: <strong>{currentUser.role.toUpperCase()}</strong>
              </div>
              <div className="badge bg-success bg-opacity-10 text-success">
                Active Vendors: {vendors.length}
              </div>
            </div>
          </div>
        </div>

        {/* Real Notification Form */}
        <div className="p-4">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row g-4">
                  
                  {/* Target Audience Selection - First Priority */}
                  <div className="col-12">
                    <label className="form-label fw-semibold fs-6">
                      Select Audience *
                    </label>
                    <div className="row g-3">
                      {audienceOptions.map(audience => {
                        const IconComponent = audience.icon;
                        const isSelected = formData.targetAudience === audience.value;
                        return (
                          <div key={audience.value} className="col-md-6">
                            <div 
                              className={`card cursor-pointer border-2 ${isSelected ? 'border-info bg-info  bg-opacity-10' : 'border-light'}`}
                              style={{ height: '120px', cursor: 'pointer' }}
                              onClick={() => handleInputChange('targetAudience', audience.value)}
                            >
                              <div className="card-body d-flex flex-column justify-content-center align-items-center text-center">
                                <IconComponent 
                                  size={32} 
                                  className={`mb-2 ${isSelected ? 'text-primary' : 'text-muted'}`} 
                                />
                                <h6 className={`fw-semibold ${isSelected ? 'text-primary' : 'text-dark'}`}>
                                  {audience.label}
                                </h6>
                                <small className="text-muted">{audience.description}</small>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vendor Info Display - If vendors selected */}
                  {formData.targetAudience === 'vendors_only' && vendors.length > 0 && (
                    <div className="col-12">
                      <div className="alert alert-info border-0">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Store size={20} className="text-primary" />
                          <strong>This notification will be sent to {vendors.length} vendors</strong>
                        </div>
                        <div className="row row-cols-1 row-cols-md-2 g-2">
                          {vendors.slice(0, 4).map(vendor => (
                            <div key={vendor.id} className="col">
                              <div className="d-flex align-items-center gap-2 p-2 bg-white rounded">
                                <Store size={14} className="text-primary" />
                                <span className="fw-medium text-truncate">
                                  {vendor.restaurantName || vendor.businessName || 'Vendor'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {vendors.length > 4 && (
                            <div className="col-12">
                              <small className="text-muted">
                                ... and {vendors.length - 4} more vendors
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Info Display */}
                  {formData.targetAudience === 'customers_only' && (
                    <div className="col-12">
                      <div className="alert alert-success border-0">
                        <div className="d-flex align-items-center gap-2">
                          <Users size={20} className="text-success" />
                          <strong>This notification will be sent to all customers</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div className="col-12">
                    <label className="form-label fw-semibold">Title *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Enter notification title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      required
                    />
                  </div>

                  {/* Message */}
                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      <MessageCircle size={16} className="me-2" />
                      Message *
                    </label>
                    <textarea
                      className="form-control"
                      placeholder="Enter your notification message here..."
                      rows="5"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      required
                    />
                  </div>

                  {/* Image Upload - Only for vendor notifications */}
                  {formData.targetAudience === 'vendors_only' && (
                    <div className="col-12">
                      <label className="form-label fw-semibold">
                        <ImageIcon size={16} className="me-2" />
                        Notification Image (Optional for Vendors)
                      </label>
                      
                      {!imagePreview ? (
                        <div 
                          className="border border-dashed rounded-3 p-5 text-center cursor-pointer"
                          style={{ borderStyle: 'dashed', cursor: 'pointer' }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload size={48} className="text-muted mb-3" />
                          <h5 className="text-muted">Click to upload image</h5>
                          <p className="text-muted mb-0">
                            Supports JPG, PNG, GIF, WebP (Max 5MB)
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="d-none"
                          />
                        </div>
                      ) : (
                        <div className="position-relative">
                          <div className="border rounded-3 p-3">
                            <div className="row align-items-center">
                              <div className="col-auto">
                                <img 
                                  src={imagePreview} 
                                  alt="Preview" 
                                  className="rounded-2"
                                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                />
                              </div>
                              <div className="col">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <ImageIcon size={16} className="text-primary" />
                                  <strong>Image Selected</strong>
                                </div>
                                <p className="text-muted mb-0">
                                  {imageFile?.name} • {(imageFile?.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="col-auto">
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={removeImage}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {uploading && (
                        <div className="mt-2">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                            <span className="visually-hidden">Uploading...</span>
                          </div>
                          <small className="text-primary">Uploading image...</small>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Type and Priority */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Notification Type</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                    >
                      {notificationTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Priority Level</label>
                    <select
                      className="form-select"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                    >
                      {priorityOptions.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expiry Date */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <Calendar size={16} className="me-2" />
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                    />
                    <div className="form-text">
                      Notification will automatically expire after this date
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Status</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        id="isActiveSwitch"
                      />
                      <label className="form-check-label" htmlFor="isActiveSwitch">
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </label>
                    </div>
                    <div className="form-text">
                      Inactive notifications won't be shown to users
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="col-12">
                    <div className="d-flex gap-3 justify-content-end border-top pt-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4"
                        onClick={() => router.push('/notification')}
                        disabled={loading || uploading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 d-flex align-items-center gap-2"
                        disabled={loading || uploading}
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
                            <Send size={18} />
                            Send Notification
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
  );
}