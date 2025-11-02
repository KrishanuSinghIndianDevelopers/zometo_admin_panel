'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ADMIN_CONFIG } from '../config/admin';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    const checkAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userData = localStorage.getItem('user');
      
      if (isLoggedIn && userData) {
        // User is logged in
        try {
          const user = JSON.parse(userData);
          
          // Special case: Allow admin to access register page to add vendors
          if (isPublicRoute && pathname === '/register' && user.email === ADMIN_CONFIG.EMAIL) {
            // Admin can access register page
            setLoading(false);
            return;
          }
          
          // For all other public routes, redirect logged-in users to home
          if (isPublicRoute) {
            router.push('/');
            return;
          }
          
          // Allow access to protected routes
          setLoading(false);
        } catch (error) {
          // If user data is invalid, clear it and show login page
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('user');
          if (!isPublicRoute) {
            router.push('/login');
            return;
          }
          setLoading(false);
        }
      } else {
        // User is not logged in
        if (!isPublicRoute) {
          // If not logged in and trying to access protected route, redirect to login
          router.push('/login');
          return;
        }
        // Allow access to public routes
        setLoading(false);
      }
    };

    // Small delay to ensure proper check
    const timer = setTimeout(() => {
      checkAuth();
    }, 50);

    return () => clearTimeout(timer);
  }, [router, pathname, isPublicRoute]);

  if (loading) {
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

  return <>{children}</>;
}