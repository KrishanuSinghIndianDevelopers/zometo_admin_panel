'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase/firebase';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, setDoc } from 'firebase/firestore';

import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import Sidebar from '../../components/Sidebar';
import { Save, Eye, EyeOff, Calendar, Mail, Phone, MapPin, Building, Navigation, Map, Bell, User, Store, Shield, Clock } from 'lucide-react';
import { X, Send, MessageCircle, Star } from 'lucide-react';

export default function MyAccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
const [feedbackData, setFeedbackData] = useState({
  type: 'suggestion',
  message: '',
  rating: 5
});


  // Form states
  const [formData, setFormData] = useState({
    name: '',
    restaurantName: '',
    email: '',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [location, setLocation] = useState({
    latitude: '',
    longitude: '',
    fullAddress: ''
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      const userObj = JSON.parse(userData);
      setUser(userObj);
      await fetchVendorData(userObj);
    } catch (error) {
      console.error('Authentication error:', error);
      router.push('/login');
    }
  };

  const fetchVendorData = async (userObj) => {
    try {
      const vendorUid = userObj.documentId || userObj.uid;
      const docRef = doc(db, 'vendors', vendorUid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setVendorData(data);
        
        // Set form data from vendor document
        setFormData({
          name: data.name || '',
          restaurantName: data.restaurantName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Set location data if exists
        if (data.location) {
          setLocation({
            latitude: data.location.latitude || '',
            longitude: data.location.longitude || '',
            fullAddress: data.location.fullAddress || ''
          });
        }

        // Fetch notifications after vendor data is loaded
        await fetchAdminNotifications(vendorUid);
      } else {
        // If vendor document doesn't exist, use user data
        setFormData({
          name: userObj.name || '',
          restaurantName: userObj.restaurantName || '',
          email: userObj.email || '',
          phone: userObj.phone || '',
          address: userObj.address || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications for this vendor
  const fetchAdminNotifications = async (vendorUid) => {
    try {
      console.log('Fetching notifications for vendor:', vendorUid);
      
      // TEMPORARY FIX: Remove orderBy to avoid index error
      const q = query(
        collection(db, 'notifications'),
        where('targetAudience', '==', 'vendors_only'),
        where('isActive', '==', true)
        // orderBy('timestamp', 'desc') - temporarily removed
      );
      
      const querySnapshot = await getDocs(q);
      const allNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sorting
      const sortedNotifications = allNotifications.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA; // Descending order
      });

      console.log('All vendor notifications:', sortedNotifications);

      // Filter notifications for this specific vendor
      const vendorNotifications = sortedNotifications.filter(notification => {
        const hasVendorId = notification.vendorIds && 
                           Array.isArray(notification.vendorIds) && 
                           notification.vendorIds.includes(vendorUid);
        
        return hasVendorId;
      });

      console.log('Filtered notifications for this vendor:', vendorNotifications);
      setAdminNotifications(vendorNotifications);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      setAdminNotifications([]);
    }
  };

  // Get current location function
  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Get address from coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const newLocation = {
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            fullAddress: data.display_name || `${latitude}, ${longitude}`
          };
          
          setLocation(newLocation);
          
          // Auto-fill address field
          setFormData(prev => ({
            ...prev,
            address: data.display_name || ''
          }));
          
        } catch (error) {
          console.error('Error getting address:', error);
          setLocation({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            fullAddress: `${latitude}, ${longitude}`
          });
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        alert(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const vendorUid = user.documentId || user.uid;
      const vendorRef = doc(db, 'vendors', vendorUid);

      // Update basic information with location
      const updateData = {
        name: formData.name.trim(),
        restaurantName: formData.restaurantName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          fullAddress: location.fullAddress
        },
        updatedAt: new Date()
      };

      await updateDoc(vendorRef, updateData);

      // Update email if changed
      if (formData.email !== vendorData?.email) {
        await updateEmail(auth.currentUser, formData.email);
      }

      // Update password if provided
      if (formData.newPassword && formData.currentPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          alert('New password and confirm password do not match!');
          setSaving(false);
          return;
        }

        if (formData.newPassword.length < 6) {
          alert('Password should be at least 6 characters long!');
          setSaving(false);
          return;
        }

        // Re-authenticate user before changing password
        const credential = EmailAuthProvider.credential(
          user.email, 
          formData.currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, formData.newPassword);
      }

      // Update localStorage
      const updatedUser = {
        ...user,
        name: formData.name,
        restaurantName: formData.restaurantName,
        email: formData.email
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Refresh vendor data
      await fetchVendorData(updatedUser);

      alert('Profile updated successfully!');
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Current password is incorrect!');
      } else if (error.code === 'auth/requires-recent-login') {
        alert('Please login again to change your email or password!');
        router.push('/login');
      } else {
        alert('Failed to update profile!');
      }
    } finally {
      setSaving(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const vendorUid = user.documentId || user.uid;
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (notificationDoc.exists()) {
        const notificationData = notificationDoc.data();
        const readBy = notificationData.readBy || [];
        
        if (!readBy.includes(vendorUid)) {
          readBy.push(vendorUid);
          await updateDoc(notificationRef, {
            readBy: readBy
          });
          
          // Update local state
          setAdminNotifications(prev => 
            prev.map(notif => 
              notif.id === notificationId 
                ? { ...notif, readBy: readBy }
                : notif
            )
          );
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Notification badge color helper
  const getNotificationBadgeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'urgent': return 'danger';
      case 'info': return 'info';
      case 'update': return 'primary';
      default: return 'secondary';
    }
  };

  // Calculate unread count
  const unreadCount = adminNotifications.filter(
    n => !n.readBy?.includes(user?.documentId || user?.uid)
  ).length;

  if (loading) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-muted">Loading account information...</p>
          </div>
        </div>
      </div>
    );
  }
const handleFeedbackSubmit = async (e) => {
  e.preventDefault();
  
  if (!feedbackData.message.trim()) {
    alert('Please enter your feedback message');
    return;
  }

  try {
    const vendorUid = user.documentId || user.uid;
    
    // Create feedback document
    const feedbackRef = doc(collection(db, 'feedbacks'));
    await setDoc(feedbackRef, {
      id: feedbackRef.id,
      userName: formData.name || vendorData?.name,
      userPhone: formData.phone || vendorData?.phone,
      userEmail: formData.email || vendorData?.email,
      userType: 'vendor',
      vendorId: vendorUid,
      vendorName: formData.restaurantName || vendorData?.restaurantName,
      message: feedbackData.message.trim(),
      type: feedbackData.type,
      rating: feedbackData.rating,
      sentiment: feedbackData.rating >= 4 ? 'positive' : feedbackData.rating >= 3 ? 'neutral' : 'negative',
      createdAt: new Date(),
      status: 'new'
    });

    // Reset form and close modal
    setFeedbackData({
      type: 'suggestion',
      message: '',
      rating: 5
    });
    setShowFeedbackModal(false);
    
    alert('Thank you for your feedback! We appreciate your input.');
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    alert('Failed to submit feedback. Please try again.');
  }
};

// Add this function to handle feedback input changes
const handleFeedbackChange = (e) => {
  const { name, value } = e.target;
  setFeedbackData(prev => ({
    ...prev,
    [name]: value
  }));
};



  return (
    <div className="d-flex min-vh-100">
      <Sidebar />
      
      <div className="flex-grow-1 bg-light">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">My Account</h2>
              <p className="text-muted mb-0">Manage your profile and account settings</p>
            </div>
            <div className="text-end">



<div className="text-end">
  <div className="badge bg-primary bg-opacity-10 text-primary border px-3 py-2">
    <Building size={16} className="me-1" />
    Vendor Profile
  </div>

   <div>
    <button 
      className="btn btn-success mt-3 d-flex align-items-center gap-2"
      onClick={() => setShowFeedbackModal(true)}
    >  
      <MessageCircle size={16} />
      Send Feedback
    </button>
  </div>
</div>
{showFeedbackModal && (
  <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-0 shadow">
        <div className="modal-header bg-primary text-white">
          <h5 className="modal-title fw-semibold">
            <MessageCircle size={20} className="me-2" />
            Send Feedback
          </h5>
          <button 
            type="button" 
            className="btn-close btn-close-white"
            onClick={() => setShowFeedbackModal(false)}
          ></button>
        </div>
        
        <form onSubmit={handleFeedbackSubmit}>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-medium text-dark">Feedback Type</label>
              <select 
                className="form-select"
                name="type"
                value={feedbackData.type}
                onChange={handleFeedbackChange}
              >
                <option value="suggestion">Suggestion</option>
                <option value="complaint">Complaint</option>
                <option value="compliment">Compliment</option>
                <option value="general">General Feedback</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label fw-medium text-dark">
                Rating: {feedbackData.rating}/5
              </label>
              <div className="d-flex align-items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`btn btn-sm ${star <= feedbackData.rating ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setFeedbackData(prev => ({...prev, rating: star}))}
                  >
                    <Star size={16} fill={star <= feedbackData.rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-medium text-dark">Your Message *</label>
              <textarea
                className="form-control"
                name="message"
                rows="4"
                value={feedbackData.message}
                onChange={handleFeedbackChange}
                placeholder="Please share your feedback, suggestions, or concerns..."
                required
              />
              <div className="form-text">
                Your feedback helps us improve our service. {feedbackData.message.length}/500
              </div>
            </div>

            <div className="alert alert-info border-0 py-2">
              <small>
                <strong>Note:</strong> This feedback will be sent to the admin team for review. 
                We appreciate your input to help us serve you better.
              </small>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-outline-secondary"
              onClick={() => setShowFeedbackModal(false)}
            >
              <X size={16} className="me-1" />
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <Send size={16} />
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="row">
            {/* Left Column - Account Information */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <h5 className="fw-semibold text-dark mb-4">
                    <User size={20} className="me-2" />
                    Profile Information
                  </h5>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium text-dark">Full Name *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium text-dark">Restaurant Name *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="restaurantName"
                            value={formData.restaurantName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium text-dark">Email Address *</label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <Mail size={16} />
                            </span>
                            <input
                              type="email"
                              className="form-control"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label fw-medium text-dark">Phone Number *</label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <Phone size={16} />
                            </span>
                            <input
                              type="tel"
                              className="form-control"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              required
                              placeholder="+91 1234567890"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label fw-medium text-dark mb-0">
                          Business Address *
                        </label>
                        <button
                          type="button"
                          onClick={getCurrentLocation}
                          disabled={gettingLocation}
                          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                        >
                          {gettingLocation ? (
                            <>
                              <div className="spinner-border spinner-border-sm" />
                              Getting Location...
                            </>
                          ) : (
                            <>
                              <Navigation size={14} />
                              Get My Location
                            </>
                          )}
                        </button>
                      </div>
                      
                      {location.latitude && (
                        <div className="alert alert-success border-0 py-2 mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <Map size={14} />
                            <div>
                              <small className="fw-medium">📍 Location Captured:</small>
                              <br />
                              <small>{location.fullAddress}</small>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="input-group">
                        <span className="input-group-text">
                          <MapPin size={16} />
                        </span>
                        <textarea
                          className="form-control"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows="3"
                          placeholder="Enter your business address or use 'Get My Location' button"
                          required
                        />
                      </div>
                    </div>

                    {/* Password Change Section */}
                    <div className="border-top pt-4 mt-4">
                      <h6 className="fw-semibold text-dark mb-3">Change Password</h6>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label fw-medium text-dark">Current Password</label>
                            <div className="input-group">
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                className="form-control"
                                name="currentPassword"
                                value={formData.currentPassword}
                                onChange={handleInputChange}
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label fw-medium text-dark">New Password</label>
                            <div className="input-group">
                              <input
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <div className="form-text">Minimum 6 characters</div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label fw-medium text-dark">Confirm New Password</label>
                            <input
                              type={showPassword ? "text" : "password"}
                              className="form-control"
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-3 mt-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => router.back()}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary d-flex align-items-center gap-2"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="spinner-border spinner-border-sm" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column - Summary & Messages */}
            <div className="col-lg-4">
              {/* Account Summary Card */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <h6 className="fw-semibold text-dark mb-3">
                    <Shield size={18} className="me-2" />
                    Account Summary
                  </h6>
                  
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">Account Type:</span>
                      <span className="badge bg-primary">Vendor</span>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">Status:</span>
                      <span className={`badge bg-${vendorData?.status === 'active' ? 'success' : vendorData?.status === 'pending' ? 'warning' : 'secondary'}`}>
                        {vendorData?.status || 'Active'}
                      </span>
                    </div>
                    
                    {vendorData?.approved !== undefined && (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted">Approved:</span>
                        <span className={`badge bg-${vendorData?.approved ? 'success' : 'warning'}`}>
                          {vendorData?.approved ? 'Yes' : 'Pending'}
                        </span>
                      </div>
                    )}
                    
                    {vendorData?.createdAt && (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted">Member Since:</span>
                        <small className="text-dark d-flex align-items-center gap-1">
                          <Calendar size={14} />
                          {vendorData.createdAt.toDate().toLocaleDateString()}
                        </small>
                      </div>
                    )}
                    
                    {vendorData?.updatedAt && (
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Last Updated:</span>
                        <small className="text-dark">
                          {vendorData.updatedAt.toDate().toLocaleDateString()}
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Location Info */}
                  {location.latitude && (
                    <div className="border-top pt-3 mb-3">
                      <h6 className="fw-semibold text-dark mb-2">Location Info</h6>
                      <div className="small text-muted">
                        <div className="mb-1">
                          <strong>Coordinates:</strong><br />
                          Lat: {location.latitude}<br />
                          Lng: {location.longitude}
                        </div>
                        <div>
                          <strong>Address:</strong><br />
                          {location.fullAddress}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-top pt-3">
                    <h6 className="fw-semibold text-dark mb-2">Quick Info</h6>
                    <ul className="list-unstyled small text-muted">
                      <li className="mb-1">• Update your restaurant details</li>
                      <li className="mb-1">• Keep location accurate for customers</li>
                      <li className="mb-1">• Change password regularly</li>
                      <li>• Changes reflect immediately</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Admin Messages Cart - Only show if there are notifications */}
              {adminNotifications.length > 0 && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-transparent border-0 pb-0">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="fw-semibold text-dark mb-0">
                        <Bell size={18} className="me-2" />
                        Admin Messages
                      </h6>
                      {unreadCount > 0 && (
                        <span className="badge bg-danger rounded-pill">{unreadCount}</span>
                      )}
                    </div>
                    <p className="text-muted small mb-0 mt-1">Important updates from admin team</p>
                  </div>
                  
                  <div className="card-body p-0">
                    <div className="notification-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {adminNotifications.slice(0, 5).map((notification) => {
                        const isRead = notification.readBy?.includes(user?.documentId || user?.uid);
                        const notificationDate = notification.timestamp?.toDate?.();
                        
                        return (
                          <div 
                            key={notification.id} 
                            className={`notification-item p-3 border-bottom ${!isRead ? 'bg-light-warning border-warning' : 'bg-light'}`}
                            onClick={() => !isRead && markAsRead(notification.id)}
                            style={{ 
                              cursor: !isRead ? 'pointer' : 'default',
                              borderLeft: !isRead ? '4px solid #ffc107' : '4px solid transparent'
                            }}
                          >
                            <div className="d-flex align-items-start gap-3">
                              <div className="flex-shrink-0">
                                <div className={`rounded-circle d-flex align-items-center justify-content-center ${!isRead ? 'bg-primary' : 'bg-secondary'}`} 
                                     style={{width: '40px', height: '40px'}}>
                                  <span className="text-white fw-bold small">AD</span>
                                </div>
                              </div>
                              
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <span className="fw-semibold text-dark d-block">Admin Team</span>
                                    <small className="text-muted">
                                      {notificationDate ? 
                                        `${notificationDate.toLocaleDateString()} • ${notificationDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                                        : 'Recently'
                                      }
                                    </small>
                                  </div>
                                  {!isRead && (
                                    <span className="badge bg-warning text-dark">New</span>
                                  )}
                                </div>
                                
                                <h6 className="text-dark mb-2 small fw-bold">{notification.title}</h6>
                                <p className="mb-2 text-dark small">{notification.message}</p>
                                
                                {notification.imageUrl && (
                                  <div className="mt-2 mb-2">
                                    <img 
                                      src={notification.imageUrl} 
                                      alt="Notification" 
                                      className="img-fluid rounded border"
                                      style={{ 
                                        maxHeight: '100px', 
                                        objectFit: 'cover', 
                                        width: '100%',
                                        cursor: 'pointer'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(notification.imageUrl, '_blank');
                                      }}
                                    />
                                  </div>
                                )}
                                
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                  <span className={`badge bg-${getNotificationBadgeColor(notification.type)}`}>
                                    {notification.type?.toUpperCase() || 'INFO'}
                                  </span>
                                  <small className="text-muted">
                                    {!isRead ? 'Click to mark as read' : 'Read'}
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {adminNotifications.length > 5 && (
                    <div className="card-footer bg-transparent border-0">
                      <button 
                        className="btn btn-outline-primary btn-sm w-100"
                        onClick={() => {/* Add view all functionality */}}
                      >
                        View All Messages ({adminNotifications.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .notification-item {
          transition: all 0.2s ease;
          border-radius: 0;
        }
        .notification-item:hover {
          background-color: rgba(0, 123, 255, 0.05) !important;
        }
        .bg-light-warning {
          background-color: rgba(255, 193, 7, 0.08) !important;
        }
        .notification-list::-webkit-scrollbar {
          width: 4px;
        }
        .notification-list::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .notification-list::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}