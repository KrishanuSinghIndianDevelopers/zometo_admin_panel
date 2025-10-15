'use client';

import Sidebar from '../../components/Sidebar'; 
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Filter, 
  PlusCircle, 
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Home,
  ShoppingCart,
  Users,
  Settings,
  Beef,
  Carrot,
  Gift,
  Tag
} from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFoodType, setActiveFoodType] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeOfferType, setActiveOfferType] = useState('All');
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  // Food types configuration
  const foodTypes = [
    { value: 'All', label: 'All Types', icon: null },
    { value: 'veg', label: 'Vegetarian', icon: Carrot, color: 'text-success' },
    { value: 'non-veg', label: 'Non-Vegetarian', icon: Beef, color: 'text-danger' }
  ];

  // Status options
  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'available', label: 'Available', color: 'success' },
    { value: 'upcoming', label: 'Upcoming', color: 'warning' },
    { value: 'cancelled', label: 'Cancelled', color: 'danger' }
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

  useEffect(() => {
    fetchCategoriesFromDB();
  }, []);

  // Fetch categories first, then products
  useEffect(() => {
    if (Object.keys(categoryMap).length > 0) {
      fetchProducts();
    }
  }, [categoryMap]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const fetchedProducts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Map category IDs to names
      const productsWithCategoryNames = fetchedProducts.map(product => ({
        ...product,
        categoryDisplayName: product.categoryName ? categoryMap[product.categoryName] || product.categoryName : 'Uncategorized'
      }));

      // Sort by priority and timestamp
      const sortedProducts = productsWithCategoryNames.sort((a, b) => {
        const priorityA = parseInt(a.priority) || 0;
        const priorityB = parseInt(b.priority) || 0;
        if (priorityB !== priorityA) return priorityB - priorityA;
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

const fetchCategoriesFromDB = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    const categoriesData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Create a map of category IDs to names
    const categoryNameMap = {};
    const categoryNames = ['All'];
    
    // Filter only main categories (no parentCategory)
    categoriesData.forEach(cat => {
      if (cat.id && cat.name && !cat.parentCategory) {
        categoryNameMap[cat.id] = cat.name;
        if (!categoryNames.includes(cat.name)) {
          categoryNames.push(cat.name);
        }
      }
    });
    
    setCategoryMap(categoryNameMap);
    setCategories(categoryNames);
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setShowActionMenu(null);
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    }
  };

  const handleStatusChange = async (productId, newStatus) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: newStatus
      });
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, status: newStatus } : product
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

  const toggleActionMenu = (productId, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowActionMenu(showActionMenu === productId ? null : productId);
  };

  const closeAllMenus = () => {
    setShowActionMenu(null);
    setShowFilterDropdown(false);
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

  // Filter products based on active category, food type, status, offer type and search term
  const filteredProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'All' || 
      (product.categoryDisplayName || '').toLowerCase() === activeCategory.toLowerCase();
    
    const matchesFoodType = activeFoodType === 'All' || 
      (product.foodType || '').toLowerCase() === activeFoodType.toLowerCase();
    
    const matchesStatus = activeStatus === 'All' || 
      (product.status || 'available').toLowerCase() === activeStatus.toLowerCase();
    
    const matchesOfferType = activeOfferType === 'All' || 
      (product.offerType || 'none').toLowerCase() === activeOfferType.toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.categoryDisplayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeFoodType, activeStatus, activeOfferType, searchTerm]);

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

  // Get status badge with color
  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
    
    return (
      <span className={`badge bg-${statusConfig.color} bg-opacity-10 text-${statusConfig.color} border border-${statusConfig.color} border-opacity-25`}>
        {statusConfig.label}
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


  

return (
  <div className="d-flex" style={{ minHeight: '100vh' }}>
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar />
    </div>

    {/* Main Content */}
    <div className="flex-grow-1">
      {/* Header */}
      <div className="p-4 border-bottom bg-white">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">Products Management</h2>
            <p className="text-muted mb-0">Manage your food items and menu</p>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2">
              <Package size={16} className="me-1" />
              {products.length} Total Products
            </div>
            
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
        {(activeCategory !== 'All' || activeFoodType !== 'All' || activeStatus !== 'All' || activeOfferType !== 'All' || searchTerm) && (
          <div className="row mt-3">
            <div className="col-12">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <small className="text-muted">Active filters:</small>
                
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
            <p className="mt-3 text-muted">Loading products...</p>
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
                            <td colSpan="10" className="text-center py-5">
                              <div className="text-muted">
                                <Package size={48} className="mb-3 opacity-50" />
                                <h5 className="fw-semibold">No products found</h5>
                                <p className="mb-4">
                                  {searchTerm || activeCategory !== 'All' || activeFoodType !== 'All' || activeStatus !== 'All' || activeOfferType !== 'All'
                                    ? 'Try adjusting your search or filter' 
                                    : 'Get started by creating your first product'
                                  }
                                </p>
                                {(searchTerm || activeCategory !== 'All' || activeFoodType !== 'All' || activeStatus !== 'All' || activeOfferType !== 'All') ? (
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={clearFilters}
                                  >
                                    Clear Filters
                                  </button>
                                ) : (
                                  <Link
                                    href="/products/create"
                                    className="btn btn-primary"
                                  >
                                    <PlusCircle size={18} className="me-2" />
                                    Create First Product
                                  </Link>
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
                                  {product.categoryDisplayName || 'Uncategorized'}
                                </span>
                              </td>

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

                              {/* Status */}
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  {getStatusBadge(product.status || 'available')}
                                  <button
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => handleStatusChange(product.id, product.status === 'available' ? 'upcoming' : 'available')}
                                    title={product.status === 'available' ? 'Mark as Upcoming' : 'Mark as Available'}
                                  >
                                    {product.status === 'available' ? '🟡' : '🟢'}
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