'use client';

import Sidebar from '../../components/Sidebar'; 
import { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Users, Search, Eye, MessageSquare, Star, AlertCircle, ThumbsUp, Mail, Phone, Calendar, UserCheck, UserCog, Store, Menu } from 'lucide-react';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [viewType, setViewType] = useState('all');
  const [userRole, setUserRole] = useState('');
  const [vendorNames, setVendorNames] = useState({});
  const [currentVendorId, setCurrentVendorId] = useState('');
  const [currentRestaurantName, setCurrentRestaurantName] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check authentication and set user role
  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = localStorage.getItem('user');

        if (!isLoggedIn || !userData) {
          return;
        }

        const userObj = JSON.parse(userData);
        
        // Determine user role
        let role = 'user';
        if (userObj.role === 'admin' || userObj.role === 'main_admin') {
          role = 'admin';
        } else if (userObj.role === 'vendor' || userObj.documentId) {
          role = 'vendor';
          const vendorId = userObj.documentId || userObj.uid;
          setCurrentVendorId(vendorId);
          
          // Fetch restaurant name for current vendor
          try {
            const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
            if (vendorDoc.exists()) {
              const vendorData = vendorDoc.data();
              setCurrentRestaurantName(vendorData.restaurantName || vendorData.name || 'My Restaurant');
            }
          } catch (error) {
            console.error('Error fetching vendor data:', error);
          }
        }
        
        setUserRole(role);
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuthAndRole();
  }, []);

  // Fetch vendor names
  const fetchVendorNames = async (vendorIds) => {
    try {
      const uniqueVendorIds = [...new Set(vendorIds.filter(id => id))];
      const vendorData = {};
      
      for (const vendorId of uniqueVendorIds) {
        try {
          const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
          if (vendorDoc.exists()) {
            const vendor = vendorDoc.data();
            vendorData[vendorId] = vendor.restaurantName || vendor.name || 'Unknown Vendor';
          } else {
            vendorData[vendorId] = 'Vendor Not Found';
          }
        } catch (error) {
          console.error(`Error fetching vendor ${vendorId}:`, error);
          vendorData[vendorId] = 'Error Loading Vendor';
        }
      }
      
      setVendorNames(vendorData);
    } catch (error) {
      console.error('Error fetching vendor names:', error);
    }
  };

  useEffect(() => {
    const fetchFeedbacks = async () => {
      if (!userRole) return;
      if (userRole === 'vendor' && !currentVendorId) return;

      try {
        setLoading(true);
        
        const feedbacksRef = collection(db, 'feedbacks');
        const q = query(feedbacksRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);
        let feedbackData = snapshot.docs.map((doc) => ({ 
          id: doc.id, 
          ...doc.data() 
        }));

        // Apply filters based on user role and view type
        let filteredData = feedbackData;

        if (userRole === 'vendor') {
          // Vendor can see ONLY user feedbacks for their restaurant
          filteredData = feedbackData.filter(feedback => 
            feedback.userType === 'user' && feedback.vendorId === currentVendorId
          );
        } else if (userRole === 'admin') {
          // Admin can filter by view type
          if (viewType === 'vendors') {
            filteredData = feedbackData.filter(feedback => feedback.userType === 'vendor');
          } else if (viewType === 'users') {
            filteredData = feedbackData.filter(feedback => feedback.userType === 'user');
          }
        }

        setFeedbacks(filteredData);
        setFilteredFeedbacks(filteredData);

        // Extract vendor IDs and fetch vendor names
        const vendorIds = filteredData
          .filter(feedback => feedback.vendorId)
          .map(feedback => feedback.vendorId);
        
        if (vendorIds.length > 0) {
          await fetchVendorNames(vendorIds);
        }

      } catch (error) {
        console.error('Error fetching feedbacks:', error);
        setFeedbacks([]);
        setFilteredFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [viewType, userRole, currentVendorId]);

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFeedbacks(feedbacks);
      return;
    }

    const filtered = feedbacks.filter(feedback =>
      feedback.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.userPhone?.includes(searchTerm) ||
      feedback.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendorNames[feedback.vendorId]?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredFeedbacks(filtered);
  }, [searchTerm, feedbacks, vendorNames]);

  // Date formatter
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      let actualDate;
      
      if (date && typeof date.toDate === 'function') {
        actualDate = date.toDate();
      } else {
        actualDate = new Date(date);
      }
      
      if (isNaN(actualDate.getTime())) {
        return 'Invalid Date';
      }
      
      return actualDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ', ' + actualDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
      
    } catch (error) {
      return 'N/A';
    }
  };

  // Rating color
  const getRatingColor = (rating) => {
    if (!rating) return 'secondary';
    if (rating >= 4) return 'success';
    if (rating >= 3) return 'warning';
    return 'danger';
  };

  // Feedback type
  const getFeedbackType = (type) => {
    switch (type) {
      case 'complaint': return { label: 'Complaint', color: 'danger', icon: AlertCircle };
      case 'suggestion': return { label: 'Suggestion', color: 'info', icon: MessageSquare };
      case 'compliment': return { label: 'Compliment', color: 'success', icon: ThumbsUp };
      default: return { label: 'General', color: 'secondary', icon: MessageSquare };
    }
  };

  // User type badge
  const getUserTypeBadge = (userType) => {
    if (userType === 'vendor') {
      return <span className="badge bg-info">Vendor</span>;
    } else {
      return <span className="badge bg-primary">User</span>;
    }
  };

  // Get vendor name by ID
  const getVendorName = (vendorId) => {
    return vendorNames[vendorId] || vendorId || 'N/A';
  };

  // Get current view description
  const getCurrentViewDescription = () => {
    if (userRole === 'vendor') {
      return `Customer Feedbacks for ${currentRestaurantName}`;
    }
    
    switch (viewType) {
      case 'all': return 'All Feedbacks';
      case 'vendors': return 'Vendor Feedbacks Only';
      case 'users': return 'User Feedbacks Only';
      default: return 'All Feedbacks';
    }
  };

  if (loading || !userRole) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">
              {!userRole ? 'Checking authentication...' : 'Loading feedbacks...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar with responsive classes */}
      <div className={`${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} d-none d-lg-flex flex-column`}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar Toggle */}
      <div className="d-lg-none position-fixed top-0 start-0 m-3 z-3">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarCollapsed && (
        <div 
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 z-2"
          onClick={() => setSidebarCollapsed(false)}
        >
          <div 
            className="position-absolute top-0 start-0 h-100 bg-white shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-grow-1 bg-light d-flex flex-column min-vh-100">
        {/* Header - Responsive */}
        <div className="p-3 bg-white border-bottom">
          <div className="row align-items-center">
            <div className="col-12 col-md-8 mb-2 mb-md-0">
              <div className="d-flex flex-column">
                <h2 className="h4 fw-bold text-dark mb-1">Feedback Management</h2>
                <p className="text-muted mb-0 small">
                  {userRole === 'admin' ? 'Manage all customer feedback and reviews' : 'View customer feedbacks for your restaurant'}
                </p>
                <small className="text-muted">
                  Current view: <span className="fw-semibold">{getCurrentViewDescription()}</span>
                </small>
              </div>
            </div>
            <div className="col-12 col-md-4 text-md-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <MessageSquare size={16} className="me-1" />
                {filteredFeedbacks.length} Feedbacks
              </div>
            </div>
          </div>

          {/* Admin View Type Selector - Responsive */}
          {userRole === 'admin' && (
            <div className="row mt-3">
              <div className="col-12">
                <label className="form-label fw-medium text-dark d-block d-md-none">View Type</label>
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${viewType === 'all' ? 'btn-primary' : 'btn-outline-primary'} flex-grow-1`}
                    onClick={() => setViewType('all')}
                  >
                    <span className="d-none d-md-inline"><UserCog size={16} className="me-2" /></span>
                    All
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewType === 'vendors' ? 'btn-info' : 'btn-outline-info'} flex-grow-1`}
                    onClick={() => setViewType('vendors')}
                  >
                    <span className="d-none d-md-inline"><Users size={16} className="me-2" /></span>
                    Vendors
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewType === 'users' ? 'btn-success' : 'btn-outline-success'} flex-grow-1`}
                    onClick={() => setViewType('users')}
                  >
                    <span className="d-none d-md-inline"><UserCheck size={16} className="me-2" /></span>
                    Users
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vendor View Info */}
          {/* {userRole === 'vendor' && (
            <div className="row mt-3">
              <div className="col-12">
                <div className="alert alert-info border-0 py-2">
                  <div className="d-flex align-items-center">
                    <Store size={16} className="me-2 flex-shrink-0" />
                    <div className="flex-grow-1">
                      <strong className="small">Restaurant: {currentRestaurantName}</strong>
                      <br />
                      <small className="text-break">You are viewing customer feedbacks only for your restaurant</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Search - Responsive */}
          <div className="row mt-3">
            <div className="col-12">
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    userRole === 'admin' 
                      ? "Search feedbacks..."
                      : "Search customer feedbacks..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow-1 p-3 overflow-auto">
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-5">
              <MessageSquare size={64} className="text-muted mb-3 opacity-50" />
              <h5 className="fw-semibold text-dark">No feedbacks found</h5>
              <p className="text-muted">
                {searchTerm 
                  ? 'No feedbacks match your search criteria' 
                  : userRole === 'vendor' 
                    ? `No customer feedbacks available for ${currentRestaurantName}`
                    : 'No feedback data available'
                }
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {filteredFeedbacks.map((feedback) => {
                const feedbackType = getFeedbackType(feedback.type);
                const FeedbackTypeIcon = feedbackType.icon;
                
                return (
                  <div key={feedback.id} className="col-12">
                    <div className="card shadow-sm border-0">
                      <div className="card-body">
                        <div className="row align-items-center">
                          {/* User Info - Responsive */}
                          <div className="col-12 col-md-3 mb-3 mb-md-0">
                            <div className="d-flex align-items-center mb-2">
                              <Users size={16} className="text-muted me-2 flex-shrink-0" />
                              <h6 className="fw-bold mb-0 text-break">{feedback.userName}</h6>
                              <span className="ms-2 flex-shrink-0">
                                {getUserTypeBadge(feedback.userType)}
                              </span>
                            </div>
                            <div className="small text-muted">
                              <div className="d-flex align-items-center mb-1">
                                <Phone size={12} className="me-2 flex-shrink-0" />
                                <span className="text-break">{feedback.userPhone}</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <Mail size={12} className="me-2 flex-shrink-0" />
                                <span className="text-break">{feedback.userEmail}</span>
                              </div>
                            </div>
                          </div>

                          {/* Feedback Message - Responsive */}
                          <div className="col-12 col-md-4 mb-3 mb-md-0">
                            <p className="mb-2 text-break">
                              {feedback.message?.length > 100 
                                ? `${feedback.message.substring(0, 100)}...` 
                                : feedback.message
                              }
                            </p>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <FeedbackTypeIcon size={14} className="flex-shrink-0" />
                              <span className={`badge bg-${feedbackType.color} flex-shrink-0`}>
                                {feedbackType.label}
                              </span>
                              {feedback.rating && (
                                <span className={`badge bg-${getRatingColor(feedback.rating)} flex-shrink-0`}>
                                  <Star size={12} className="me-1" />
                                  {feedback.rating}/5
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Date & Vendor Info - Responsive */}
                          <div className="col-12 col-md-3 mb-3 mb-md-0">
                            <div className="d-flex align-items-center text-muted small mb-2">
                              <Calendar size={14} className="me-2 flex-shrink-0" />
                              <span className="text-break">{formatDate(feedback.createdAt)}</span>
                            </div>
                            {feedback.vendorId && userRole === 'admin' && (
                              <div className="d-flex align-items-center text-muted small">
                                <Store size={12} className="me-2 flex-shrink-0" />
                                <span className="text-break">{getVendorName(feedback.vendorId)}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Button - Responsive */}
                          <div className="col-12 col-md-2 text-start text-md-end">
                            <button
                              className="btn btn-sm btn-outline-primary w-100 w-md-auto"
                              data-bs-toggle="modal"
                              data-bs-target="#feedbackDetailsModal"
                              onClick={() => setSelectedFeedback(feedback)}
                            >
                              <Eye size={14} className="me-1" />
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Details Modal */}
      {selectedFeedback && (
        <div className="modal fade" id="feedbackDetailsModal" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Feedback Details - {selectedFeedback.userName}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12 col-md-6 mb-3">
                    <h6 className="fw-semibold text-dark mb-3">
                      {selectedFeedback.userType === 'vendor' ? 'Vendor Information' : 'Customer Information'}
                    </h6>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">
                        {selectedFeedback.userType === 'vendor' ? 'Restaurant Name' : 'Customer Name'}
                      </label>
                      <p className="fw-semibold text-break">{selectedFeedback.userName}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Phone Number</label>
                      <p className="fw-semibold text-success text-break">{selectedFeedback.userPhone}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Email Address</label>
                      <p className="fw-semibold text-break">{selectedFeedback.userEmail}</p>
                    </div>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">User Type</label>
                      <div>
                        {getUserTypeBadge(selectedFeedback.userType)}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6 mb-3">
                    <h6 className="fw-semibold text-dark mb-3">Feedback Information</h6>
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Type</label>
                      <div>
                        {(() => {
                          const feedbackType = getFeedbackType(selectedFeedback.type);
                          const Icon = feedbackType.icon;
                          return (
                            <span className={`badge bg-${feedbackType.color}`}>
                              <Icon size={14} className="me-1" />
                              {feedbackType.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    {selectedFeedback.rating && (
                      <div className="mb-2">
                        <label className="fw-medium text-muted small">Rating</label>
                        <div className="d-flex align-items-center gap-2">
                          <Star size={16} className="text-warning" />
                          <span className={`fw-semibold text-${getRatingColor(selectedFeedback.rating)}`}>
                            {selectedFeedback.rating} / 5
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedFeedback.sentiment && (
                      <div className="mb-2">
                        <label className="fw-medium text-muted small">Sentiment</label>
                        <span className={`badge bg-${selectedFeedback.sentiment === 'positive' ? 'success' : selectedFeedback.sentiment === 'negative' ? 'danger' : 'warning'}`}>
                          {selectedFeedback.sentiment}
                        </span>
                      </div>
                    )}
                    <div className="mb-2">
                      <label className="fw-medium text-muted small">Submitted On</label>
                      <p className="fw-semibold">{formatDate(selectedFeedback.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="fw-semibold text-dark mb-3">Feedback Message</h6>
                    <div className="card border-0 bg-light">
                      <div className="card-body">
                        <p className="mb-0 text-break">{selectedFeedback.message}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedFeedback.vendorId && userRole === 'admin' && (
                  <div className="row">
                    <div className="col-12">
                      <h6 className="fw-semibold text-dark mb-3">Associated Restaurant</h6>
                      <div className="card border-0 bg-info bg-opacity-10">
                        <div className="card-body">
                          <div className="d-flex align-items-center gap-2">
                            <Store size={16} className="text-info" />
                            <div>
                              <p className="mb-0 fw-semibold text-break">{getVendorName(selectedFeedback.vendorId)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sidebar-expanded {
          width: 250px;
          min-width: 250px;
          transition: width 0.3s ease;
        }
        .sidebar-collapsed {
          width: 0;
          min-width: 0;
          overflow: hidden;
          transition: width 0.3s ease;
        }
        @media (max-width: 991.98px) {
          .sidebar-expanded {
            width: 280px;
          }
        }
      `}</style>
    </div>
  );
}