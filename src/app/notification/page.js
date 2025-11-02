'use client';
import Sidebar from '../../components/Sidebar'; 
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc
} from 'firebase/firestore';
import { 
  Bell,
  Search,
  Users,
  Store,
  AlertTriangle,
  Info,
  CheckCircle,
  Megaphone,
  Image as ImageIcon,
  Plus
} from 'lucide-react';

export default function NotificationsList() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

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

  const audienceOptions = [
    { value: 'customers_only', label: 'Customers Only', icon: Users },
    { value: 'vendors_only', label: 'All Vendors', icon: Store }
  ];

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  const checkAuthAndRole = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    setCurrentUser(userObj);
    fetchNotifications(userObj);
  };

  const fetchNotifications = async (userObj) => {
    try {
      setLoading(true);
      
      const isAdmin = userObj?.role === 'admin' || userObj?.role === 'main_admin';
      
      let notificationsData = [];

      try {
        const q = query(
          collection(db, 'notifications'),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const allNotifications = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        if (isAdmin) {
          notificationsData = allNotifications;
        } else {
          const userEmail = userObj.email || userObj.userId;
          notificationsData = allNotifications.filter(notification => {
            const isVisible = 
              notification.targetAudience === 'customers_only' ||
              notification.targetAudience === 'vendors_only' ||
              notification.createdBy === userEmail;
            
            return isVisible;
          });
        }
      } catch (error) {
        console.error('Error with query:', error);
        const querySnapshot = await getDocs(collection(db, 'notifications'));
        const allNotifications = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        if (isAdmin) {
          notificationsData = allNotifications;
        } else {
          const userEmail = userObj.email || userObj.userId;
          notificationsData = allNotifications.filter(notification => 
            notification.targetAudience === 'customers_only' ||
            notification.targetAudience === 'vendors_only' ||
            notification.createdBy === userEmail
          );
        }
        
        notificationsData.sort((a, b) => {
          const dateA = a.timestamp?.toDate() || new Date(0);
          const dateB = b.timestamp?.toDate() || new Date(0);
          return dateB - dateA;
        });
      }
      
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false); 
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      if (!currentUser) return;
      
      const userIdentifier = currentUser.email || currentUser.userId || 'unknown_user';
      const notificationRef = doc(db, 'notifications', notificationId);
      
      const currentReadBy = notifications.find(n => n.id === notificationId)?.readBy || [];
      const updatedReadBy = [...currentReadBy, userIdentifier];
      
      await updateDoc(notificationRef, {
        readBy: updatedReadBy
      });
      
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, readBy: updatedReadBy }
          : notif
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const isNotificationRead = (notification) => {
    if (!currentUser) return false;
    const userIdentifier = currentUser.email || currentUser.userId;
    return notification.readBy?.includes(userIdentifier);
  };

  const isNotificationExpired = (notification) => {
    if (!notification.expiryDate) return false;
    return notification.expiryDate.toDate() < new Date();
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesAudience = filterAudience === 'all' || notification.targetAudience === filterAudience;
    const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;

    return matchesSearch && matchesType && matchesAudience && matchesPriority;
  });

  const getTypeIcon = (type) => {
    const typeConfig = notificationTypes.find(nt => nt.value === type);
    const IconComponent = typeConfig ? typeConfig.icon : Info;
    return <IconComponent size={16} />;
  };

  const getAudienceIcon = (audience) => {
    switch (audience) {
      case 'customers_only':
        return <Users size={14} />;
      case 'vendors_only':
        return <Store size={14} />;
      default:
        return <Users size={14} />;
    }
  };

  const getAudienceLabel = (audience) => {
    const audienceConfig = audienceOptions.find(a => a.value === audience);
    return audienceConfig ? audienceConfig.label : audience;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="d-flex" style={{ minHeight: '100vh', overflowX: 'hidden' }}>
        <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
          <Sidebar />
        </div>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const isMainAdmin = currentUser.role === 'main_admin';
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'main_admin';

  return (
    <div className="d-flex" style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1" style={{ overflowX: 'auto' }}>
        {/* Header - Admin ko create button dikhega */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                {isMainAdmin ? 'All Notifications' : 'My Notifications'}
              </h2>
              <p className="text-muted mb-0">
                {isMainAdmin ? 'Manage all system notifications' : 'View your notifications'}
              </p>
            </div>
            {/* ONLY ADMIN CAN SEE CREATE BUTTON */}
            {isAdmin && (
              <button
                className="btn btn-success d-flex align-items-center gap-2"
                onClick={() => router.push('/notification/create')}
              >
                <Plus size={18} />
                Create Notification
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-bottom bg-light">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Search</label>
              <div className="input-group">
                <span className="input-group-text">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold">Type</label>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                {notificationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold">Audience</label>
              <select
                className="form-select"
                value={filterAudience}
                onChange={(e) => setFilterAudience(e.target.value)}
              >
                <option value="all">All Audience</option>
                {audienceOptions.map(audience => (
                  <option key={audience.value} value={audience.value}>{audience.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold">Priority</label>
              <select
                className="form-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                {priorityOptions.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <div className="d-flex flex-column gap-1">
                <span className="badge bg-primary bg-opacity-10 text-primary text-center">
                  Total: {filteredNotifications.length}
                </span>
                <span className="badge bg-success bg-opacity-10 text-success text-center">
                  Unread: {filteredNotifications.filter(n => !isNotificationRead(n)).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="p-4">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-0">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-5">
                  <Bell size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">No Notifications Found</h5>
                  <p className="text-muted">
                    {searchTerm || filterType !== 'all' || filterAudience !== 'all' || filterPriority !== 'all'
                      ? 'Try adjusting your filters or search terms'
                      : 'No notifications available'
                    }
                  </p>
                  {/* Admin ke liye create button empty state mein bhi */}
                  {isAdmin && (
                    <button
                      className="btn btn-success d-flex align-items-center gap-2 mx-auto mt-3"
                      onClick={() => router.push('/notification/create')}
                    >
                      <Plus size={18} />
                      Create First Notification
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th scope="col" style={{ width: '60px' }}>Type</th>
                        <th scope="col">Title & Message</th>
                        <th scope="col" style={{ width: '100px' }}>Image</th>
                        <th scope="col" style={{ width: '100px' }}>Priority</th>
                        <th scope="col" style={{ width: '120px' }}>Audience</th>
                        <th scope="col" style={{ width: '150px' }}>Created</th>
                        <th scope="col" style={{ width: '150px' }}>Expires</th>
                        <th scope="col" style={{ width: '80px' }}>Status</th>
                        <th scope="col" style={{ width: '80px' }}>Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNotifications.map((notification) => {
                        const isRead = isNotificationRead(notification);
                        const isExpired = isNotificationExpired(notification);
                        const typeConfig = notificationTypes.find(nt => nt.value === notification.type);
                        const priorityConfig = priorityOptions.find(p => p.value === notification.priority);

                        return (
                          <tr 
                            key={notification.id} 
                            className={!isRead ? 'table-active' : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => !isRead && markAsRead(notification.id)}
                          >
                            <td>
                              <div className={`text-${typeConfig?.color}`}>
                                {getTypeIcon(notification.type)}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-column">
                                <strong className="text-dark">{notification.title}</strong>
                                <small className="text-muted">
                                  {notification.message}
                                </small>
                              </div>
                            </td>
                            <td>
                              {notification.imageUrl ? (
                                <img 
                                  src={notification.imageUrl} 
                                  alt="Notification" 
                                  className="img-fluid rounded border"
                                  style={{ 
                                    width: '80px', 
                                    height: '60px', 
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(notification.imageUrl, '_blank');
                                  }}
                                />
                              ) : (
                                <span className="text-muted">No Image</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge bg-${priorityConfig?.color} bg-opacity-10 text-${priorityConfig?.color}`}>
                                {notification.priority?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center gap-1">
                                {getAudienceIcon(notification.targetAudience)}
                                <small>{getAudienceLabel(notification.targetAudience)}</small>
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">
                                {formatDate(notification.timestamp)}
                              </small>
                            </td>
                            <td>
                              <small className={isExpired ? 'text-danger' : 'text-muted'}>
                                {notification.expiryDate ? formatDate(notification.expiryDate) : 'No expiry'}
                              </small>
                            </td>
                            <td>
                              {isExpired ? (
                                <span className="badge bg-secondary">Expired</span>
                              ) : notification.isActive ? (
                                <span className="badge bg-success">Active</span>
                              ) : (
                                <span className="badge bg-warning">Inactive</span>
                              )}
                            </td>
                            <td>
                              <span className={isRead ? 'text-success' : 'text-warning'}>
                                {isRead ? '✓ Read' : '● Unread'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}