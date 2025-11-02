'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import Sidebar from '../../components/Sidebar';
import BootstrapClient from '../../components/BootstrapClient';
import { 
  PlusCircle, Edit, Trash2, Eye, MoreHorizontal, Image as ImageIcon, 
  Filter, Sliders, List, Grid, Table, Store
} from 'lucide-react';
import Link from 'next/link';

export default function CategorySliderPage() {
  const [sliders, setSliders] = useState([]);
  const [filteredSliders, setFilteredSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uniqueVendors, setUniqueVendors] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [vendorsData, setVendorsData] = useState({});

  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchSliders();
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [vendorFilter, statusFilter, sliders]);

  const checkAuthAndFetchSliders = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      if (!userData) {
        router.push('/login');
        return;
      }
      const userObj = JSON.parse(userData);
      setUser(userObj);
      await fetchVendorsData();
      await fetchSliders(userObj);
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication error. Please login again.');
      router.push('/login');
    }
  };

  const fetchVendorsData = async () => {
    try {
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
      const vendorsMap = {};
      
      vendorsSnapshot.forEach((doc) => {
        const vendorData = doc.data();
        vendorsMap[doc.id] = {
          name: vendorData.restaurantName || vendorData.name || 'Unknown Vendor',
          email: vendorData.email || '',
          status: vendorData.status || 'active'
        };
      });

      setVendorsData(vendorsMap);
    } catch (error) {
      console.error('Error fetching vendors data:', error);
    }
  };

  const fetchSliders = async (userObj) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categorySlider'));
      const allSliders = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const isAdminUser = userObj.role === 'admin' || userObj.role === 'main_admin';
      const vendorUid = userObj.documentId || userObj.uid;

      let filteredSlidersData;

      if (isAdminUser) {
        filteredSlidersData = allSliders;
      } else {
        filteredSlidersData = allSliders.filter(slider => slider.vendorId === vendorUid);
      }

      filteredSlidersData.sort((a, b) => {
        if (b.priority !== a.priority) {
          return (b.priority || 0) - (a.priority || 0);
        }
        const aTime = a.timestamp?.toDate?.() || new Date(0);
        const bTime = b.timestamp?.toDate?.() || new Date(0);
        return bTime - aTime;
      });

      setSliders(filteredSlidersData);
      setFilteredSliders(filteredSlidersData);

      if (isAdminUser) {
        const vendors = [...new Set(allSliders.map(slider => slider.vendorId).filter(Boolean))];
        setUniqueVendors(vendors);
      }

    } catch (error) {
      console.error('Error fetching sliders:', error);
      alert('Failed to fetch category sliders.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = sliders;

    if (vendorFilter !== 'all') {
      filtered = filtered.filter(slider => slider.vendorId === vendorFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(slider => slider.status === statusFilter);
    }

    setFilteredSliders(filtered);
  };

  const canModifySlider = (slider) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'main_admin') return true;
    const vendorUid = user.documentId || user.uid;
    return slider.vendorId === vendorUid;
  };

  const handleDeleteClick = async (slider) => {
    if (!window.confirm(`Delete "${slider.name}" slider?`)) return;
    
    try {
      if (slider.imageUrl) {
        try {
          const storage = getStorage();
          const imageRef = ref(storage, slider.imageUrl);
          await deleteObject(imageRef);
        } catch (storageError) {
          console.log('Image not found in storage');
        }
      }

      await deleteDoc(doc(db, 'categorySlider', slider.id));
      alert('Slider deleted successfully!');
      await fetchSliders(user);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed!');
    }
  };

  const toggleDropdown = (sliderId, e) => {
    e?.stopPropagation();
    setActiveDropdown(activeDropdown === sliderId ? null : sliderId);
  };

  const getVendorDisplayName = (vendorId) => {
    if (!vendorId) return 'Unknown Vendor';
    if (vendorId === 'admin') return 'Admin';
    
    if (vendorsData[vendorId]) {
      return vendorsData[vendorId].name;
    }
    
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const currentUser = JSON.parse(userData);
        if (vendorId === (currentUser.documentId || currentUser.uid)) {
          return currentUser.restaurantName || currentUser.name || 'Your Restaurant';
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    return `Vendor: ${vendorId.substring(0, 8)}...`;
  };

  const getVendorBadge = (vendorId) => {
    const vendorName = getVendorDisplayName(vendorId);
    
    if (vendorId === 'admin') {
      return (
        <span className="badge bg-warning bg-opacity-10 text-warning border d-flex align-items-center gap-1">
          <Store size={12} />
          {vendorName}
        </span>
      );
    }
    
    return (
      <span className="badge bg-info bg-opacity-10 text-info border d-flex align-items-center gap-1">
        <Store size={12} />
        {vendorName}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'bg-success', text: 'Active' },
      inactive: { class: 'bg-secondary', text: 'Inactive' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };



// Table View Component - ONLY THIS PART NEEDS TO BE CHANGED
const TableView = () => (
  <div className="card border-0 shadow-sm">
    <div className="card-body p-0">
      <div className="table-responsive" style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light sticky-top" style={{ top: 0, zIndex: 1 }}>
            <tr>
              <th className="ps-4 py-3" style={{ minWidth: '100px' }}>Image</th>
              <th className="py-3" style={{ minWidth: '200px' }}>Slider Details</th>
              {isAdminUser && <th className="py-3" style={{ minWidth: '150px' }}>Vendor</th>}
              <th className="py-3" style={{ minWidth: '100px' }}>Priority</th>
              <th className="py-3" style={{ minWidth: '100px' }}>Status</th>
              <th className="py-3" style={{ minWidth: '120px' }}>Created</th>
              <th className="pe-4 py-3 text-center" style={{ minWidth: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSliders.map((slider) => {
              const userCanModify = canModifySlider(slider);
              return (
                <tr key={slider.id} className="border-top">
                  <td className="ps-4">
                    <img
                      src={slider.imageUrl}
                      alt={slider.name}
                      className="rounded"
                      style={{
                        width: '80px',
                        height: '60px',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                      }}
                    />
                  </td>
                  <td>
                    <h6 className="fw-semibold mb-1 text-dark text-break">{slider.name}</h6>
                    <small className="text-muted">Category: {slider.categoryName}</small>
                  </td>
                  {isAdminUser && (
                    <td>
                      <div className="text-break">
                        {getVendorBadge(slider.vendorId)}
                      </div>
                    </td>
                  )}
                  <td>
                    <span className="badge bg-primary bg-opacity-10 text-primary border">
                      {slider.priority || 5}
                    </span>
                  </td>
                  <td>{getStatusBadge(slider.status)}</td>
                  <td>
                    <small className="text-muted">
                      {slider.timestamp?.toDate?.().toLocaleDateString() || 'Recently'}
                    </small>
                  </td>
                  <td className="pe-4 text-center">
                    <div className="dropdown-container position-relative">
                      <button
                        className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                        onClick={(e) => toggleDropdown(slider.id, e)}
                        style={{ width: '32px', height: '32px' }}
                        disabled={!userCanModify}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {activeDropdown === slider.id && (
                        <div className="dropdown-menu show position-absolute end-0 mt-1" style={{zIndex: 9999, minWidth: '160px'}}>
                          <button className="dropdown-item py-2 d-flex align-items-center gap-2"
                            onClick={() => {
                              alert(`Preview: ${slider.name}\nCategory: ${slider.categoryName}\nStatus: ${slider.status}`);
                              setActiveDropdown(null);
                            }}>
                            <Eye size={14} />
                            Preview
                          </button>
                          <Link 
                            href={`/CategorySlider/edit/${slider.id}`} 
                            className="dropdown-item py-2 d-flex align-items-center gap-2"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <Edit size={14} />
                            Edit
                          </Link>
                          <hr className="my-1" />
                          <button 
                            className="dropdown-item py-2 text-danger d-flex align-items-center gap-2" 
                            onClick={() => handleDeleteClick(slider)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);


  // Grid View Component
  const GridView = () => (
    <div className="row">
      {filteredSliders.map((slider) => {
        const userCanModify = canModifySlider(slider);
        return (
          <div key={slider.id} className="col-12 col-md-6 col-lg-4 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="position-relative">
                <img
                  src={slider.imageUrl}
                  alt={slider.name}
                  className="card-img-top"
                  style={{ 
                    height: '200px', 
                    objectFit: 'cover',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px'
                  }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
                <div className="position-absolute top-0 end-0 m-2">
                  {getStatusBadge(slider.status)}
                </div>
                <div className="position-absolute top-0 start-0 m-2">
                  <span className="badge bg-primary">Priority: {slider.priority || 5}</span>
                </div>
              </div>
              <div className="card-body">
                <h6 className="card-title fw-semibold text-dark mb-2">{slider.name}</h6>
                <p className="card-text small text-muted mb-2">
                  Category: <span className="fw-medium text-dark">{slider.categoryName}</span>
                </p>
                {isAdminUser && (
                  <p className="card-text small text-muted mb-2">
                    Vendor: {getVendorBadge(slider.vendorId)}
                  </p>
                )}
                <p className="card-text small text-muted mb-3">
                  Created: <span className="fw-medium text-dark">
                    {slider.timestamp?.toDate?.().toLocaleDateString() || 'Recently'}
                  </span>
                </p>
                <div className="d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => alert(`Preview: ${slider.name}\nCategory: ${slider.categoryName}\nStatus: ${slider.status}`)}
                  >
                    <Eye size={14} className="me-1" />
                    Preview
                  </button>
                  <div className="dropdown-container position-relative">
                    <button
                      className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                      onClick={(e) => toggleDropdown(slider.id, e)}
                      style={{ width: '32px', height: '32px' }}
                      disabled={!userCanModify}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {activeDropdown === slider.id && (
                      <div className="dropdown-menu show position-absolute end-0 mt-1" style={{zIndex: 9999, minWidth: '160px'}}>
                        <Link 
                          href={`/CategorySlider/edit/${slider.id}`} 
                          className="dropdown-item py-2 d-flex align-items-center gap-2"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <Edit size={14} />
                          Edit
                        </Link>
                        <hr className="my-1" />
                        <button 
                          className="dropdown-item py-2 text-danger d-flex align-items-center gap-2" 
                          onClick={() => handleDeleteClick(slider)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // List View Component
  const ListView = () => (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-0">
        <div className="list-group list-group-flush">
          {filteredSliders.map((slider) => {
            const userCanModify = canModifySlider(slider);
            return (
              <div key={slider.id} className="list-group-item border-0 py-3 px-4">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <img
                      src={slider.imageUrl}
                      alt={slider.name}
                      className="rounded"
                      style={{
                        width: '80px',
                        height: '60px',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                      }}
                    />
                  </div>
                  <div className="col">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-semibold mb-1 text-dark">{slider.name}</h6>
                        <p className="text-muted small mb-1">Category: {slider.categoryName}</p>
                        <div className="d-flex gap-2 align-items-center">
                          {getStatusBadge(slider.status)}
                          <span className="badge bg-primary bg-opacity-10 text-primary border">
                            Priority: {slider.priority || 5}
                          </span>
                          {isAdminUser && getVendorBadge(slider.vendorId)}
                        </div>
                      </div>
                      <div className="dropdown-container position-relative">
                        <button
                          className="btn btn-sm btn-outline-secondary border-0 rounded-circle"
                          onClick={(e) => toggleDropdown(slider.id, e)}
                          style={{ width: '32px', height: '32px' }}
                          disabled={!userCanModify}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {activeDropdown === slider.id && (
                          <div className="dropdown-menu show position-absolute end-0 mt-1" style={{zIndex: 9999, minWidth: '160px'}}>
                            <button className="dropdown-item py-2 d-flex align-items-center gap-2"
                              onClick={() => {
                                alert(`Preview: ${slider.name}\nCategory: ${slider.categoryName}\nStatus: ${slider.status}`);
                                setActiveDropdown(null);
                              }}>
                              <Eye size={14} />
                              Preview
                            </button>
                            <Link 
                              href={`/CategorySlider/edit/${slider.id}`} 
                              className="dropdown-item py-2 d-flex align-items-center gap-2"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <Edit size={14} />
                              Edit
                            </Link>
                            <hr className="my-1" />
                            <button 
                              className="dropdown-item py-2 text-danger d-flex align-items-center gap-2" 
                              onClick={() => handleDeleteClick(slider)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="d-flex min-vh-100">
        <Sidebar />
        <div className="flex-grow-1 bg-light d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-muted">Loading category sliders...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdminUser = user?.role === 'admin' || user?.role === 'main_admin';

  return (
    <div className="d-flex min-vh-100">
      <Sidebar />
      <BootstrapClient />
      
      <div className="flex-grow-1 bg-light">
        {/* Header Section */}
        <div className="p-4 mb-2 border-bottom" style={{backgroundColor: '#e3f2fd', borderBottom: '2px solid #bbdefb'}}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">Category Sliders Management</h2>
              <p className="text-muted mb-0">
                {isAdminUser ? 'Manage all category sliders' : 'Manage your category sliders'}
              </p>
            </div>
            
            <div className="text-end">
              <div className={`badge ${isAdminUser ? 'bg-warning' : 'bg-primary'} bg-opacity-10 ${isAdminUser ? 'text-warning' : 'text-primary'} border px-3 py-2 me-3`}>
                <Sliders size={16} className="me-1" />
                {filteredSliders.length} {isAdminUser ? 'Total' : 'My'} Sliders
              </div>
              <Link href="/CategorySlider/create" className="btn btn-primary d-flex align-items-center gap-2">
                <PlusCircle size={18} />
                Create Slider
              </Link>
            </div>
          </div>

          {/* Filters and View Toggle */}
          {(isAdminUser || sliders.length > 0) && (
            <div className="mt-3">
              <div className="card border-0 shadow-sm">
                <div className="card-body py-3">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary rounded-circle p-2">
                          <Filter size={18} className="text-white" />
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-0">Filter Sliders</h6>
                          <small className="text-muted">
                            {filteredSliders.length} of {sliders.length} sliders showing
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <div className="d-flex align-items-center gap-3 justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                          {isAdminUser && (
                            <select 
                              className="form-select form-select-sm border-primary"
                              value={vendorFilter}
                              onChange={(e) => setVendorFilter(e.target.value)}
                              style={{minWidth: '200px'}}
                            >
                              <option value="all">All Vendors ({sliders.length})</option>
                              {/* <option value="admin">Admin ({sliders.filter(s => s.vendorId === 'admin').length})</option> */}
                              {uniqueVendors.filter(vendor => vendor !== 'admin').map(vendor => (
                                <option key={vendor} value={vendor}>
                                  {getVendorDisplayName(vendor)} ({sliders.filter(s => s.vendorId === vendor).length})
                                </option>
                              ))}
                            </select>
                          )}
                          
                          <select 
                            className="form-select form-select-sm border-primary"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{minWidth: '140px'}}
                          >
                            <option value="all">All Status</option>
                            <option value="active">Active ({sliders.filter(s => s.status === 'active').length})</option>
                            <option value="inactive">Inactive ({sliders.filter(s => s.status === 'inactive').length})</option>
                          </select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="btn-group" role="group">
                          <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('table')}
                          >
                            <Table size={14} />
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('grid')}
                          >
                            <Grid size={14} />
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('list')}
                          >
                            <List size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4">
          {filteredSliders.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <div className="text-muted">
                  <Sliders size={48} className="mb-3 opacity-50" />
                  <h5 className="fw-semibold">
                    {sliders.length === 0 ? 'No category sliders found' : 'No sliders match your filters'}
                  </h5>
                  <p className="text-muted mb-4">
                    {sliders.length === 0 
                      ? 'Create your first category slider to get started' 
                      : 'Try changing your filter criteria'}
                  </p>
                  <Link href="/CategorySlider/create" className="btn btn-primary">
                    <PlusCircle size={18} className="me-2" />
                    Create First Slider
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'table' && <TableView />}
              {viewMode === 'grid' && <GridView />}
              {viewMode === 'list' && <ListView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}