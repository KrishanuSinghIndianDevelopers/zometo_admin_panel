'use client';
import Sidebar from '../../components/Sidebar'; 
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../firebase/firebase';
import { collection, addDoc, Timestamp, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Save, 
  Upload, 
  Image as ImageIcon,
  Package,
  DollarSign,
  Ruler,
  Scale,
  Hash,
  Edit,
  Trash2,
  Plus,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function FutureItems() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [nestedSubCategories, setNestedSubCategories] = useState([]);
  const [futureItems, setFutureItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryName: '',
    subCategoryName: '',
    nestedSubCategoryName: '',
    amount: '',
    originalPrice: '',
    foodType: 'veg',
    size: '',
    unit: '',
    quantity: '',
    priority: '5',
    availableDate: '',
    status: 'upcoming' // upcoming, available, cancelled
  });

  const foodTypes = [
    { value: 'veg', label: '🥗 Vegetarian' },
    { value: 'non-veg', label: '🍗 Non-Vegetarian' }
  ];

  const units = [
    { value: '', label: 'None' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'l', label: 'Liter (l)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'piece', label: 'Piece' },
    { value: 'pack', label: 'Pack' },
    { value: 'bottle', label: 'Bottle' }
  ];

  const sizes = [
    { value: '', label: 'No Size' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'regular', label: 'Regular' },
    { value: 'family', label: 'Family' },
    { value: 'personal', label: 'Personal' }
  ];

  const statusOptions = [
    { value: 'upcoming', label: '🟡 Upcoming', color: 'warning' },
    { value: 'available', label: '🟢 Available', color: 'success' },
    { value: 'cancelled', label: '🔴 Cancelled', color: 'danger' }
  ];

  useEffect(() => {
    fetchCategories();
    fetchFutureItems();
  }, []);

  // Filter categories based on food type
  useEffect(() => {
    if (categories.length > 0) {
      const filtered = categories.filter(cat => 
        cat.foodType === formData.foodType || !cat.foodType
      );
      setFilteredCategories(filtered);
      
      if (formData.categoryName) {
        const currentCategory = categories.find(cat => cat.id === formData.categoryName);
        if (currentCategory && currentCategory.foodType !== formData.foodType) {
          setFormData(prev => ({
            ...prev,
            categoryName: '',
            subCategoryName: '',
            nestedSubCategoryName: ''
          }));
          setSubCategories([]);
          setNestedSubCategories([]);
        }
      }
    }
  }, [formData.foodType, categories]);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), where('isMainCategory', '==', true));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchFutureItems = async () => {
    try {
      const q = query(collection(db, 'futureItems'));
      const querySnapshot = await getDocs(q);
      const itemsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFutureItems(itemsData);
    } catch (error) {
      console.error('Error fetching future items:', error);
    }
  };

  const fetchSubCategories = async (parentId, level = 0) => {
    try {
      const q = query(collection(db, 'categories'), where('parentCategory', '==', parentId));
      const querySnapshot = await getDocs(q);
      const subCategoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        level: level
      }));
      
      if (level === 0) {
        setSubCategories(subCategoriesData);
      } else if (level === 1) {
        setNestedSubCategories(subCategoriesData);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'categoryName') {
      setFormData(prev => ({
        ...prev,
        subCategoryName: '',
        nestedSubCategoryName: ''
      }));
      if (value) {
        fetchSubCategories(value, 0);
      } else {
        setSubCategories([]);
        setNestedSubCategories([]);
      }
    }

    if (name === 'subCategoryName') {
      setFormData(prev => ({
        ...prev,
        nestedSubCategoryName: ''
      }));
      if (value) {
        fetchSubCategories(value, 1);
      } else {
        setNestedSubCategories([]);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.categoryName || !formData.originalPrice || !image) {
      alert('Please fill all required fields and upload an image.');
      return;
    }

    if (formData.amount && parseFloat(formData.amount) > parseFloat(formData.originalPrice)) {
      alert('Selling price cannot be greater than original price.');
      return;
    }

    setLoading(true);

    try {
      const storage = getStorage();
      const imageRef = ref(storage, `future-items/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      const sellingPrice = formData.amount || formData.originalPrice;
      
      const itemData = {
        ...formData,
        imageUrl,
        amount: parseFloat(sellingPrice),
        originalPrice: parseFloat(formData.originalPrice),
        priority: parseInt(formData.priority) || 5,
        availableDate: formData.availableDate ? Timestamp.fromDate(new Date(formData.availableDate)) : null,
        timestamp: Timestamp.now(),
      };

      Object.keys(itemData).forEach(key => {
        if (itemData[key] === '' || itemData[key] === null) {
          delete itemData[key];
        }
      });

      if (editingItem) {
        // Update existing item
        await updateDoc(doc(db, 'futureItems', editingItem.id), itemData);
        alert('Future item updated successfully!');
      } else {
        // Create new item
        await addDoc(collection(db, 'futureItems'), itemData);
        alert('Future item created successfully!');
      }
      
      resetForm();
      fetchFutureItems();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving future item:', error);
      alert('Failed to save future item!');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      categoryName: item.categoryName || '',
      subCategoryName: item.subCategoryName || '',
      nestedSubCategoryName: item.nestedSubCategoryName || '',
      amount: item.amount?.toString() || '',
      originalPrice: item.originalPrice?.toString() || '',
      foodType: item.foodType || 'veg',
      size: item.size || '',
      unit: item.unit || '',
      quantity: item.quantity || '',
      priority: item.priority?.toString() || '5',
      availableDate: item.availableDate?.toDate().toISOString().split('T')[0] || '',
      status: item.status || 'upcoming'
    });
    setPreview(item.imageUrl || '');
    setImage(null);
    setShowForm(true);

    // Fetch subcategories if category exists
    if (item.categoryName) {
      fetchSubCategories(item.categoryName, 0);
    }
    if (item.subCategoryName) {
      fetchSubCategories(item.subCategoryName, 1);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm('Are you sure you want to delete this future item?')) {
      return;
    }

    try {
      // Delete image from storage if exists
      if (item.imageUrl) {
        try {
          const storage = getStorage();
          const imageRef = ref(storage, item.imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }

      // Delete document from Firestore
      await deleteDoc(doc(db, 'futureItems', item.id));
      alert('Future item deleted successfully!');
      fetchFutureItems();
    } catch (error) {
      console.error('Error deleting future item:', error);
      alert('Failed to delete future item!');
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await updateDoc(doc(db, 'futureItems', itemId), {
        status: newStatus
      });
      fetchFutureItems();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status!');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryName: '',
      subCategoryName: '',
      nestedSubCategoryName: '',
      amount: '',
      originalPrice: '',
      foodType: 'veg',
      size: '',
      unit: '',
      quantity: '',
      priority: '5',
      availableDate: '',
      status: 'upcoming'
    });
    setImage(null);
    setPreview('');
    setSubCategories([]);
    setNestedSubCategories([]);
    setEditingItem(null);
  };

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <span className={`badge bg-${statusOption.color} bg-opacity-10 text-${statusOption.color} border border-${statusOption.color} border-opacity-25`}>
        {statusOption.label}
      </span>
    );
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-grow-1" style={{ overflowX: 'hidden' }}>
        {/* Header */}
        <div className="p-4 border-bottom bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="fw-bold text-dark mb-1">Our Future Items</h2>
              <p className="text-muted mb-0">Manage upcoming food items and their availability</p>
            </div>
            <button
              className="btn btn-primary d-flex align-items-center gap-2"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus size={18} />
              Add Future Item
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {showForm ? (
            /* Form Section */
            <div className="card border-0 shadow-lg rounded-4 mb-4">
              <div className="card-body p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold text-dark mb-0">
                    {editingItem ? 'Edit Future Item' : 'Add New Future Item'}
                  </h4>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  ></button>
                </div>

                <form onSubmit={handleSubmit}>
                  <table className="table table-borderless w-100">
                    <thead>
                      <tr>
                        <th width="20%" className="text-dark fw-semibold">Field</th>
                        <th width="80%" className="text-dark fw-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Product Name */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Product Name *</label>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter product name"
                            required
                          />
                        </td>
                      </tr>
                      
                      {/* Description */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Description</label>
                        </td>
                        <td>
                          <textarea
                            className="form-control"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter product description"
                            rows="2"
                          />
                        </td>
                      </tr>
                      
                      {/* Food Type & Category */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Food Type & Category</label>
                        </td>
                        <td>
                          <div className="row g-3">
                            <div className="col-md-3">
                              <select
                                className="form-select"
                                name="foodType"
                                value={formData.foodType}
                                onChange={handleInputChange}
                              >
                                {foodTypes.map(type => (
                                  <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-3">
                              <select
                                className="form-select"
                                name="categoryName"
                                value={formData.categoryName}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select Category</option>
                                {filteredCategories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                            {subCategories.length > 0 && (
                              <div className="col-md-3">
                                <select
                                  className="form-select"
                                  name="subCategoryName"
                                  value={formData.subCategoryName}
                                  onChange={handleInputChange}
                                >
                                  <option value="">Select Subcategory</option>
                                  {subCategories.map(subCat => (
                                    <option key={subCat.id} value={subCat.id}>
                                      {subCat.level > 0 ? '↳ ' : ''}{subCat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {nestedSubCategories.length > 0 && (
                              <div className="col-md-3">
                                <select
                                  className="form-select"
                                  name="nestedSubCategoryName"
                                  value={formData.nestedSubCategoryName}
                                  onChange={handleInputChange}
                                >
                                  <option value="">Select Sub-Subcategory</option>
                                  {nestedSubCategories.map(nestedCat => (
                                    <option key={nestedCat.id} value={nestedCat.id}>
                                      {'↳ '.repeat(nestedCat.level + 1)}{nestedCat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Pricing */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Pricing</label>
                        </td>
                        <td>
                          <div className="row">
                            <div className="col-md-6">
                              <label className="form-label fw-medium text-dark mb-1">Original Price (₹) * (Actual Price)</label>
                              <input
                                type="number"
                                className="form-control"
                                name="originalPrice"
                                value={formData.originalPrice}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-medium text-dark mb-1">Selling Price (₹) (Discount Price)</label>
                              <input
                                type="number"
                                className="form-control"
                                name="amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                max={formData.originalPrice || ''}
                              />
                              <small className="text-muted">
                                {formData.amount && formData.originalPrice && parseFloat(formData.amount) > parseFloat(formData.originalPrice) ? (
                                  <span className="text-danger">Selling price cannot be more than original price</span>
                                ) : (
                                  "Enter discount price (must be less than or equal to original price)"
                                )}
                              </small>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Product Details */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Product Details</label>
                        </td>
                        <td>
                          <div className="row">
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">Size</label>
                              <select
                                className="form-select"
                                name="size"
                                value={formData.size}
                                onChange={handleInputChange}
                              >
                                {sizes.map(size => (
                                  <option key={size.value} value={size.value}>{size.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">Unit</label>
                              <select
                                className="form-select"
                                name="unit"
                                value={formData.unit}
                                onChange={handleInputChange}
                              >
                                {units.map(unit => (
                                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">Quantity</label>
                              <input
                                type="number"
                                className="form-control"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleInputChange}
                                placeholder="e.g., 2, 500"
                                step="0.01"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Availability & Priority */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Availability & Priority</label>
                        </td>
                        <td>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">Available Date</label>
                              <input
                                type="date"
                                className="form-control"
                                name="availableDate"
                                value={formData.availableDate}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">Status</label>
                              <select
                                className="form-select"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                              >
                                {statusOptions.map(status => (
                                  <option key={status.value} value={status.value}>{status.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">Priority</label>
                              <input
                                type="number"
                                className="form-control"
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                min="1"
                                max="100"
                                placeholder="Enter priority (1-100)"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Image Upload */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">Product Image *</label>
                        </td>
                        <td>
                          <div className="border-dashed border-2 rounded-3 p-4 text-center"
                               style={{ borderColor: '#dee2e6', backgroundColor: '#f8f9fa' }}>
                            <input
                              type="file"
                              accept="image/*"
                              className="d-none"
                              id="imageUpload"
                              onChange={handleImageChange}
                              required={!editingItem}
                            />
                            <label htmlFor="imageUpload" className="cursor-pointer">
                              <div className="py-3">
                                <Upload size={32} className="text-muted mb-2" />
                                <h6 className="fw-semibold text-dark mb-1">Click to upload product image</h6>
                                <p className="text-muted mb-0 small">
                                  PNG, JPG, WEBP up to 5MB
                                </p>
                              </div>
                            </label>
                          </div>

                          {preview && (
                            <div className="mt-3 text-center">
                              <img
                                src={preview}
                                alt="Preview"
                                className="img-fluid rounded shadow-sm"
                                style={{ maxHeight: '200px', objectFit: 'cover' }}
                              />
                              <div className="mt-1">
                                <small className="text-muted">Image Preview</small>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Action Buttons */}
                  <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4 py-2"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Reset Form
                    </button>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4 py-2"
                        onClick={() => {
                          setShowForm(false);
                          resetForm();
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="spinner-border spinner-border-sm" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            {editingItem ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <Save size={18} />
                            {editingItem ? 'Update Item' : 'Create Item'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Items List Section */
            <div className="card border-0 shadow-lg rounded-4">
              <div className="card-body p-4">
                <h4 className="fw-bold text-dark mb-4">Future Items List</h4>
                
                {futureItems.length === 0 ? (
                  <div className="text-center py-5">
                    <Clock size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">No Future Items</h5>
                    <p className="text-muted">Add your first future item to get started</p>
                    <button
                      className="btn btn-primary mt-2"
                      onClick={() => setShowForm(true)}
                    >
                      <Plus size={18} className="me-2" />
                      Add Future Item
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Pricing</th>
                          <th>Available Date</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {futureItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="rounded"
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                />
                              )}
                            </td>
                            <td>
                              <div>
                                <div className="fw-semibold">{item.name}</div>
                                {item.description && (
                                  <small className="text-muted">{item.description.substring(0, 50)}...</small>
                                )}
                              </div>
                            </td>
                            <td>
                              <small className="text-muted">
                                {item.categoryName}
                                {item.subCategoryName && ` → ${item.subCategoryName}`}
                                {item.nestedSubCategoryName && ` → ${item.nestedSubCategoryName}`}
                              </small>
                            </td>
                            <td>
                              <div>
                                <div className="text-success fw-semibold">₹{item.amount || item.originalPrice}</div>
                                {item.amount && item.amount !== item.originalPrice && (
                                  <small className="text-muted text-decoration-line-through">₹{item.originalPrice}</small>
                                )}
                              </div>
                            </td>
                            <td>
                              {item.availableDate ? (
                                new Date(item.availableDate.seconds * 1000).toLocaleDateString()
                              ) : (
                                <span className="text-muted">Not set</span>
                              )}
                            </td>
                            <td>
                              {getStatusBadge(item.status)}
                            </td>
                            <td>
                              <span className="badge bg-secondary bg-opacity-10 text-secondary">
                                {item.priority || 5}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(item)}
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => handleStatusChange(item.id, item.status === 'available' ? 'upcoming' : 'available')}
                                  title={item.status === 'available' ? 'Mark as Upcoming' : 'Mark as Available'}
                                >
                                  {item.status === 'available' ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(item)}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}