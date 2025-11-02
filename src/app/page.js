'use client';

import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { useState, useEffect } from 'react';
import { ADMIN_CONFIG } from '../config/admin';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      if (isLoggedIn && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          
          // Fetch unread notifications count
          await fetchUnreadNotificationsCount(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('user');
          router.push('/login');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread notifications count for vendor
  const fetchUnreadNotificationsCount = async (userObj) => {
    try {
      const vendorUid = userObj.documentId || userObj.uid;
      
      // Get all notifications for vendors
      const q = query(
        collection(db, 'notifications'),
        where('targetAudience', '==', 'vendors_only'),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const allNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter notifications for this specific vendor and count unread
      const vendorNotifications = allNotifications.filter(notification => {
        const hasVendorId = notification.vendorIds && 
                           Array.isArray(notification.vendorIds) && 
                           notification.vendorIds.includes(vendorUid);
        
        return hasVendorId;
      });

      // Count unread notifications
      const unreadNotifications = vendorNotifications.filter(
        n => !n.readBy?.includes(vendorUid)
      );

      setUnreadCount(unreadNotifications.length);
      console.log('Unread notifications count:', unreadNotifications.length);

    } catch (error) {
      console.error('Error fetching notifications count:', error);
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  };

  // Check if user is main admin - USING CENTRALIZED CONFIG
  const isMainAdmin = user && user.email === ADMIN_CONFIG.EMAIL;
  
  console.log('User:', user);
  console.log('Is Main Admin:', isMainAdmin);
  console.log('Unread Notifications:', unreadCount);

  // Base cards for all users
  const baseCards = [
    { title: 'Monthly Report', icon: 'bi-heart-pulse-fill', color: 'bg-light-purple', link: '/dashboard' },
    { title: 'Payments', icon: 'bi-cash-coin', color: 'bg-light-blue', link: '/orders' },
    { title: 'Products', icon: 'bi-box-seam', color: 'bg-light-pink', link: '/products' },
    { title: 'Image Sliders', icon: 'bi-image-fill', color: 'bg-light-green', link: '/sliders' },
    { title: 'Coupons', icon: 'bi-ticket-perforated-fill', color: 'bg-light-yellow', link: '/coupons' },
    { title: 'Feed Back', icon: 'bi-person-lines-fill', color: 'bg-light-pink', link: '/contacts' },
    { title: 'Category', icon: 'bi-newspaper', color: 'bg-light-green', link: '/categories' },
    { title: 'Category Slider', icon: 'bi-images', color: 'bg-light-cyan', link: '/CategorySlider' },
    { 
      title: 'My Account', 
      icon: 'bi-person-circle', 
      color: 'bg-light-orange', 
      link: '/myaccount',
      badge: unreadCount > 0 ? unreadCount : null // Add badge count
    },
    { title: 'Logout', icon: 'bi-box-arrow-right', color: 'bg-light-red', action: handleLogout },
  ];

  // All Vendors card - only for main admin
  const allVendorsCard = { 
    title: 'All Vendors', 
    icon: 'bi-people-fill', 
    color: 'bg-light-purple', 
    link: '/allvendors' 
  };

  // Combine cards based on user role
  const cards = isMainAdmin 
    ? [...baseCards, allVendorsCard] 
    : baseCards;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      <div className="flex-grow-1 p-4">
        {/* Welcome Message with Admin Badge */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="mb-2 fw-bold">Dashboard</h1>
            <p className="text-muted mb-0">
              Welcome back{user ? `, ${user.name || user.email}` : ''}!
              {isMainAdmin && (
                <span className="badge bg-danger ms-2">
                  <i className="bi bi-shield-check me-1"></i>
                  Main Admin
                </span>
              )}
            </p>
          </div>
          
          {/* Notification Bell in Header */}
          {/* {unreadCount > 0 && (
            <div className="position-relative">
              <button 
                className="btn btn-outline-primary position-relative"
                onClick={() => router.push('/myaccount')}
              >
                <i className="bi bi-bell-fill"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount}
                    <span className="visually-hidden">unread messages</span>
                  </span>
                )}
              </button>
            </div>
          )} */}
        </div>

        {/* Admin Only Notice */}
        {isMainAdmin && (
          <div className="alert alert-info mb-4">
            <i className="bi bi-shield-check me-2"></i>
            <strong>Admin Access:</strong> You have full access to vendor management and administrative features.
          </div>
        )}

        <div className="row g-4">
          {cards.map((card, index) => (
            <div className="col-12 col-md-6 col-lg-4" key={index}>
              {card.link ? (
                <Link href={card.link} className="text-decoration-none">
                  <div className={`card h-100 text-center shadow ${card.color} border-0 rounded-4 hover-zoom position-relative`}>
                    
                    {/* Notification Badge for My Account Card */}
                    {card.badge && card.badge > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" 
                            style={{ fontSize: '0.7rem', zIndex: 1 }}>
                        {card.badge}
                        <span className="visually-hidden">unread messages</span>
                      </span>
                    )}
                    
                    <div className="card-body d-flex flex-column justify-content-center align-items-center position-relative">
                      
                      {/* Notification Icon for My Account Card */}
                      {card.title === 'My Account' && unreadCount > 0 && (
                        <div className="position-absolute top-0 end-0 m-2">
                          <i className="bi bi-bell-fill text-warning" style={{ fontSize: '1.2rem' }}></i>
                        </div>
                      )}
                      
                      <i className={`bi ${card.icon} mb-3`} style={{ fontSize: '2rem', color: '#6c63ff' }}></i>
                      <h5 className="card-title fw-semibold text-dark">{card.title}</h5>
                      
                      {/* Show notification text for My Account */}
                      {card.title === 'My Account' && unreadCount > 0 && (
                        <small className="text-warning fw-bold mt-1">
                          {unreadCount} new message{unreadCount > 1 ? 's' : ''}
                        </small>
                      )}
                      
                      {/* Show admin badge for All Vendors card */}
                      {card.title === 'All Vendors' && isMainAdmin && (
                        <small className="text-muted">(Admin Only)</small>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                <div
                  onClick={card.action}
                  className={`card h-100 text-center shadow ${card.color} border-0 rounded-4 hover-zoom cursor-pointer`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body d-flex flex-column justify-content-center align-items-center">
                    <i className={`bi ${card.icon} mb-3`} style={{ fontSize: '2rem', color: '#6c63ff' }}></i>
                    <h5 className="card-title fw-semibold text-dark">{card.title}</h5>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Notification Summary Alert */}
        {unreadCount > 0 && (
          <div className="text-center mt-4">
            <div className="alert alert-warning d-inline-block">
              <i className="bi bi-bell-fill me-2"></i>
              <strong>You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}!</strong>
              <span className="ms-2">
                Go to <Link href="/myaccount" className="alert-link">My Account</Link> to view them.
              </span>
            </div>
          </div>
        )}

        {/* Message for non-admin users */}
        {/* {!isMainAdmin && user && unreadCount === 0 && (
          <div className="text-center mt-5">
            <div className="alert alert-warning d-inline-block">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Vendor Access:</strong> You have vendor-level access. Some administrative features are restricted.
            </div>
          </div>
        )} */}

        <style jsx>{`
          .bg-light-purple { background-color: #f3e8ff; }
          .bg-light-blue { background-color: #e0f7ff; }
          .bg-light-pink { background-color: #ffe4ec; }
          .bg-light-green { background-color: #e6ffe6; }
          .bg-light-yellow { background-color: #fff9cc; }
          .bg-light-orange { background-color: #fff3e0; }
          .bg-light-red { background-color: #ffebee; }
          .bg-light-cyan { background-color: #e0f7fa; }
          .hover-zoom { transition: transform 0.3s ease; }
          .hover-zoom:hover { transform: scale(1.05); }
          
          /* Pulse animation for notification badge */
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          
          .bg-danger {
            animation: pulse 2s infinite;
          }
        `}</style>
      </div>
    </div>
  );
}