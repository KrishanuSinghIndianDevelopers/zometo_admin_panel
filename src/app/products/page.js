'use client';

import Sidebar from '../../components/Sidebar'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getProducts, 
  getCategories, 
  getVendorUid,
  deleteProduct,
  updateProductStatus,
  getAllVendors 
} from '../actions/productActionServer';
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
  Store,
  Gift,
  Carrot,
  Beef,
  Users,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [categoryMap, setCategoryMap] = useState({});
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  
  // Filters
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFoodType, setActiveFoodType] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeOfferType, setActiveOfferType] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState('all');
  
  // Vendor state
  const [vendorUid, setVendorUid] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [allVendors, setAllVendors] = useState([]);

  // Food types configuration
  const foodTypes = [
    { value: 'All', label: 'All Types', icon: null },
    { value: 'veg', label: 'Vegetarian', icon: Carrot, color: 'text-success' },
    { value: 'non-veg', label: 'Non-Vegetarian', icon: Beef, color: 'text-danger' }
  ];

  // Status options - Updated to only Available/Not Available
  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'available', label: 'Available', color: 'success' },
    { value: 'not-available', label: 'Not Available', color: 'danger' }
  ];

  // Offer types configuration
  const offerTypes = [
    { value: 'All', label: 'All Offers' },
    { value: 'none', label: 'No Offer' },
    { value: 'bogo', label: 'Buy 1 Get 1 Free' },
    { value: 'bxgy', label: 'Buy X Get Y Free' },
    { value: 'bogof', label: 'BOGO (Different Product)' },
    { value: 'bxgyf', label: 'BXGY (Different Product)' }
  ];

  // Fetch user data and initialize
  useEffect(() => {
    initializeUserData();
  }, []);

  // Reload products when vendor filter changes (for admin)
  useEffect(() => {
    if (vendorData?.role === 'main_admin' || vendorData?.role === 'admin') {
      loadProducts();
    }
  }, [selectedVendor]);

const initializeUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user from localStorage
      const currentUser = getCurrentUser();
      console.log('Current user:', currentUser);
      
      if (currentUser) {
        setVendorData(currentUser);
        
        // Load all vendors if user is admin
        if (currentUser.role === 'main_admin' || currentUser.role === 'admin') {
          console.log('User is admin, loading all vendors');
          await loadAllVendors();
          await loadAllData(); // Admin sees all data
        }
        else if (currentUser.role === 'vendor') {
          // Get vendor UID from server action
          console.log('User is vendor, fetching vendor UID for email:', currentUser.email);
          const vendorUid = await getVendorUid(currentUser.email);
          
          if (vendorUid) {
            console.log('Vendor UID found:', vendorUid);
            setVendorUid(vendorUid);
            await loadVendorData(vendorUid);
          } else {
            console.error('Vendor UID not found for email:', currentUser.email);
            // Fallback: try to use user ID as vendor UID
            const fallbackUid = currentUser.uid || currentUser.id;
            if (fallbackUid) {
              console.log('Using fallback UID:', fallbackUid);
              setVendorUid(fallbackUid);
              await loadVendorData(fallbackUid);
            } else {
              console.error('No fallback UID available');
              await loadAllData(); // Fallback to all data
            }
          }
        } else {
          console.log('Unknown user role, loading all data');
          await loadAllData();
        }
      } else {
        console.log('No user logged in, loading all data');
        await loadAllData();
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
      await loadAllData(); // Fallback to loading all data
    } finally {
      setLoading(false);
    }
  };
  const getCurrentUser = () => {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem('currentUser') || 
                    localStorage.getItem('user') ||
                    sessionStorage.getItem('currentUser') ||
                    sessionStorage.getItem('user');
    
    if (!userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  const loadAllVendors = async () => {
    try {
      const result = await getAllVendors();
      if (result.success) {
        setAllVendors(result.vendors);
      }
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

const loadVendorData = async (vendorUid) => {
    try {
      console.log('Loading vendor data for UID:', vendorUid);
      
      // Validate vendorUid before making requests
      if (!vendorUid || typeof vendorUid !== 'string' || vendorUid.trim() === '') {
        console.error('Invalid vendorUid in loadVendorData:', vendorUid);
        await loadAllData(); // Fallback
        return;
      }

      // Load vendor-specific products and categories
      const [productsResult, categoriesResult] = await Promise.all([
        getProducts(vendorUid),
        getCategories(vendorUid)
      ]);

      if (productsResult.success) {
        console.log(`Loaded ${productsResult.products.length} vendor products`);
        setProducts(productsResult.products);
      } else {
        console.error('Failed to load vendor products:', productsResult.error);
      }

      if (categoriesResult.success) {
        const categoryNames = ['All', ...categoriesResult.categories.map(cat => cat.name)];
        const nameMap = {};
        categoriesResult.categories.forEach(cat => {
          nameMap[cat.id] = cat.name;
        });
        
        setCategories(categoryNames);
        setCategoryMap(nameMap);
        console.log(`Loaded ${categoriesResult.categories.length} vendor categories`);
      } else {
        console.error('Failed to load vendor categories:', categoriesResult.error);
      }
    } catch (error) {
      console.error('Error loading vendor data:', error);
      // Fallback to loading all data
      await loadAllData();
    }
  };

  const loadAllData = async () => {
    try {
      // Load all products and categories (for admin)
      const [productsResult, categoriesResult] = await Promise.all([
        getProducts(),
        getCategories()
      ]);

      if (productsResult.success) {
        setProducts(productsResult.products);
      }

      if (categoriesResult.success) {
        const categoryNames = ['All', ...categoriesResult.categories.map(cat => cat.name)];
        const nameMap = {};
        categoriesResult.categories.forEach(cat => {
          nameMap[cat.id] = cat.name;
        });
        
        setCategories(categoryNames);
        setCategoryMap(nameMap);
      }
    } catch (error) {
      console.error('Error loading all data:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsResult = await getProducts(vendorUid, selectedVendor);
      if (productsResult.success) {
        setProducts(productsResult.products);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    try {
      const result = await deleteProduct(id, vendorUid);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setShowActionMenu(null);
        alert('Product deleted successfully!');
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    }
  };

  const handleStatusChange = async (productId, currentStatus) => {
    // Toggle between 'available' and 'not-available'
    const newStatus = currentStatus === 'available' ? 'not-available' : 'available';
    
    try {
      const result = await updateProductStatus(productId, newStatus, vendorUid);
      if (result.success) {
        // Update local state
        setProducts(prev => prev.map(product => 
          product.id === productId ? { ...product, status: newStatus } : product
        ));
        alert(`Status updated to ${newStatus === 'available' ? 'Available' : 'Not Available'}!`);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      // Handle ISO string from sanitized data
      let date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp.seconds) {
        // Fallback for timestamp object
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const toggleActionMenu = (productId, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowActionMenu(showActionMenu === productId ? null : productId);
  };

  const closeAllMenus = () => {
    setShowActionMenu(null);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-menu-container') && !event.target.closest('.action-menu-trigger')) {
        closeAllMenus();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Filter products based on active filters
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'All' || 
      (product.categoryDisplayName || product.categoryName || '').toLowerCase() === activeCategory.toLowerCase();
    
    const matchesFoodType = activeFoodType === 'All' || 
      (product.foodType || '').toLowerCase() === activeFoodType.toLowerCase();
    
    const matchesStatus = activeStatus === 'All' || 
      (product.status || 'available').toLowerCase() === activeStatus.toLowerCase();
    
    const matchesOfferType = activeOfferType === 'All' || 
      (product.offerType || 'none').toLowerCase() === activeOfferType.toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.categoryDisplayName || product.categoryName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.foodType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.offerDescription || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesFoodType && matchesStatus && matchesOfferType && matchesSearch;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const clearFilters = () => {
    setActiveCategory('All');
    setActiveFoodType('All');
    setActiveStatus('All');
    setActiveOfferType('All');
    setSearchTerm('');
    setSelectedVendor('all');
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeFoodType, activeStatus, activeOfferType, searchTerm, selectedVendor]);

  // Get food type badge with icon
  const getFoodTypeBadge = (foodType) => {
    const typeConfig = foodTypes.find(type => type.value === foodType) || foodTypes[0];
    const IconComponent = typeConfig.icon;
    
    return (
      <span className={`badge d-flex align-items-center gap-1 ${
        foodType === 'veg' 
          ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' 
          : foodType === 'non-veg'
          ? 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
          : 'bg-light text-dark border'
      }`}>
        {IconComponent && <IconComponent size={12} />}
        {typeConfig.label}
      </span>
    );
  };

  // Get status badge with color - Updated for Available/Not Available
  const getStatusBadge = (status) => {
    const isAvailable = status === 'available';
    
    return (
      <span className={`badge ${
        isAvailable 
          ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25' 
          : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
      }`}>
        {isAvailable ? 'Available' : 'Not Available'}
      </span>
    );
  };

  // Get offer badge with color
  const getOfferBadge = (offerType) => {
    if (!offerType || offerType === 'none') {
      return <span className="badge bg-light text-muted border">No Offer</span>;
    }

    const offerConfig = offerTypes.find(o => o.value === offerType);
    return (
      <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
        <Gift size={12} className="me-1" />
        {offerConfig?.label || offerType}
      </span>
    );
  };

  // Get offer description text
  const getOfferDescription = (product) => {
    if (!product.offerType || product.offerType === 'none') {
      return null;
    }

    return product.offerDescription || 'Special Offer';
  };

  // Check if user is admin
  const isAdmin = vendorData?.role === 'main_admin' || vendorData?.role === 'admin';

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="fw-bold text-dark mb-1">Products Management</h2>
              <p className="text-muted mb-0">
                {vendorData?.role === 'vendor' ? 'Manage your food items and menu' : 'Manage all products'}
              </p>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
                <Package size={16} className="me-1" />
                {products.length} {vendorData?.role === 'vendor' ? 'My Products' : 'Total Products'}
              </div>
              
              {/* Vendor Badge */}
              {vendorData?.role === 'vendor' && vendorData?.restaurantName && (
                <div className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2">
                  <Store size={16} className="me-1" />
                  {vendorData.restaurantName}
                </div>
              )}
              
              {!loading && (
                <Link
                  href="/products/create"
                  className="btn btn-primary d-inline-flex align-items-center gap-2"
                >
                  <PlusCircle size={18} />
                  Add New Product
                </Link>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-md-3">
              <label className="form-label fw-medium text-dark">Search Products</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-0">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-light"
                  placeholder="Search by name, title, category, or offer..."
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

            {/* Vendor Filter - Only for Admin */}
            {isAdmin && (
              <div className="col-md-2">
                <label className="form-label fw-medium text-dark">Vendor</label>
                <select
                  className="form-select"
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                >
                  <option value="all">All Vendors</option>
                  {allVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.restaurantName || vendor.name || 'Unknown Vendor'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Food Type Filter */}
            <div className="col-md-2">
              <label className="form-label fw-medium text-dark">Food Type</label>
              <select
                className="form-select"
                value={activeFoodType}
                onChange={(e) => setActiveFoodType(e.target.value)}
              >
                {foodTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="col-md-2">
              <label className="form-label fw-medium text-dark">Category</label>
              <select
                className="form-select"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-md-2">
              <label className="form-label fw-medium text-dark">Status</label>
              <select
                className="form-select"
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Offer Type Filter */}
            <div className="col-md-3">
              <label className="form-label fw-medium text-dark">Offer Type</label>
              <select
                className="form-select"
                value={activeOfferType}
                onChange={(e) => setActiveOfferType(e.target.value)}
              >
                {offerTypes.map((offer) => (
                  <option key={offer.value} value={offer.value}>
                    {offer.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(activeCategory !== 'All' || activeFoodType !== 'All' || activeStatus !== 'All' || activeOfferType !== 'All' || searchTerm || selectedVendor !== 'all') && (
            <div className="row mt-3">
              <div className="col-12">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted">Active filters:</small>
                  
                  {selectedVendor !== 'all' && isAdmin && (
                    <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                      <Users size={12} className="me-1" />
                      Vendor: {allVendors.find(v => v.id === selectedVendor)?.restaurantName || selectedVendor}
                    </span>
                  )}
                  
                  {activeCategory !== 'All' && (
                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
                      Category: {activeCategory}
                    </span>
                  )}
                  
                  {activeFoodType !== 'All' && (
                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                      Food Type: {activeFoodType}
                    </span>
                  )}
                  
                  {activeStatus !== 'All' && (
                    <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                      Status: {activeStatus}
                    </span>
                  )}
                  
                  {activeOfferType !== 'All' && (
                    <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
                      Offer: {offerTypes.find(o => o.value === activeOfferType)?.label}
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
              <p className="mt-3 text-muted">
                {vendorData?.role === 'vendor' ? 'Loading your products...' : 'Loading products...'}
              </p>
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
                            <th className="ps-4 py-3 fw-semibold text-dark">Product Image</th>
                            <th className="py-3 fw-semibold text-dark">Name & Offer</th>
                            <th className="py-3 fw-semibold text-dark">Food Type</th>
                            <th className="py-3 fw-semibold text-dark">Category</th>
                            {isAdmin && <th className="py-3 fw-semibold text-dark">Vendor</th>}
                            <th className="py-3 fw-semibold text-dark">Price</th>
                            <th className="py-3 fw-semibold text-dark">Offer Type</th>
                            <th className="py-3 fw-semibold text-dark">Priority</th>
                            <th className="py-3 fw-semibold text-dark">Status</th>
                            <th className="py-3 fw-semibold text-dark">Added Date</th>
                            <th className="pe-4 py-3 fw-semibold text-dark text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems.length === 0 ? (
                            <tr>
                              <td colSpan={isAdmin ? "11" : "10"} className="text-center py-5">
                                <div className="text-muted">
                                  <Package size={48} className="mb-3 opacity-50" />
                                  <h5 className="fw-semibold">No products found</h5>
                                  <p className="mb-4">
                                    {searchTerm || activeCategory !== 'All' || activeFoodType !== 'All' || activeStatus !== 'All' || activeOfferType !== 'All' || selectedVendor !== 'all'
                                      ? 'Try adjusting your search or filter' 
                                      : vendorData?.role === 'vendor' 
                                        ? 'Get started by creating your first product'
                                        : 'No products available'
                                    }
                                  </p>
                                  {(searchTerm || activeCategory !== 'All' || activeFoodType !== 'All' || activeStatus !== 'All' || activeOfferType !== 'All' || selectedVendor !== 'all') ? (
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={clearFilters}
                                    >
                                      Clear Filters
                                    </button>
                                  ) : (
                                    vendorData?.role === 'vendor' && (
                                      <Link
                                        href="/products/create"
                                        className="btn btn-primary"
                                      >
                                        <PlusCircle size={18} className="me-2" />
                                        Create First Product
                                      </Link>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            currentItems.map((product) => (
                              <tr key={product.id} className="border-top">
                                {/* Product Image */}
                                <td className="ps-4">
                                  <div
                                    style={{
                                      width: '60px',
                                      height: '60px',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      border: '1px solid #dee2e6',
                                    }}
                                  >
                                    <img
                                      src={product.imageUrl || 'https://via.placeholder.com/60x60?text=No+Image'}
                                      alt={product.name || 'Food Item'}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                      }}
                                      onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                                      }}
                                    />
                                  </div>
                                </td>

                                {/* Name & Description */}
                                <td>
                                  <div>
                                    <h6 className="fw-semibold mb-1 text-dark">
                                      {product.title || product.name || 'Untitled Product'}
                                    </h6>
                                    {getOfferDescription(product) && (
                                      <small className="text-warning fw-medium">
                                        <Gift size={12} className="me-1" />
                                        {getOfferDescription(product)}
                                      </small>
                                    )}
                                  </div>
                                </td>

                                {/* Food Type */}
                                <td>
                                  {getFoodTypeBadge(product.foodType)}
                                </td>

                                {/* Category */}
                                <td>
                                  <span className="badge bg-light text-dark border">
                                    {product.categoryDisplayName || product.categoryName || 'Uncategorized'}
                                  </span>
                                </td>

                                {/* Vendor Name - Only for Admin */}
                                {isAdmin && (
                                  <td>
                                    <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">
                                      {product.vendorName || 'Unknown Vendor'}
                                    </span>
                                  </td>
                                )}

                                {/* Price */}
                                <td>
                                  <div>
                                    {product.amount && (
                                      <div className="fw-semibold text-dark">₹{product.amount}</div>
                                    )}
                                    {product.originalPrice && product.originalPrice !== product.amount && (
                                      <div className="text-muted small text-decoration-line-through">₹{product.originalPrice}</div>
                                    )}
                                  </div>
                                </td>

                                {/* Offer Type */}
                                <td>
                                  {getOfferBadge(product.offerType)}
                                </td>

                                {/* Priority */}
                                <td>
                                  {product.priority ? (
                                    <span className={`badge ${
                                      parseInt(product.priority) > 7 ? 'bg-danger' : 
                                      parseInt(product.priority) > 4 ? 'bg-warning' : 'bg-primary'
                                    }`}>
                                      {product.priority}
                                    </span>
                                  ) : (
                                    <span className="text-muted small">0</span>
                                  )}
                                </td>

                                {/* Status - Updated with Toggle Button */}
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    {getStatusBadge(product.status || 'available')}
                                    <button
                                      className={`btn btn-sm p-1 ${
                                        (product.status || 'available') === 'available' 
                                          ? 'btn-success' 
                                          : 'btn-outline-secondary'
                                      }`}
                                      onClick={() => handleStatusChange(
                                        product.id, 
                                        product.status || 'available'
                                      )}
                                      title={
                                        (product.status || 'available') === 'available' 
                                          ? 'Mark as Not Available' 
                                          : 'Mark as Available'
                                      }
                                    >
                                      {(product.status || 'available') === 'available' ? (
                                      <ToggleRight size={35} className="text-green-600" />
                                      ) : (
                                       <ToggleLeft size={35} className="text-red-600" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* Added Date */}
                                <td>
                                  <small className="text-muted">
                                    {formatTimestamp(product.timestamp)}
                                  </small>
                                </td>

                                {/* Actions */}
                                <td className="pe-4 text-center position-relative action-menu-container">
                                  <button
                                    className="btn btn-sm btn-outline-secondary border-0 action-menu-trigger"
                                    onClick={(e) => toggleActionMenu(product.id, e)}
                                  >
                                    <MoreHorizontal size={18} />
                                  </button>

                                  {/* Action Dropdown Menu */}
                                  {showActionMenu === product.id && (
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
                                        href={`/products/view/${product.id}`}
                                        className="dropdown-item d-flex align-items-center gap-2"
                                        onClick={closeAllMenus}
                                      >
                                        <Eye size={16} className="text-primary" />
                                        View
                                      </Link>
                                      <Link
                                        href={`/products/edit/${product.id}`}
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
                                          handleDelete(product.id);
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
                    {filteredProducts.length > itemsPerPage && (
                      <div className="d-flex justify-content-between align-items-center p-4 border-top">
                        <div className="text-muted small">
                          Showing {Math.min(filteredProducts.length, indexOfFirstItem + 1)}-{Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} products
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