'use client';

import React from 'react';
import Link from 'next/link';
import { useState, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaChartLine,
  FaUsers,
  FaMoneyBillWave,
  FaFileInvoice,
  FaTags,
  FaComments,
  FaEnvelope,
  FaCog,
  FaMoon,
  FaQuestionCircle,
  FaHome,
  FaSlidersH,
  FaBars,
  FaChevronLeft,
  FaChevronRight,
  FaStore,
  FaUserShield
} from 'react-icons/fa';

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse on mobile
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    // Get user data from localStorage
    const getUserData = () => {
      try {
        const userDataStr = localStorage.getItem('user');
        if (userDataStr) {
          const user = JSON.parse(userDataStr);
          setUserData(user);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    };

    handleResize(); // initial check
    getUserData(); // get user data
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarWidth = isCollapsed ? '80px' : '250px';

  // Get display name based on user role
  const getDisplayName = () => {
    if (!userData) return 'Loading...';
    
    if (userData.role === 'admin' || userData.role === 'main_admin') {
      return 'Admin Panel';
    } else if (userData.restaurantName) {
      return userData.restaurantName;
    } else if (userData.name) {
      return userData.name;
    } else if (userData.email) {
      return userData.email.split('@')[0];
    } else {
      return 'Vendor Panel';
    }
  };

  // Get role badge
  const getRoleBadge = () => {
    if (!userData) return null;
    
    const role = userData.role;
    const roleColors = {
      'main_admin': 'danger',
      'admin': 'warning',
      'vendor': 'success',
      'user': 'info'
    };

    const roleLabels = {
      'main_admin': 'Super Admin',
      'admin': 'Admin',
      'vendor': 'Vendor',
      'user': 'User'
    };

    const color = roleColors[role] || 'secondary';
    const label = roleLabels[role] || role;

    return (
      <span className={`badge bg-${color} bg-opacity-10 text-${color} border border-${color} border-opacity-25`}>
        {label}
      </span>
    );
  };

  return (
    <div
      className="bg-white border-end min-vh-100 p-3 shadow-sm d-flex flex-column position-relative"
      style={{
        width: sidebarWidth,
        transition: 'width 0.3s ease',
        overflowX: 'hidden',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="btn btn-light btn-sm position-absolute"
        style={{
          top: '20px',
          right: '-12px',
          zIndex: 1000,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          border: '2px solid #dee2e6',
        }}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <FaChevronRight size={10} />
        ) : (
          <FaChevronLeft size={10} />
        )}
      </button>

{/* User/Restaurant Info */}
<div 
  className="text-center mb-4 pb-3 border-bottom position-relative overflow-hidden"
  style={{
    background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
    margin: '-12px -12px 20px -12px',
    padding: '20px 12px 15px 12px',
    borderRadius: '12px',
    border: 'none'
  }}
>
  {/* Animated background elements */}
  <div 
    className="position-absolute top-0 start-0 w-100 h-100"
    style={{
      background: 'radial-gradient(circle at 20% 80%, rgba(33, 150, 243, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(156, 39, 176, 0.1) 0%, transparent 50%)',
      animation: 'float 6s ease-in-out infinite'
    }}
  />
  
  <div className="d-flex justify-content-center mb-3 position-relative">
    <div 
      className="rounded-circle d-flex align-items-center justify-content-center position-relative"
      style={{
        width: '70px',
        height: '70px',
        fontSize: '1.5rem',
        background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
        boxShadow: '0 8px 25px rgba(66, 165, 245, 0.3)',
        cursor: 'pointer',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        overflow: 'hidden',
        border: '3px solid rgba(255, 255, 255, 0.8)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
        e.currentTarget.style.boxShadow = '0 12px 35px rgba(66, 165, 245, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(66, 165, 245, 0.3)';
      }}
    >
      {/* Animated background particles */}
      <div 
        className="position-absolute w-100 h-100"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)',
          animation: 'float 3s ease-in-out infinite'
        }}
      />
      
      {/* Main icon with pulse animation */}
      <div 
        className="text-white position-relative"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          animation: 'pulse 2s ease-in-out infinite'
        }}
      >
        {userData?.role === 'admin' || userData?.role === 'main_admin' ? (
          <FaUserShield />
        ) : (
          <FaStore />
        )}
      </div>
      
      {/* Outer ring animation */}
      <div 
        className="position-absolute rounded-circle border-2 border-white"
        style={{
          width: '80px',
          height: '80px',
          border: '2px solid rgba(255,255,255,0.3)',
          animation: 'ripple 2s linear infinite'
        }}
      />
    </div>
  </div>
  
  {!isCollapsed && (
    <>
      {/* Restaurant Name with Typing Animation */}
      <div className="mb-2 position-relative">
        <h6 
          className="fw-bold mb-1 position-relative d-inline-block"
          style={{
            fontSize: '1rem',
            color: '#1565c0',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
            animation: 'slideInUp 0.6s ease-out'
          }}
        >
          <span 
            className="me-2"
            style={{
              display: 'inline-block',
              animation: 'heartbeat 1.5s ease-in-out infinite',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
            }}
          >
           𝐈 ❤️
          </span>
          {userData?.restaurantName || 'Super Admin 😉'}
        </h6>
      </div>

      {/* Email with Fade In Animation */}
      {userData?.email && (
        <div 
          className="text-muted position-relative"
          style={{
            fontSize: '0.75rem',
            animation: 'fadeIn 0.8s ease-out 0.2s both'
          }}
        >
          <div className="d-flex align-items-center justify-content-center gap-2">
            <FaEnvelope size={10} className="text-primary" />
            <span style={{ color: '#546e7a' }}>{userData.email || 'restaurant@gmail.com'}</span>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div 
        className="mt-2 position-relative"
        style={{
          animation: 'bounceIn 0.6s ease-out 0.4s both'
        }}
      >
        <span 
          className="badge px-2 py-1"
          style={{
            background: 'linear-gradient(135deg, #42a5f5 0%, #478ed1 100%)',
            fontSize: '0.65rem',
            fontWeight: '600',
            letterSpacing: '0.5px',
            color: 'white',
            boxShadow: '0 2px 8px rgba(66, 165, 245, 0.3)'
          }}
        >
          {userData?.role === 'admin' || userData?.role === 'main_admin' ? 'ADMIN' : 'ONLINE'}
        </span>
      </div>
    </>
  )}
  
  {isCollapsed && (
    <div 
      className="text-primary position-relative"
      style={{ 
        fontSize: '1.1rem',
        animation: 'pulse 2s ease-in-out infinite'
      }}
    >
      {userData?.role === 'admin' || userData?.role === 'main_admin' ? (
        <FaUserShield />
      ) : (
        <FaStore />
      )}
      {/* Online indicator dot */}
      <div 
        className="position-absolute bg-success rounded-circle"
        style={{
          width: '8px',
          height: '8px',
          top: '-2px',
          right: '-2px',
          animation: 'blink 2s ease-in-out infinite',
          boxShadow: '0 0 4px rgba(76, 175, 80, 0.8)'
        }}
      />
    </div>
  )}
</div>

{/* Add CSS animations */}
<style jsx>{`
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-3px) rotate(1deg); }
    66% { transform: translateY(3px) rotate(-1deg); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
  }
  
  @keyframes ripple {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.1); }
    50% { transform: scale(1); }
    75% { transform: scale(1.05); }
  }
  
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes blink {
    0%, 50% {
      opacity: 1;
      transform: scale(1);
    }
    51%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
  }
`}</style>

      {/* Main Navigation */}
      <ul className="nav flex-column mb-0">
        <SidebarLink 
          icon={<FaHome />} 
          label="Home" 
          href="/" 
          isCollapsed={isCollapsed} 
          isActive={pathname === '/'} 
        />
        <SidebarLink 
          icon={<FaTachometerAlt />} 
          label="Dashboard" 
          href="/dashboard" 
          isCollapsed={isCollapsed} 
          isActive={pathname === '/dashboard'} 
        />
        <SidebarLink 
          icon={<FaBoxOpen />} 
          label="Orders" 
          href="/orders" 
          isCollapsed={isCollapsed} 
          isActive={pathname.startsWith('/orders')} 
        />
        <SidebarLink 
          icon={<FaTags />} 
          label="Products" 
          href="/products" 
          isCollapsed={isCollapsed} 
          isActive={pathname.startsWith('/products')} 
        />
        <SidebarLink 
          icon={<FaUsers />} 
          label="Customers" 
          href="/customers" 
          isCollapsed={isCollapsed} 
          isActive={pathname.startsWith('/customers')} 
        />
        <SidebarLink 
          icon={<FaMoneyBillWave />} 
          label="Coupons" 
          href="/coupons" 
          isCollapsed={isCollapsed} 
          isActive={pathname.startsWith('/coupons')} 
        />
        <SidebarLink 
          icon={<FaFileInvoice />} 
          label="Categories" 
          href="/categories" 
          isCollapsed={isCollapsed} 
          isActive={pathname.startsWith('/categories')} 
        />
        <SidebarLink 
          icon={<FaFileInvoice />} 
          label="Notification" 
          href="/notification" 
          isCollapsed={isCollapsed} 
          isActive={pathname.startsWith('/notification')} 
        />
      </ul>

      {/* Tooltip container for collapsed state */}
      {isCollapsed && (
        <div className="sidebar-tooltips">
          {/* Tooltips will be positioned absolutely */}
        </div>
      )}
    </div>
  );
}

