'use client';
import { ADMIN_CONFIG } from '../../config/admin';
import Sidebar from '../../components/Sidebar'; 
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from 'next/navigation';

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [activeTab, setActiveTab] = useState('approved'); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // ✅ Check Admin Access
  useEffect(() => {
    const checkAuthAndAccess = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userData = localStorage.getItem('user');

      if (!isLoggedIn || !userData) {
        router.push('/login');
        return;
      }

      const userObj = JSON.parse(userData);
      setUser(userObj);

      // ✅ STRICT ADMIN ACCESS CHECK
      if (userObj.role !== 'main_admin' && userObj.email !== ADMIN_CONFIG.EMAIL) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      loadVendors();
    };

    checkAuthAndAccess();
  }, [router]);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const vendorsRef = collection(db, 'vendors');

      // Approved vendors
      const approvedQuery = query(vendorsRef, where('approved', '==', true));
      const approvedSnap = await getDocs(approvedQuery);
      const approvedList = approvedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Pending vendors
      const pendingQuery = query(vendorsRef, where('approved', '==', false));
      const pendingSnap = await getDocs(pendingQuery);
      const pendingList = pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setVendors(approvedList);
      setPendingVendors(pendingList);

    } catch (error) {
      console.error("Error loading vendors:", error);
      setVendors([]);
      setPendingVendors([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SINGLE VERSION: Generate secure password function
  const generateSecurePassword = () => {
    const length = 12;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%";
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = "";
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill remaining characters
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

const handleApproveVendor = async (vendorId) => {
  const vendor = pendingVendors.find(v => v.id === vendorId);
  if (!vendor) {
    alert('Vendor not found');
    return;
  }

  console.log('🔄 Starting vendor approval for:', vendor.email);

  try {
    // ✅ STEP 1: Check if vendor has a valid password
    if (!vendor.password || vendor.password.length < 6) {
      alert('❌ Vendor password is invalid. Please ask vendor to register with proper password.');
      return;
    }

    console.log('🔄 Using vendor original password');

    // ✅ STEP 2: Check if email already exists in Firebase Auth
    let signInMethods = [];
    try {
      signInMethods = await fetchSignInMethodsForEmail(auth, vendor.email);
      console.log('Sign-in methods found:', signInMethods);
    } catch (error) {
      console.log('⚠️ Could not check existing email:', error);
    }

    let uid;
    
    if (signInMethods.length > 0) {
      // ✅ Email already exists - just approve in Firestore
      console.log('✅ Vendor email already exists in Firebase Auth');
      
      await updateDoc(doc(db, 'vendors', vendorId), {
        approved: true,
        status: 'Active',
        approvedAt: new Date().toISOString(),
      });

      const updatedVendor = { 
        ...vendor, 
        approved: true, 
        status: 'Active'
      };
      
      setVendors(prev => [...prev, updatedVendor]);
      setPendingVendors(prev => prev.filter(v => v.id !== vendorId));

      alert(`✅ ${vendor.name} approved!\nVendor can login with existing credentials.`);
      return;
    }

    // ✅ STEP 3: Create new Firebase Auth account
    console.log('🔄 Creating new Firebase Auth user...');
    
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      vendor.email, 
      vendor.password  // Use vendor's original password
    );
    
    uid = userCredential.user.uid;
    console.log('✅ Firebase Auth user created with UID:', uid);

    // ✅ STEP 4: Update Firestore vendor document
    const vendorUpdateData = {
      approved: true,
      status: 'Active',
      approvedAt: new Date().toISOString(),
      uid: uid,
      // Keep all existing vendor data
      name: vendor.name,
      restaurantName: vendor.restaurantName,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      createdAt: vendor.createdAt || new Date().toISOString(),
      role: 'vendor',
    };

    await updateDoc(doc(db, 'vendors', vendorId), vendorUpdateData);
    console.log('✅ Vendor document updated in Firestore');

    // ✅ STEP 5: Update local state
    const updatedVendor = { 
      ...vendor, 
      ...vendorUpdateData,
      id: vendorId
    };
    
    setVendors(prev => [...prev, updatedVendor]);
    setPendingVendors(prev => prev.filter(v => v.id !== vendorId));

    // ✅ STEP 6: Show success message
    alert(`✅ ${vendor.name} approved successfully!\n\nVendor can now login with their registered email and password.`);

  } catch (error) {
    console.error('❌ Error in vendor approval:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      // Fallback: Approve without creating auth account
      await handleApproveWithoutAuth(vendorId, vendor);
    } 
    else if (error.code === 'auth/invalid-email') {
      alert('❌ Invalid email format. Please check the vendor email address.');
    }
    else if (error.code === 'auth/weak-password') {
      alert('❌ Vendor password is too weak. Please ask vendor to register with stronger password.');
    }
    else {
      alert(`❌ Error: ${error.message}\nTrying alternative approval...`);
      await handleApproveWithoutAuth(vendorId, vendor);
    }
  }
};
  // ✅ SINGLE VERSION: Approve without Firebase Auth
  const handleApproveWithoutAuth = async (vendorId, vendor) => {
    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        approved: true,
        status: 'Active',
        approvedAt: new Date().toISOString(),
      });

      const updatedVendor = { 
        ...vendor, 
        approved: true, 
        status: 'Active'
      };
      
      setVendors(prev => [...prev, updatedVendor]);
      setPendingVendors(prev => prev.filter(v => v.id !== vendorId));

      alert(`✅ ${vendor.name} approved!\n\n⚠️ Note: The vendor needs manual Firebase Auth setup.\nContact support for assistance.`);

    } catch (error) {
      console.error('❌ Error in fallback approval:', error);
      alert('❌ Error updating vendor status.');
    }
  };

  const handleRejectVendor = async (vendorId) => {
    const vendorToReject = pendingVendors.find(v => v.id === vendorId);
    
    if (vendorToReject && confirm(`Are you sure you want to reject ${vendorToReject.name}'s application?`)) {
      try {
        await updateDoc(doc(db, 'vendors', vendorId), {
          status: 'Rejected',
          rejectedAt: new Date().toISOString()
        });

        setPendingVendors(prev => prev.filter(v => v.id !== vendorId));
        alert(`Vendor ${vendorToReject.name} has been rejected.`);
      } catch (error) {
        console.error('Error rejecting vendor:', error);
        alert('Error rejecting vendor.');
      }
    }
  };

  const handleSuspendVendor = async (vendorId) => {
    const vendorToSuspend = vendors.find(v => v.id === vendorId);
    
    if (vendorToSuspend && confirm(`Are you sure you want to suspend ${vendorToSuspend.name}?`)) {
      try {
        await updateDoc(doc(db, 'vendors', vendorId), {
          status: 'Suspended',
          suspendedAt: new Date().toISOString()
        });

        const updatedVendors = vendors.map(vendor => 
          vendor.id === vendorId 
            ? { ...vendor, status: 'Suspended' }
            : vendor
        );
        setVendors(updatedVendors);
        
        alert(`Vendor ${vendorToSuspend.name} has been suspended.`);
      } catch (error) {
        console.error('Error suspending vendor:', error);
        alert('Error suspending vendor.');
      }
    }
  };

  const handleActivateVendor = async (vendorId) => {
    const vendorToActivate = vendors.find(v => v.id === vendorId);
    
    if (vendorToActivate && confirm(`Are you sure you want to activate ${vendorToActivate.name}?`)) {
      try {
        await updateDoc(doc(db, 'vendors', vendorId), {
          status: 'Active'
        });

        const updatedVendors = vendors.map(vendor => 
          vendor.id === vendorId 
            ? { ...vendor, status: 'Active' }
            : vendor
        );
        setVendors(updatedVendors);
        
        alert(`Vendor ${vendorToActivate.name} has been activated.`);
      } catch (error) {
        console.error('Error activating vendor:', error);
        alert('Error activating vendor.');
      }
    }
  };


  const handleDeleteVendor = async (vendorId) => {
    const vendorToDelete = vendors.find(v => v.id === vendorId);
    
    if (vendorToDelete && confirm(`Are you sure you want to delete ${vendorToDelete.name} permanently?`)) {
      try {
        await updateDoc(doc(db, 'vendors', vendorId), {
          status: 'Deleted',
          deletedAt: new Date().toISOString()
        });

        setVendors(prev => prev.filter(v => v.id !== vendorId));
        alert(`Vendor ${vendorToDelete.name} has been deleted.`);
      } catch (error) {
        console.error('Error deleting vendor:', error);
        alert('Error deleting vendor.');
      }
    }
  };

  // Filter vendors based on search
  const filteredApprovedVendors = vendors.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingVendors = pendingVendors.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.restaurantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active': return 'bg-success';
      case 'Suspended': return 'bg-danger';
      case 'Pending': return 'bg-warning';
      case 'Rejected': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  // ✅ Show Access Denied Message
  if (accessDenied) {
    return (
      <div className="min-vh-100 bg-light">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-3 col-lg-2 d-md-block bg-white border-end">
              <Sidebar />
            </div>
            <div className="col-md-9 col-lg-10 px-md-4">
              <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="text-center">
                  <div className="alert alert-danger">
                    <h4>🚫 Access Denied</h4>
                    <p>You don't have permission to access the vendor management panel.</p>
                    <p className="mb-0">Only main administrators can manage vendors.</p>
                  </div>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="btn btn-primary mt-3"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <div className="col-md-3 col-lg-2 d-md-block bg-white border-end">
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="col-md-9 col-lg-10 px-md-4">
            {/* Header Section */}
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
              <h1 className="h2">
                Vendor Management
                <span className="badge bg-danger ms-2 fs-6">
                  <i className="bi bi-shield-check me-1"></i>
                  Admin Access
                </span>
              </h1>
              <div className="btn-toolbar mb-2 mb-md-0">
                <button 
                  onClick={() => router.push('/register')}
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Vendor
                </button>
              </div>
            </div>

            {/* Admin Notice */}
            <div className="alert alert-info mb-4">
              <i className="bi bi-shield-check me-2"></i>
              <strong>Admin Panel:</strong> You have full control over vendor approvals and management.
            </div>

           
            {/* Stats Cards */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card border-0 bg-primary text-white">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h4 className="card-title">{vendors.length}</h4>
                        <p className="card-text mb-0">Approved Vendors</p>
                      </div>
                      <div className="flex-shrink-0">
                        <i className="bi bi-check-circle fs-1 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-warning text-dark">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h4 className="card-title">{pendingVendors.length}</h4>
                        <p className="card-text mb-0">Pending Approval</p>
                      </div>
                      <div className="flex-shrink-0">
                        <i className="bi bi-clock fs-1 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-success text-white">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h4 className="card-title">{vendors.length + pendingVendors.length}</h4>
                        <p className="card-text mb-0">Total Vendors</p>
                      </div>
                      <div className="flex-shrink-0">
                        <i className="bi bi-people fs-1 opacity-75"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="card mb-4">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
                      onClick={() => setActiveTab('approved')}
                    >
                      <i className="bi bi-check-circle me-2"></i>
                      Approved Vendors ({vendors.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pending')}
                    >
                      <i className="bi bi-clock me-2"></i>
                      Pending Approval ({pendingVendors.length})
                    </button>
                  </li>
                </ul>
              </div>
              
              <div className="card-body">
                {/* Search Bar */}
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Search ${activeTab} vendors...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Approved Vendors Table */}
                {activeTab === 'approved' && (
                  <div className="table-responsive">
                    {filteredApprovedVendors.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-people display-1 text-muted"></i>
                        <h4 className="text-muted mt-3">No Approved Vendors</h4>
                        <p className="text-muted">Approved vendors will appear here.</p>
                        <button 
                          onClick={() => router.push('/register')}

                          className="btn btn-primary mt-3"
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Add Your First Vendor
                        </button>
                      </div>
                    ) : (
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Vendor Name</th>
                            <th>Restaurant</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApprovedVendors.map((vendor) => (
                            <tr key={vendor.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                                    {vendor.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <div className="fw-bold">{vendor.name}</div>
                                    <small className="text-muted">
                                      Approved: {vendor.approvedAt ? new Date(vendor.approvedAt).toLocaleDateString() : 'N/A'}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td className="fw-semibold">{vendor.restaurantName}</td>
                              <td>{vendor.phone}</td>
                              <td>{vendor.email}</td>
                              <td>
                                <span className={`badge ${getStatusBadge(vendor.status)}`}>
                                  {vendor.status === 'Active' && <i className="bi bi-check-circle me-1"></i>}
                                  {vendor.status === 'Suspended' && <i className="bi bi-pause-circle me-1"></i>}
                                  {vendor.status}
                                </span>
                              </td>
                              <td>
                                <div className="btn-group">
                                  <button className="btn btn-sm btn-outline-primary" title="View">
                                    <i className="bi bi-eye"></i>
                                  </button>
                                  <button className="btn btn-sm btn-outline-secondary" title="Edit">
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  {vendor.status === 'Active' ? (
                                    <button 
                                      className="btn btn-sm btn-outline-warning" 
                                      title="Suspend"
                                      onClick={() => handleSuspendVendor(vendor.id)}
                                    >
                                      <i className="bi bi-pause-circle"></i>
                                    </button>
                                  ) : (
                                    <button 
                                      className="btn btn-sm btn-outline-success" 
                                      title="Activate"
                                      onClick={() => handleActivateVendor(vendor.id)}
                                    >
                                      <i className="bi bi-play-circle"></i>
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-sm btn-outline-danger" 
                                    title="Delete"
                                    onClick={() => handleDeleteVendor(vendor.id)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Pending Vendors Table */}
                {activeTab === 'pending' && (
                  <div className="table-responsive">
                    {filteredPendingVendors.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-inbox display-1 text-muted"></i>
                        <h4 className="text-muted mt-3">No Pending Applications</h4>
                        <p className="text-muted">All vendor applications have been processed.</p>
                      </div>
                    ) : (
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Vendor Name</th>
                            <th>Restaurant</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Applied On</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPendingVendors.map((vendor) => (
                            <tr key={vendor.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="rounded-circle bg-warning text-dark d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                                    {vendor.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                    <div className="fw-bold">{vendor.name}</div>
                                    <small className="text-muted">Waiting for approval</small>
                                  </div>
                                </div>
                              </td>
                              <td className="fw-semibold">{vendor.restaurantName}</td>
                              <td>{vendor.phone}</td>
                              <td>{vendor.email}</td>
                              <td>
                                <small className="text-muted">
                                  {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}
                                </small>
                              </td>
                              <td>
                                <div className="btn-group">
                                  <button 
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleApproveVendor(vendor.id)}
                                    title="Approve Vendor"
                                  >
                                    <i className="bi bi-check-lg"></i> Approve
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleRejectVendor(vendor.id)}
                                    title="Reject Vendor"
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                  <button className="btn btn-sm btn-outline-primary" title="View Details">
                                    <i className="bi bi-eye"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

