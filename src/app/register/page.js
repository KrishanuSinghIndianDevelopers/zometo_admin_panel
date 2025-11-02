'use client';
import { db } from '../../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    restaurantName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [location, setLocation] = useState({
    latitude: '',
    longitude: '',
    fullAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Get current location
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
          
          setLocation({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            fullAddress: data.display_name || `${latitude}, ${longitude}`
          });
          
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      
      if (parsedUser.role === 'vendor') {
        alert('Vendors cannot access registration page.');
        router.push('/vendor-dashboard');
        return;
      }
      
      if (parsedUser.role === 'main_admin') {
        setPageLoading(false);
        return;
      }
    }

    setPageLoading(false);
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.restaurantName.trim()) newErrors.restaurantName = 'Restaurant name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    
    try {
      // Firebase mein data save karein with location
      const vendorData = {
        name: formData.name,
        restaurantName: formData.restaurantName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          fullAddress: location.fullAddress
        },
        password: formData.password,
        status: 'pending',
        approved: false,
        role: 'vendor',
        createdAt: serverTimestamp(),
        createdBy: 'main_admin'
      };

      // Firebase Firestore mein add karein
      const docRef = await addDoc(collection(db, 'vendors'), vendorData);
      
      console.log('Vendor registered with ID: ', docRef.id);
      console.log('Location data saved:', location);
      
      // Success message show karein
      setRegistrationSuccess(true);
      
      // Form reset karein
      setFormData({
        name: '',
        restaurantName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: ''
      });
      setLocation({
        latitude: '',
        longitude: '',
        fullAddress: ''
      });
      
    } catch (error) {
      console.error('Error adding vendor: ', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  // Show loading while checking authentication
  if (pageLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Success Message Component
  if (registrationSuccess) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="card shadow border-0 text-center">
                <div className="card-body p-5">
                  {/* Success Icon */}
                  <div className="mb-4">
                    <div
                      className="bg-success rounded-circle d-inline-flex align-items-center justify-content-center"
                      style={{ width: '80px', height: '80px' }}
                    >
                      <i className="bi bi-check-lg text-white" style={{ fontSize: '2.5rem' }}></i>
                    </div>
                  </div>

                  {/* Success Message */}
                  <h2 className="h3 fw-bold text-success mb-3">
                    Registration Submitted Successfully!
                  </h2>

                  <div className="alert alert-info border-0 bg-light-info">
                    <p className="mb-3 fw-semibold">Thank you for connecting with us!</p>
                    <p className="mb-0">
                      Our team will contact you shortly to complete your onboarding process.
                    </p>
                  </div>

                  {/* Location Info */}
                  {location.latitude && (
                    <div className="alert alert-success border-0">
                      <p className="mb-1"><strong>📍 Location Captured:</strong></p>
                      <p className="mb-0 small">{location.fullAddress}</p>
                    </div>
                  )}

                  <div>
                    <button
                      onClick={goToLogin}
                      className="btn btn-success btn-lg px-4 py-2 rounded-pill shadow-sm mt-3"
                    >
                      Go to Login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form Component
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow border-0">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="h2 fw-bold text-primary">Create Vendor Account</h1>
                  <p className="text-muted">Join our platform and grow your business</p>
                </div>

                {/* Admin Approval Notice */}
                <div className="alert alert-warning border-0 mb-4">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Note:</strong> Your account requires admin approval before you can login. 
                  You'll receive confirmation email once approved.
                </div>

                {/* Location Notice */}
                <div className="alert alert-info border-0 mb-4">
                  <i className="bi bi-geo-alt me-2"></i>
                  <strong>Location Access:</strong> We need your location to show your restaurant to nearby customers.
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="btn btn-sm btn-outline-primary ms-2"
                  >
                    {gettingLocation ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-crosshair2 me-1"></i>
                        Get My Location
                      </>
                    )}
                  </button>
                </div>

                {location.latitude && (
                  <div className="alert alert-success border-0 mb-4">
                    <p className="mb-1"><strong>✅ Location Captured Successfully!</strong></p>
                    <p className="mb-0 small">{location.fullAddress}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Personal Information */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="name" className="form-label">Full Name *</label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleChange}
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          placeholder="Enter your full name"
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                      </div>
                    </div>

                    {/* Restaurant Information */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="restaurantName" className="form-label">Restaurant Name *</label>
                        <input
                          id="restaurantName"
                          name="restaurantName"
                          type="text"
                          value={formData.restaurantName}
                          onChange={handleChange}
                          className={`form-control ${errors.restaurantName ? 'is-invalid' : ''}`}
                          placeholder="Enter restaurant name"
                        />
                        {errors.restaurantName && <div className="invalid-feedback">{errors.restaurantName}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    {/* Contact Information */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email Address *</label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          placeholder="Enter your email"
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="phone" className="form-label">Phone Number *</label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                          placeholder="Enter phone number"
                        />
                        {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Address with Location */}
                  <div className="mb-3">
                    <label htmlFor="address" className="form-label">
                      Business Address * 
                      {location.latitude && (
                        <span className="text-success ms-2">
                          <i className="bi bi-check-circle-fill"></i> Location auto-filled
                        </span>
                      )}
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows="3"
                      value={formData.address}
                      onChange={handleChange}
                      className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                      placeholder="Enter your business address or use 'Get My Location' button above"
                    />
                    {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                  </div>

                  <div className="row">
                    {/* Passwords */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="password" className="form-label">Password *</label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          placeholder="Create password"
                        />
                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password *</label>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                          placeholder="Confirm password"
                        />
                        {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="alert alert-danger">
                      {errors.submit}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || gettingLocation}
                    className="btn btn-primary w-100 py-2 mb-3"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Submit for Approval'
                    )}
                  </button>

                  {/* Login Link */}
                  <div className="text-center">
                    <p className="text-muted">
                      Already have an account?{' '}
                      <Link href="/login" className="text-decoration-none">
                        Sign in here
                      </Link>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}