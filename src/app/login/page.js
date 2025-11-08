'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ADMIN_CONFIG } from '../../config/admin';
import { auth, db } from '../../firebase/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});

    try {
      console.log('Attempting login for:', formData.email);

      if (formData.email === ADMIN_CONFIG.EMAIL && formData.password === ADMIN_CONFIG.PASSWORD) {
        const adminData = {
          uid: 'admin-main',
          email: ADMIN_CONFIG.EMAIL,
          name: ADMIN_CONFIG.NAME,
          role: 'main_admin',
          approved: true
        };
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(adminData));
        router.push('/');
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const adminsSnapshot = await getDocs(collection(db, 'admins'));
      const allAdmins = adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const adminData = allAdmins.find(admin => admin.email === formData.email);

      if (adminData) {
        if (adminData.uid !== user.uid) {
          await updateDoc(doc(db, 'admins', adminData.id), { uid: user.uid, lastLogin: new Date().toISOString() });
        }
        const userSessionData = {
          uid: user.uid,
          documentId: adminData.id,
          email: adminData.email,
          name: adminData.name,
          role: adminData.role,
          approved: adminData.approved
        };
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(userSessionData));
        router.push('/');
        return;
      }

      let vendorDoc = null;
      let vendorData = null;
      const uidQuery = query(collection(db, 'vendors'), where('uid', '==', user.uid));
      const uidSnapshot = await getDocs(uidQuery);

      if (!uidSnapshot.empty) {
        vendorDoc = uidSnapshot.docs[0];
        vendorData = vendorDoc.data();
      } else {
        const emailQuery = query(collection(db, 'vendors'), where('email', '==', formData.email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          vendorDoc = emailSnapshot.docs[0];
          vendorData = vendorDoc.data();
          await updateDoc(doc(db, 'vendors', vendorDoc.id), { uid: user.uid });
        }
      }

      if (vendorDoc && vendorData) {
        if (!vendorData.approved) {
          setErrors({ submit: 'Your vendor account is pending admin approval.' });
          setLoading(false);
          return;
        }
        const userData = {
          uid: user.uid,
          documentId: vendorDoc.id,
          email: vendorData.email,
          name: vendorData.name,
          restaurantName: vendorData.restaurantName || '',
          phone: vendorData.phone || '',
          address: vendorData.address || '',
          role: 'vendor',
          approved: true
        };
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(userData));
        router.push('/');
        return;
      }

      const tempAdminData = {
        uid: user.uid,
        email: user.email,
        name: 'Administrator',
        role: 'admin',
        approved: true
      };
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify(tempAdminData));
      router.push('/');

    } catch (error) {
      console.error('Login error:', error);
      if (['auth/invalid-credential', 'auth/wrong-password'].includes(error.code)) {
        setErrors({ submit: 'Invalid email or password. Please try again.' });
        setShowForgotPassword(true);
      } else if (error.code === 'auth/user-not-found') {
        setErrors({ submit: 'No account found. Register or contact admin.' });
      } else if (error.code === 'auth/too-many-requests') {
        setErrors({ submit: 'Too many attempts. Try again later or reset password.' });
        setShowForgotPassword(true);
      } else {
        setErrors({ submit: 'Login failed. Please try again.' });
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ submit: 'Please enter your email to reset password.' });
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, formData.email);
      alert(`Password reset email sent to ${formData.email}`);
      setShowForgotPassword(false);
    } catch (error) {
      setErrors({ submit: error.code === 'auth/user-not-found' ? 'No account found.' : 'Failed to send reset email.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Custom CSS */}
      <style jsx>{`
        .bg-gradient-orange {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        }
        .text-orange { color: #f97316 !important; }
        .btn-warning {
          background: #fb923c;
          border: none;
          font-weight: 600;
        }
        .btn-warning:hover { background: #f97316; }
        .form-control:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 0.2rem rgba(249, 115, 22, 0.25);
        }
        .card-hover:hover {
          transform: translateY(-5px);
          transition: 0.3s;
        }
      `}</style>

      <div className="min-vh-100 bg-gradient-orange d-flex align-items-center py-5 px-3">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="row g-4">

                {/* Left: Welcome & Benefits */}
                <div className="col-lg-5 d-flex align-items-center">
                  <div>
                    <div className="text-center text-lg-start mb-4">
                      <div className="d-inline-flex align-items-center bg-white px-4 py-2 rounded-pill shadow mb-3">
                        <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
                          <i className="bi bi-shop-window text-white"></i>
                        </div>
                        <span className="fw-bold text-orange">Restaurant Partner Portal</span>
                      </div>
                      <h1 className="display-5 fw-bold text-dark mb-3">
                        Welcome Back, <span className="text-warning">Partner!</span>
                      </h1>
                      <p className="lead text-muted">Sign in to manage orders, grow sales, and delight customers.</p>
                    </div>

                    <div className="card border-0 shadow card-hover mb-3">
                      <div className="card-body p-4">
                        <h5 className="text-warning fw-bold mb-3">
                          <i className="bi bi-bell-fill me-2"></i> What’s New?
                        </h5>
                        <ul className="list-unstyled small">
                          <li className="mb-2"><i className="bi bi-star-fill text-warning me-2"></i> <strong>Live Order Tracking</strong></li>
                          <li className="mb-2"><i className="bi bi-graph-up-arrow text-success me-2"></i> <strong>Daily Sales Reports</strong></li>
                          <li className="mb-2"><i className="bi bi-gift-fill text-danger me-2"></i> <strong>Free Promotions</strong></li>
                        </ul>
                      </div>
                    </div>

                    <div className="alert alert-success border-0 text-center">
                      <i className="bi bi-shield-check me-2"></i>
                      <strong>Trusted by 10,000+ Restaurants</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Login Form */}
                <div className="col-lg-7">
                  <div className="card shadow-lg border-0">
                    <div className="card-body p-5">

                      {/* Success Message */}
                      {message && (
                        <div className="alert alert-success text-center mb-4">
                          {message}
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <h3 className="fw-bold text-dark">Sign In to Your Account</h3>
                        <p className="text-muted">Enter your credentials below</p>
                      </div>

                      {/* Vendor Notice */}
                      <div className="alert alert-info border-0 mb-4">
                        <i className="bi bi-info-circle-fill me-2"></i>
                        <strong>Vendor Login:</strong> Use the email & password from registration.
                      </div>

                      <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                          <label className="form-label fw-semibold">Email Address *</label>
                          <input
                            name="email" type="email" value={formData.email} onChange={handleChange}
                            className={`form-control form-control-lg ${errors.email ? 'is-invalid' : ''}`}
                            placeholder="Ex. restaurant@example.com"
                          />
                          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-semibold">Password *</label>
                          <input
                            name="password" type="password" value={formData.password} onChange={handleChange}
                            className={`form-control form-control-lg ${errors.password ? 'is-invalid' : ''}`}
                            placeholder="Ex. ••••••••"
                          />
                          {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <div className="form-check">
                            <input id="remember" type="checkbox" className="form-check-input" />
                            <label htmlFor="remember" className="form-check-label">Remember me</label>
                          </div>
                          <button type="button" className="btn btn-link p-0 text-decoration-none text-orange fw-semibold"
                            onClick={() => setShowForgotPassword(true)}>
                            Forgot password?
                          </button>
                        </div>

                        {/* Forgot Password */}
                        {showForgotPassword && (
                          <div className="alert alert-light border mb-4 p-3">
                            <p className="mb-2 fw-semibold">Reset Your Password</p>
                            <div className="d-flex gap-2">
                              <input
                                type="email" className="form-control" placeholder="Your email"
                                value={formData.email} onChange={handleChange}
                              />
                              <button type="button" className="btn btn-outline-warning px-3"
                                onClick={handleForgotPassword} disabled={loading}>
                                Send Link
                              </button>
                              <button type="button" className="btn btn-outline-secondary px-3"
                                onClick={() => setShowForgotPassword(false)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}

                        <button
                          type="submit" disabled={loading}
                          className="btn btn-warning btn-lg w-100 py-3 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm"></span>
                              Signing In...
                            </>
                          ) : (
                            <>
                              Sign In <i className="bi bi-box-arrow-in-right"></i>
                            </>
                          )}
                        </button>

                        <div className="text-center mt-4">
                          <p className="text-muted">
                            New restaurant?{' '}
                            <Link href="/register" className="text-warning fw-bold text-decoration-none">
                              Register as Vendor
                            </Link>
                          </p>
                        </div>
                      </form>

                      {/* Admin Note */}
                      <div className="mt-4 p-3 bg-light rounded small text-center">
                        <strong>Admin Login:</strong> Use Firebase Auth credentials.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}