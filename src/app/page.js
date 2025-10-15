'use client';

import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';

export default function HomePage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err.message);
    }
  };

  const cards = [
    { title: 'Monthly Report', icon: 'bi-heart-pulse-fill', color: 'bg-light-purple', link: '/monthly-report' },
    { title: 'Payments', icon: 'bi-cash-coin', color: 'bg-light-blue', link: '/payments' },
    { title: 'Products', icon: 'bi-box-seam', color: 'bg-light-pink', link: '/products' },
    { title: 'Image Sliders', icon: 'bi-image-fill', color: 'bg-light-green', link: '/sliders' },
    { title: 'Coupons', icon: 'bi-ticket-perforated-fill', color: 'bg-light-yellow', link: '/coupons' },
    { title: 'Contacts', icon: 'bi-person-lines-fill', color: 'bg-light-pink', link: '/contacts' },
    { title: 'Category', icon: 'bi-newspaper', color: 'bg-light-green', link: '/categories' },
    { title: 'Logout', icon: 'bi-box-arrow-right', color: 'bg-light-blue', action: handleLogout },
  ];

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      <div className="flex-grow-1 p-4">
        <h1 className="mb-4 fw-bold">Home</h1>
        <div className="row g-4">
          {cards.map((card, index) => (
            <div className="col-12 col-md-6 col-lg-4" key={index}>
              {card.link ? (
                <Link href={card.link} className="text-decoration-none">
                  <div className={`card h-100 text-center shadow ${card.color} border-0 rounded-4 hover-zoom`}>
                    <div className="card-body d-flex flex-column justify-content-center align-items-center">
                      <i className={`bi ${card.icon} mb-3`} style={{ fontSize: '2rem', color: '#6c63ff' }}></i>
                      <h5 className="card-title fw-semibold text-dark">{card.title}</h5>
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

        <style jsx>{`
          .bg-light-purple { background-color: #f3e8ff; }
          .bg-light-blue { background-color: #e0f7ff; }
          .bg-light-pink { background-color: #ffe4ec; }
          .bg-light-green { background-color: #e6ffe6; }
          .bg-light-yellow { background-color: #fff9cc; }
          .hover-zoom { transition: transform 0.3s ease; }
          .hover-zoom:hover { transform: scale(1.05); }
        `}</style>
      </div>
    </div>
  );
}