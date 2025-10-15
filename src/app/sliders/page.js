'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import { MoreHorizontal, Edit, Trash2, Eye, Plus } from 'lucide-react';

export default function SlidersPage() {
  const router = useRouter();
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(null);

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'imageSliders'));
      const slidersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSliders(slidersData);
    } catch (error) {
      console.error('Error fetching sliders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sliderId) => {
    if (!window.confirm('Are you sure you want to delete this slider?')) return;

    try {
      await setDoc(doc(db, 'imageSliders', sliderId), {}, { merge: false });
      alert('Slider deleted successfully!');
      fetchSliders();
    } catch (error) {
      console.error('Error deleting slider:', error);
      alert('Failed to delete slider!');
    }
  };

  const toggleActionMenu = (sliderId, e) => {
    e?.stopPropagation();
    setShowActionMenu(showActionMenu === sliderId ? null : sliderId);
  };

  const closeActionMenu = () => {
    setShowActionMenu(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">Slider Management</h2>
            <p className="text-muted mb-0">Manage your banner sliders and promotions</p>
          </div>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={() => router.push('/sliders/create')}
          >
            <Plus size={18} />
            Create Slider
          </button>
        </div>

        {/* Sliders Table */}
        <div className="card border-0 shadow-lg rounded-4">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-4 py-3 fw-semibold text-dark">Slider Image</th>
                    <th scope="col" className="py-3 fw-semibold text-dark">Title & Description</th>
                    <th scope="col" className="py-3 fw-semibold text-dark">Category</th>
                    <th scope="col" className="py-3 fw-semibold text-dark">Type</th>
                    <th scope="col" className="py-3 fw-semibold text-dark">Sub Categories</th>
                    <th scope="col" className="py-3 fw-semibold text-dark">Created Date</th>
                    <th scope="col" className="text-center py-3 fw-semibold text-dark">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="d-flex justify-content-center">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                        <p className="mt-3 text-muted">Loading sliders...</p>
                      </td>
                    </tr>
                  ) : sliders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5">
                        <div className="text-muted">
                          <i className="bi bi-image display-4 mb-3 opacity-50"></i>
                          <h5 className="fw-semibold">No sliders found</h5>
                          <p className="mb-4">Get started by creating your first slider</p>
                          <button
                            className="btn btn-primary"
                            onClick={() => router.push('/sliders/create')}
                          >
                            Create First Slider
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sliders.map((slider) => (
                      <tr key={slider.id} className="border-top">
                        {/* Slider Image */}
                        <td className="ps-4">
                          <div
                            style={{
                              width: '80px',
                              height: '60px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '1px solid #dee2e6',
                            }}
                          >
                            <img
                              src={slider.imageUrl}
                              alt={slider.title}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td>
                          <div>
                            <h6 className="fw-semibold mb-1 text-dark">{slider.title}</h6>
                            <p className="text-muted small mb-0" style={{ maxWidth: '200px' }}>
                              {slider.subtitle}
                            </p>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
                            {slider.categoryName}
                          </span>
                        </td>

                        {/* Main Category Type */}
                        <td>
                          {slider.mainCategory && (
                            <span className={`badge ${
                              slider.mainCategory === 'veg' 
                                ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' 
                                : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
                            }`}>
                              {slider.mainCategory === 'veg' ? '🥗 Veg' : '🍗 Non-Veg'}
                            </span>
                          )}
                        </td>

                        {/* Sub Categories */}
                        <td>
                          {slider.subCategories && slider.subCategories.length > 0 ? (
                            <div>
                              <small className="text-muted">
                                {slider.subCategories.slice(0, 2).join(', ')}
                                {slider.subCategories.length > 2 && ` +${slider.subCategories.length - 2} more`}
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted small">None</span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td>
                          <small className="text-muted">
                            {formatDate(slider.timestamp)}
                          </small>
                        </td>

                        {/* Actions */}
                        <td className="text-center position-relative">
                          <button
                            className="btn btn-sm btn-outline-secondary border-0 d-flex align-items-center justify-content-center"
                            onClick={(e) => toggleActionMenu(slider.id, e)}
                            style={{ 
                              width: '32px', 
                              height: '32px',
                              background: 'transparent'
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {/* Action Dropdown Menu */}
                          {showActionMenu === slider.id && (
                            <div 
                              className="dropdown-menu show position-absolute end-0 border-0 shadow"
                              style={{ 
                                zIndex: 1000,
                                top: '100%',
                                right: 0,
                                minWidth: '140px',
                                borderRadius: '0'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="dropdown-item d-flex align-items-center gap-2 border-0 py-2"
                                onClick={() => {
                                  // View functionality
                                  console.log('View slider:', slider.id);
                                  setShowActionMenu(null);
                                }}
                                style={{ borderRadius: '0', fontSize: '14px' }}
                              >
                                <Eye size={16} className="text-primary" />
                                View
                              </button>
                              <button
                                className="dropdown-item d-flex align-items-center gap-2 border-0 py-2"
                                onClick={() => {
                                  // Edit functionality
                                  console.log('Edit slider:', slider.id);
                                  setShowActionMenu(null);
                                }}
                                style={{ borderRadius: '0', fontSize: '14px' }}
                              >
                                <Edit size={16} className="text-success" />
                                Edit
                              </button>
                              <button
                                className="dropdown-item d-flex align-items-center gap-2 text-danger border-0 py-2"
                                onClick={() => {
                                  handleDelete(slider.id);
                                  setShowActionMenu(null);
                                }}
                                style={{ borderRadius: '0', fontSize: '14px' }}
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!loading && sliders.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted small">
              Showing {sliders.length} slider{sliders.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}