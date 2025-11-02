'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ADMIN_CONFIG } from '../../config/admin';
import { auth, db } from '../../firebase/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc  } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
      console.log('🔄 Attempting login for:', formData.email);

      // ✅ STEP 1: Check if it's the main admin using config
      if (formData.email === ADMIN_CONFIG.EMAIL && formData.password === ADMIN_CONFIG.PASSWORD) {
        console.log('✅ Main admin login detected');
        
        const adminData = {
          uid: 'admin-main', // Special ID for main admin
          email: ADMIN_CONFIG.EMAIL,
          name: ADMIN_CONFIG.NAME,
          role: 'main_admin',
          approved: true
        };

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(adminData));
        console.log('✅ Main admin login successful');
        router.push('/');
        return;
      }

      // ✅ STEP 2: Try Firebase Auth login
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      console.log('✅ Firebase Auth login successful, UID:', user.uid);

// ✅ STEP 3: Check if user is admin in Firestore (BY EMAIL - Not by UID)
console.log('🔄 Checking admin privileges...');

// Get ALL admins from Firestore and find by email
const adminsSnapshot = await getDocs(collection(db, 'admins'));
const allAdmins = adminsSnapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));

console.log('📋 All admins in database:', allAdmins);

// Find admin by EMAIL (not by UID)
const adminData = allAdmins.find(admin => admin.email === formData.email);

if (adminData) {
  console.log('✅ Admin found in Firestore by email:', adminData);
  
  // ✅ Check if UID matches, if not update Firestore record
  if (adminData.uid !== user.uid) {
    console.log('🔄 UID mismatch, updating Firestore admin record...');
    try {
      await updateDoc(doc(db, 'admins', adminData.id), {
        uid: user.uid,
        lastLogin: new Date().toISOString()
      });
      console.log('✅ Firestore admin UID updated');
    } catch (updateError) {
      console.log('⚠️ Could not update admin UID:', updateError);
    }
  }
  
  // ✅ Successful admin login
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
  
  console.log('✅ Admin login successful');
  router.push('/');
  return;
}
      // ✅ STEP 4: Check if user is vendor
      let vendorDoc = null;
      let vendorData = null;

      // Method 1: Find vendor by UID
      const uidQuery = query(collection(db, 'vendors'), where('uid', '==', user.uid));
      const uidSnapshot = await getDocs(uidQuery);
      
      if (!uidSnapshot.empty) {
        vendorDoc = uidSnapshot.docs[0];
        vendorData = vendorDoc.data();
        console.log('✅ Vendor found by UID:', vendorData);
      } else {
        // Method 2: Find vendor by email
        const emailQuery = query(collection(db, 'vendors'), where('email', '==', formData.email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          vendorDoc = emailSnapshot.docs[0];
          vendorData = vendorDoc.data();
          console.log('✅ Vendor found by email:', vendorData);
          
          // Update old vendor with UID
          await updateDoc(doc(db, 'vendors', vendorDoc.id), {
            uid: user.uid
          });
        }
      }

      if (vendorDoc && vendorData) {
        if (!vendorData.approved) {
          setErrors({ submit: 'Your vendor account is pending admin approval.' });
          setLoading(false);
          return;
        }

        // ✅ Successful vendor login
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
        
        console.log('✅ Vendor login successful');
        router.push('/');
        return;
      }

      // ✅ STEP 5: If no vendor found, check if it's a Firebase Auth admin without Firestore record
      console.log('⚠️ No vendor found, checking for admin privileges...');
      
      // Create a temporary admin session for Firebase Auth admins
      const tempAdminData = {
        uid: user.uid,
        email: user.email,
        name: 'Administrator',
        role: 'admin',
        approved: true
      };

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('user', JSON.stringify(tempAdminData));
      
      console.log('✅ Firebase Auth admin login successful');
      router.push('/');

    } catch (error) {
      console.error('❌ Login error:', error);
      
      if (error.code === 'auth/invalid-credential') {
        setErrors({ 
          submit: 'Invalid email or password. Please check your credentials.' 
        });
        setShowForgotPassword(true);
      } 
      else if (error.code === 'auth/user-not-found') {
        setErrors({ submit: 'No account found with this email. Please register or contact admin.' });
      }
      else if (error.code === 'auth/wrong-password') {
        setErrors({ submit: 'Incorrect password. Please try again or reset your password.' });
        setShowForgotPassword(true);
      }
      else if (error.code === 'auth/too-many-requests') {
        setErrors({ submit: 'Too many failed attempts. Please try again later or reset your password.' });
        setShowForgotPassword(true);
      }
      else {
        setErrors({ submit: 'Login failed. Please try again or contact support.' });
      }
      
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setErrors({ submit: 'Please enter your email address to reset password.' });
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, formData.email);
      alert(`Password reset email sent to ${formData.email}. Please check your inbox.`);
      setShowForgotPassword(false);
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        setErrors({ submit: 'No account found with this email.' });
      } else {
        setErrors({ submit: 'Failed to send reset email. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          
          <div className="col-md-6 col-lg-5">
            {/* Success Message from registration */}
            {message && (
              <div className="alert alert-success text-center mb-4">
                {message}
              </div>
            )}

            <div className="card shadow border-0">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="h3 fw-bold text-primary">Welcome Back</h1>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                  <div className="alert alert-info">
    <small>
      <strong>Vendor Login:</strong> Use the same email and password you used during registration.
    </small>
  </div>

                <form onSubmit={handleSubmit}>
                  {/* Email */}
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
                      autoComplete="email"
                      required
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>

                  {/* Password */}
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password *</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input
                        id="remember"
                        name="remember"
                        type="checkbox"
                        className="form-check-input"
                      />
                      <label htmlFor="remember" className="form-check-label">
                        Remember me
                      </label>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Forgot Password Form */}
                  {showForgotPassword && (
                    <div className="alert alert-info mb-3">
                      <h6>Reset Password</h6>
                      <p className="mb-2">Enter your email to receive a password reset link.</p>
                      <div className="d-flex gap-2">
                        <input
                          type="email"
                          className="form-control"
                          placeholder="Your email"
                          value={formData.email}
                          onChange={handleChange}
                        />
                        <button 
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={handleForgotPassword}
                          disabled={loading}
                        >
                          Send Reset Link
                        </button>
                        <button 
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowForgotPassword(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="alert alert-danger">
                      {errors.submit}
                    </div>
                  )}

                  {/* Important Notice */}
                  <div className="alert alert-warning">
                    <small>
                      <strong>Admin Login:</strong> Use your Firebase Auth credentials, not the config password.
                    </small>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-100 py-2 mb-3"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In to Account'
                    )}
                  </button>

                  {/* Register Link */}
                  <div className="text-center">
                    <p className="text-muted">
                      New to our platform?{' '}
                      <Link href="/register" className="text-decoration-none fw-semibold">
                        Register as Vendor
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