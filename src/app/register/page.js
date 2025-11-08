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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          setLocation({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            fullAddress: data.display_name || `${latitude}, ${longitude}`
          });
          setFormData(prev => ({ ...prev, address: data.display_name || '' }));
        } catch (error) {
          setLocation({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            fullAddress: `${latitude}, ${longitude}`
          });
        }
        setGettingLocation(false);
      },
      (error) => {
        let msg = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) msg = 'Location access denied. Please enable location.';
        else if (error.code === error.POSITION_UNAVAILABLE) msg = 'Location unavailable.';
        else if (error.code === error.TIMEOUT) msg = 'Location request timed out.';
        alert(msg);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
      const vendorData = {
        ...formData,
        location: { ...location },
        password: formData.password,
        status: 'pending',
        approved: false,
        role: 'vendor',
        createdAt: serverTimestamp(),
        createdBy: 'main_admin'
      };
      await addDoc(collection(db, 'vendors'), vendorData);
      setRegistrationSuccess(true);
      setFormData({
        name: '', restaurantName: '', email: '', phone: '',
        address: '', password: '', confirmPassword: ''
      });
      setLocation({ latitude: '', longitude: '', fullAddress: '' });
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => router.push('/login');

  if (pageLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient-orange">
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" style={{ width: '3.5rem', height: '3.5rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-orange fw-semibold fs-5">Preparing your restaurant profile...</p>
        </div>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5 px-3">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="card shadow-lg border-0 overflow-hidden">
                <div className="bg-success text-white text-center py-5 px-4">
                  <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '90px', height: '90px' }}>
                    <i className="bi bi-check-lg text-success" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h2 className="fw-bold">Welcome to the Family!</h2>
                </div>
                <div className="card-body p-5 text-center">
                  <div className="alert alert-warning border-0 bg-light-orange mb-4">
                    <p className="mb-2 fw-bold text-orange">Your restaurant is under review</p>
                    <p className="mb-0 small">We’ll verify your details and activate your account within 24 hours.</p>
                  </div>
                  {location.latitude && (
                    <div className="alert alert-success border-0 mb-4">
                      <p className="mb-1"><strong>Location Captured:</strong></p>
                      <p className="mb-0 small text-success">{location.fullAddress}</p>
                    </div>
                  )}
                  <button onClick={goToLogin} className="btn btn-success btn-lg px-5 py-3 rounded-pill shadow-sm">
                    Go to Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Custom CSS */}
      <style jsx>{`
        .bg-gradient-orange {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        }
        .bg-light-orange { background-color: #fff8e1 !important; }
        .text-orange { color: #f97316 !important; }
        .btn-warning { background: #fb923c; border: none; }
        .btn-warning:hover { background: #f97316; }
        .card-hover:hover { transform: translateY(-5px); transition: 0.3s; }
        .form-control:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 0.2rem rgba(249, 115, 22, 0.25);
        }
      `}</style>

      <div className="min-vh-100 bg-gradient-orange py-5 px-3">
        <div className="container">
          {/* Hero */}
          <div className="text-center mb-5">
            <div className="d-inline-flex align-items-center bg-white px-4 py-2 rounded-pill shadow mb-3">
              <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-shop-window text-white"></i>
              </div>
              <span className="fw-bold text-orange">Restaurant Partner Portal</span>
            </div>
            <h1 className="display-5 fw-bold text-dark mb-3">
              Grow Your <span className="text-warning">Restaurant Business</span>
            </h1>
            {/* <p className="lead text-muted">Join 10,000+ restaurants getting more orders daily!</p> */}
          </div>

          <div className="row g-4">
            {/* Benefits */}
            <div className="col-lg-4">
              <div className="card border-0 shadow card-hover h-100">
                <div className="card-body p-4">
                  <h5 className="card-title text-warning fw-bold mb-3">
                    <i className="bi bi-graph-up-arrow me-2"></i> Why Partner With Us?
                  </h5>
                  <ul className="list-unstyled">
                    <li className="mb-2"><i className="bi bi-check-circle-fill text-success me-2"></i> <strong>10,000+</strong> daily customers</li>
                    <li className="mb-2"><i className="bi bi-check-circle-fill text-success me-2"></i> <strong>Zero</strong> commission first month</li>
                    <li className="mb-2"><i className="bi bi-check-circle-fill text-success me-2"></i> Real-time order dashboard</li>
                    <li className="mb-2"><i className="bi bi-check-circle-fill text-success me-2"></i> Free marketing & promotions</li>
                  </ul>
                </div>
              </div>

              <div className="alert alert-success border-0 mt-3 text-center">
                <i className="bi bi-shield-check me-2"></i>
                <strong>100% Secure & Verified</strong>
              </div>
            </div>

            {/* Form */}
            <div className="col-lg-8">
              <div className="card shadow-lg border-0">
                <div className="card-body p-5">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h3 className="fw-bold text-dark">Register Your Restaurant</h3>
                    <div className="d-flex gap-1">
                      <div className="bg-warning rounded-pill" style={{ width: '30px', height: '8px' }}></div>
                      <div className="bg-secondary rounded-pill" style={{ width: '20px', height: '8px' }}></div>
                      <div className="bg-secondary rounded-pill" style={{ width: '15px', height: '8px' }}></div>
                    </div>
                  </div>

                  <div className="alert alert-warning border-0 mb-4">
                    <i className="bi bi-info-circle-fill me-2"></i>
                    <strong>Admin Approval Required:</strong> Your account will be activated after verification (within 24 hrs).
                  </div>

                  <div className="alert alert-info border-0 mb-4 d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-geo-alt-fill me-2"></i>
                      <strong>Enable Location:</strong> Help customers find your restaurant!
                    </div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
                    >
                      {gettingLocation ? (
                        <>
                          <span className="spinner-border spinner-border-sm"></span> Getting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-crosshair"></i> Get Location
                        </>
                      )}
                    </button>
                  </div>

                  {location.latitude && (
                    <div className="alert alert-success border-0 mb-4">
                      <p className="mb-1"><strong>Location Captured Successfully!</strong></p>
                      <p className="mb-0 small">{location.fullAddress}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Owner Name *</label>
                        <input
                          name="name" value={formData.name} onChange={handleChange}
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          placeholder="John Doe"
                        />
                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Restaurant Name *</label>
                        <input
                          name="restaurantName" value={formData.restaurantName} onChange={handleChange}
                          className={`form-control ${errors.restaurantName ? 'is-invalid' : ''}`}
                          placeholder="Spice Garden Dhaba"
                        />
                        {errors.restaurantName && <div className="invalid-feedback">{errors.restaurantName}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Email *</label>
                        <input
                          type="email" name="email" value={formData.email} onChange={handleChange}
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          placeholder="restaurant@example.com"
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Phone *</label>
                        <input
                          type="tel" name="phone" value={formData.phone} onChange={handleChange}
                          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                          placeholder="+91 98765 43210"
                        />
                        {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Business Address * 
                          {location.latitude && <span className="text-success ms-2"><i className="bi bi-check-circle-fill"></i> Auto-filled</span>}
                        </label>
                        <textarea
                          name="address" rows="3" value={formData.address} onChange={handleChange}
                          className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                          placeholder="Full address of your restaurant, hotel, or dhaba"
                        />
                        {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Password *</label>
                        <input
                          type="password" name="password" value={formData.password} onChange={handleChange}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          placeholder="••••••••"
                        />
                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Confirm Password *</label>
                        <input
                          type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                          placeholder="••••••••"
                        />
                        {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                      </div>
                    </div>

                    {errors.submit && <div className="alert alert-danger mt-3">{errors.submit}</div>}

                    <button
                      type="submit"
                      disabled={loading || gettingLocation}
                      className="btn btn-warning btn-lg w-100 mt-4 py-3 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm"></span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit for Approval <i className="bi bi-arrow-right"></i>
                        </>
                      )}
                    </button>

                    <p className="text-center mt-4 text-muted">
                      Already have an account?{' '}
                      <Link href="/login" className="text-warning fw-bold text-decoration-none">
                        Sign in
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Footer */}
          <div className="text-center mt-5 text-muted small">
            <p>Trusted by <strong className="text-warning">10,000+ restaurants</strong> across India</p>
            <div className="d-flex justify-content-center gap-4 mt-2">
              <span><i className="bi bi-lock-fill"></i> SSL Secured</span>
              <span><i className="bi bi-patch-check-fill"></i> Verified Partners</span>
              <span><i className="bi bi-headset"></i> 24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}