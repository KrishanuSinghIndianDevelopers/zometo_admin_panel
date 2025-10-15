'use client';

import React from 'react';
import Link from 'next/link';
import { useState, useLayoutEffect } from 'react';
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
} from 'react-icons/fa';

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); // initial check
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="bg-white border-end min-vh-100 p-3 shadow-sm d-flex flex-column"
      style={{
        width: isMobile ? '80px' : '250px',
        transition: 'width 0.3s ease',
        overflowX: 'hidden',
      }}
    >
      {/* Logo or Brand */}
      <div className="d-flex align-items-center justify-content-center gap-2 mb-4 p-2">
        <span
          className="fw-bold text-primary text-center"
          style={{ 
            fontSize: isMobile ? '1.2rem' : '1.5rem', 
            transition: 'font-size 0.3s ease',
            lineHeight: '1.2'
          }}
        >
          {isMobile ? 'AR' : 'Love ❤️ Restaurant'}
        </span>
      </div>

      {/* Main Navigation */}
      <ul className="nav flex-column mb-4">
        <SidebarLink icon={<FaHome />} label="Home" href="/" isMobile={isMobile} />
        <SidebarLink icon={<FaTachometerAlt />} label="Dashboard" href="/dashboard" isMobile={isMobile} />
        <SidebarLink icon={<FaBoxOpen />} label="Orders" href="/orders" isMobile={isMobile} />
        <SidebarLink icon={<FaTags />} label="Products" href="/products" isMobile={isMobile} />
        <SidebarLink icon={<FaSlidersH />} label="Category Slider" href="/CategorySlider" isMobile={isMobile} />
        <SidebarLink icon={<FaUsers />} label="Customers" href="/customers" isMobile={isMobile} />
        <SidebarLink icon={<FaMoneyBillWave />} label="Coupons" href="/coupons" isMobile={isMobile} />
        <SidebarLink icon={<FaFileInvoice />} label="Product Categories" href="/categories" isMobile={isMobile} />
      
      </ul>

    

      
    </div>
  );
}

function SidebarLink({ icon, label, href, isMobile }) {
  return (
    <li className="nav-item">
      <Link
        href={href}
        className="nav-link d-flex align-items-center gap-2 mb-2 text-secondary hover-primary"
        style={{
          fontSize: '0.9rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderRadius: '8px',
          padding: '10px 12px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f8f9fa';
          e.currentTarget.style.color = '#0d6efd';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#6c757d';
        }}
      >
        <span style={{ fontSize: '1.1rem', minWidth: '20px' }}>{icon}</span>
        {!isMobile && (
          <span style={{ fontWeight: '500' }}>{label}</span>
        )}
      </Link>
    </li>
  );
}