function SidebarLink({ icon, label, href, isCollapsed, isActive }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <li className="nav-item position-relative">
      <Link
        href={href}
        className={`nav-link d-flex align-items-center gap-2 mb-2 ${
          isActive ? 'active-link' : 'text-secondary hover-primary'
        }`}
        style={{
          fontSize: '0.9rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderRadius: '8px',
          padding: '10px 12px',
          transition: 'all 0.2s ease',
          backgroundColor: isActive ? '#e7f1ff' : 'transparent',
          color: isActive ? '#0d6efd' : '#6c757d',
          fontWeight: isActive ? '600' : '500',
          border: isActive ? '1px solid #0d6efd' : '1px solid transparent',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.color = '#0d6efd';
          }
          if (isCollapsed) {
            setShowTooltip(true);
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6c757d';
          } else {
            e.currentTarget.style.backgroundColor = '#e7f1ff';
            e.currentTarget.style.color = '#0d6efd';
          }
          setShowTooltip(false);
        }}
      >
        <span 
          style={{ 
            fontSize: '1.1rem', 
            minWidth: '20px',
            color: isActive ? '#0d6efd' : 'inherit',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {icon}
        </span>
        {!isCollapsed && (
          <span style={{ fontWeight: isActive ? '600' : '500' }}>{label}</span>
        )}
      </Link>

      {/* Tooltip for collapsed state */}
      {isCollapsed && showTooltip && (
        <div
          className="position-absolute bg-dark text-white px-3 py-2 rounded shadow"
          style={{
            left: '100%',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 9999,
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            marginLeft: '8px',
          }}
        >
          {label}
          <div
            className="position-absolute"
            style={{
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              border: '6px solid transparent',
              borderRightColor: '#000',
            }}
          />
        </div>
      )}
    </li>
  );
}