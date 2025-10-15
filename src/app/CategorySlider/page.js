'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../firebase/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import Sidebar from '../../components/Sidebar';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  PlusCircle, 
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Image as ImageIcon
} from 'lucide-react';

export default function CategorySlidersPage() {
  const router = useRouter();
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [showActionMenu, setShowActionMenu] = useState(null);

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'categorySlider'));
      const slidersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort by priority and timestamp
      const sortedSliders = slidersData.sort((a, b) => {
        const priorityA = parseInt(a.priority) || 0;
        const priorityB = parseInt(b.priority) || 0;
        if (priorityB !== priorityA) return priorityB - priorityA;
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      setSliders(sortedSliders);
    } catch (error) {
      console.error('Error fetching sliders:', error);
      alert('Failed to fetch category sliders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, imageUrl) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this category slider?");
    if (!confirmDelete) return;

    try {
      // Delete image from storage
      if (imageUrl) {
        const storage = getStorage();
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }

      await deleteDoc(doc(db, 'categorySlider', id));
      setSliders((prev) => prev.filter((s) => s.id !== id));
      setShowActionMenu(null);
      alert('Category slider deleted successfully!');
    } catch (error) {
      console.error('Error deleting slider:', error);
      alert('Failed to delete category slider.');
    }
  };

  const handleStatusChange = async (sliderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'categorySlider', sliderId), {
        status: newStatus
      });
      
      setSliders(prev => prev.map(slider => 
        slider.id === sliderId ? { ...slider, status: newStatus } : slider
      ));
      
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const toggleActionMenu = (sliderId, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowActionMenu(showActionMenu === sliderId ? null : sliderId);
  };

  const closeAllMenus = () => {
    setShowActionMenu(null);
  };

  // Filter sliders
  const filteredSliders = sliders.filter((slider) => {
    const matchesStatus = activeStatus === 'All' || 
      (slider.status || 'active').toLowerCase() === activeStatus.toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
      (slider.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slider.categoryName || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSliders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSliders.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const clearSearch = () => setSearchTerm('');
  const clearFilters = () => {
    setActiveStatus('All');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const isActive = status === 'active';
    return (
      <span className={`badge bg-${isActive ? 'success' : 'secondary'} bg-opacity-10 text-${isActive ? 'success' : 'secondary'} border border-${isActive ? 'success' : 'secondary'} border-opacity-25`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div className="d-flex" style={{ minHeight: '100vh' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2 className="fw-bold text-dark mb-1">Category Sliders Management</h2>
              <p className="text-muted mb-0">Manage your category slider banners</p>
            </div>

            <div className="text-end">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <Package size={16} className="me-1" />
                {sliders.length} Total Sliders
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-md-4">
              <label className="form-label fw-medium text-dark">Search Sliders</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-light"
                  placeholder="Search by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-0"
                    onClick={clearSearch}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-md-3">
              <label className="form-label fw-medium text-dark">Status</label>
              <select
                className="form-select"
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Results and Add Button */}
            <div className="col-md-5">
              <label className="form-label fw-medium text-dark">&nbsp;</label>
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded border-0">
                <small className="text-muted">
                  {filteredSliders.length} of {sliders.length}
                </small>

                {!loading && (
                  <Link
                    href="/CategorySlider/create"
                    className="btn btn-primary d-inline-flex align-items-center gap-2"
                  >
                    <PlusCircle size={18} />
                    Add New Slider
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(activeStatus !== 'All' || searchTerm) && (
            <div className="row mt-3">
              <div className="col-12">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted">Active filters:</small>
                  
                  {activeStatus !== 'All' && (
                    <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                      Status: {activeStatus}
                    </span>
                  )}
                  
                  {searchTerm && (
                    <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={clearFilters}
                  >
                    <X size={14} />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading category sliders...</p>
            </div>
          ) : (
            <div className="row">
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4 py-3 fw-semibold text-dark">Slider Image</th>
                            <th className="py-3 fw-semibold text-dark">Slider Name</th>
                            <th className="py-3 fw-semibold text-dark">Category</th>
                            <th className="py-3 fw-semibold text-dark">Priority</th>
                            <th className="py-3 fw-semibold text-dark">Status</th>
                            <th className="py-3 fw-semibold text-dark">Added Date</th>
                            <th className="pe-4 py-3 fw-semibold text-dark text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center py-5">
                                <div className="text-muted">
                                  <ImageIcon size={48} className="mb-3 opacity-50" />
                                  <h5 className="fw-semibold">No category sliders found</h5>
                                  <p className="mb-4">
                                    {searchTerm || activeStatus !== 'All'
                                      ? 'Try adjusting your search or filter' 
                                      : 'Get started by creating your first category slider'
                                    }
                                  </p>
                                  {(searchTerm || activeStatus !== 'All') ? (
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={clearFilters}
                                    >
                                      Clear Filters
                                    </button>
                                  ) : (
                                    <Link
                                      href="/category-sliders/create"
                                      className="btn btn-primary"
                                    >
                                      <PlusCircle size={18} className="me-2" />
                                      Create First Slider
                                    </Link>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            currentItems.map((slider) => (
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
                                      src={slider.imageUrl || 'https://via.placeholder.com/80x60?text=No+Image'}
                                      alt={slider.name}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                      onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/80x60?text=No+Image';
                                      }}
                                    />
                                  </div>
                                </td>

                                {/* Slider Name */}
                                <td>
                                  <h6 className="fw-semibold mb-1 text-dark">
                                    {slider.name}
                                  </h6>
                                </td>

                                {/* Category */}
                                <td>
                                  <span className="badge bg-light text-dark border">
                                    {slider.categoryName || 'Uncategorized'}
                                  </span>
                                </td>

                                {/* Priority */}
                                <td>
                                  {slider.priority ? (
                                    <span className={`badge ${
                                      parseInt(slider.priority) > 7 ? 'bg-danger' : 
                                      parseInt(slider.priority) > 4 ? 'bg-warning' : 'bg-primary'
                                    }`}>
                                      {slider.priority}
                                    </span>
                                  ) : (
                                    <span className="text-muted small">5</span>
                                  )}
                                </td>

                                {/* Status */}
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    {getStatusBadge(slider.status || 'active')}
                                    <button
                                      className="btn btn-sm btn-outline-success"
                                      onClick={() => handleStatusChange(slider.id, slider.status === 'active' ? 'inactive' : 'active')}
                                      title={slider.status === 'active' ? 'Deactivate' : 'Activate'}
                                    >
                                      {slider.status === 'active' ? '🔴' : '🟢'}
                                    </button>
                                  </div>
                                </td>

                                {/* Added Date */}
                                <td>
                                  <small className="text-muted">
                                    {formatTimestamp(slider.timestamp)}
                                  </small>
                                </td>

                                {/* Actions */}
                                <td className="pe-4 text-center position-relative action-menu-container">
                                  <button
                                    className="btn btn-sm btn-outline-secondary border-0 action-menu-trigger"
                                    onClick={(e) => toggleActionMenu(slider.id, e)}
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>

                                  {/* Action Dropdown Menu */}
                                  {showActionMenu === slider.id && (
                                    <div 
                                      className="dropdown-menu show position-absolute end-0 border-0 shadow"
                                      style={{ 
                                        zIndex: 1000,
                                        top: '100%',
                                        right: 0,
                                        minWidth: '140px'
                                      }}
                                    >
                                      <Link
                                        href={`/CategorySlider/edit/${slider.id}`}
                                        className="dropdown-item d-flex align-items-center gap-2"
                                        onClick={closeAllMenus}
                                      >
                                        <Edit size={16} className="text-success" />
                                        Edit
                                      </Link>
                                      <button
                                        className="dropdown-item d-flex align-items-center gap-2 text-danger"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDelete(slider.id, slider.imageUrl);
                                        }}
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

                    {/* Pagination */}
                    {filteredSliders.length > itemsPerPage && (
                      <div className="d-flex justify-content-between align-items-center p-4 border-top">
                        <div className="text-muted small">
                          Showing {Math.min(filteredSliders.length, indexOfFirstItem + 1)}-{Math.min(indexOfLastItem, filteredSliders.length)} of {filteredSliders.length} sliders
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                            onClick={prevPage}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft size={16} />
                            Previous
                          </button>
                          
                          <div className="d-flex gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => 
                                page === 1 || 
                                page === totalPages || 
                                (page >= currentPage - 1 && page <= currentPage + 1)
                              )
                              .map((page, index, array) => (
                                <div key={page}>
                                  <button
                                    className={`btn btn-sm ${
                                      currentPage === page ? 'btn-primary' : 'btn-outline-primary'
                                    }`}
                                    onClick={() => paginate(page)}
                                  >
                                    {page}
                                  </button>
                                  {index < array.length - 1 && array[index + 1] - page > 1 && (
                                    <span className="btn btn-sm btn-outline-primary disabled">...</span>
                                  )}
                                </div>
                              ))
                            }
                          </div>

                          <button
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                            onClick={nextPage}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}