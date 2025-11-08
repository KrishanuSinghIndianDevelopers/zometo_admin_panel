'use client';
import Sidebar from '../../../components/Sidebar'; 
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../firebase/firebase';
import { collection, addDoc, Timestamp, getDocs, query, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Save, 
  Upload, 
  Image as ImageIcon,
  Package,
  DollarSign,
  Ruler,
  Scale,
  Hash,
  Plus,
  Gift
} from 'lucide-react';

export default function CreateProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [nestedSubCategories, setNestedSubCategories] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [vendorUid, setVendorUid] = useState(null);

  // ✅ UPDATED: Status options - removed "cancelled"
  const statusOptions = [
    { value: 'Not Available', label: 'Not Available', color: 'warning' },
    { value: 'available', label: 'Available', color: 'success' }
  ];

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    categoryName: '',
    subCategoryId: '',
    subCategoryName: '',
    nestedSubCategoryId: '',
    nestedSubCategoryName: '',
    sellingPrice: '', // ✅ CHANGED: amount → sellingPrice
    originalPrice: '',
    discountedAmount: '',
    foodType: 'veg',
    size: '',
    unit: '',
    customUnit: '',
    quantity: '',
    priority: '',
    status: 'available',
    // New offer fields
    offerType: 'none',
    buyX: '',
    getY: '',
    freeProductId: '',
    maxQuantity: '',
    offerDescription: ''
  });

  const foodTypes = [
    { value: 'veg', label: '🥗 Vegetarian' },
    { value: 'non-veg', label: '🍗 Non-Vegetarian' }
  ];

  // ✅ UPDATED: Units - added "any" option
  const units = [
    { value: '', label: 'None' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'l', label: 'Liter (l)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'piece', label: 'Piece' },
    { value: 'pack', label: 'Pack' },
    { value: 'bottle', label: 'Bottle' },
    { value: 'any', label: 'Any (custom)' } // ✅ ADDED: Any option
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

  const offerTypes = [
    { value: 'none', label: 'No Offer' },
    { value: 'bogo', label: 'Buy 1 Get 1 Free' },
    { value: 'bxgy', label: 'Buy X Get Y Free' },
    { value: 'bogof', label: 'Buy 1 Get 1 Free (Different Product)' },
    { value: 'bxgyf', label: 'Buy X Get Y Free (Different Product)' }
  ];

  // Helper function to generate offer text
  const generateOfferText = (data) => {
    switch(data.offerType) {
      case 'bogo':
        return 'Buy 1 Get 1 Free!';
      case 'bxgy':
        return `Buy ${data.buyX || 'X'} Get ${data.getY || 'Y'} Free!`;
      case 'bogof':
        return 'Buy 1 Get 1 Free (Different Product)!';
      case 'bxgyf':
        return `Buy ${data.buyX || 'X'} Get ${data.getY || 'Y'} Free (Different Product)!`;
      default:
        return 'No active offer';
    }
  };

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  const checkAuthAndRole = async () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      router.push('/login');
      return;
    }

    const userObj = JSON.parse(userData);
    console.log('Current User:', userObj);
    setCurrentUser(userObj);
    
    if (userObj.role === 'vendor') {
      await getVendorUid(userObj.email);
    }
    
    fetchCategories();
    fetchAvailableProducts(userObj);
  };

  const getVendorUid = async (email) => {
    try {
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('email', '==', email)
      );
      
      const vendorsSnapshot = await getDocs(vendorsQuery);
      if (!vendorsSnapshot.empty) {
        const vendorDoc = vendorsSnapshot.docs[0];
        const vendorUid = vendorDoc.id;
        const vendorData = vendorDoc.data();
        
        console.log('✅ Vendor UID found:', vendorUid);
        console.log('✅ Vendor data:', vendorData);
        
        setVendorUid(vendorUid);
        return vendorUid;
      } else {
        console.error('❌ No vendor found for email:', email);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting vendor UID:', error);
      return null;
    }
  };

  // Filter categories based on food type
  useEffect(() => {
    if (categories.length > 0) {
      const filtered = categories.filter(cat => 
        cat.foodType === formData.foodType || !cat.foodType
      );
      setFilteredCategories(filtered);
      
      if (formData.categoryId) {
        const currentCategory = categories.find(cat => cat.id === formData.categoryId);
        if (currentCategory && currentCategory.foodType !== formData.foodType) {
          setFormData(prev => ({
            ...prev,
            categoryId: '',
            categoryName: '',
            subCategoryId: '',
            subCategoryName: '',
            nestedSubCategoryId: '',
            nestedSubCategoryName: ''
          }));
          setSubCategories([]);
          setNestedSubCategories([]);
        }
      }
    }
  }, [formData.foodType, categories]);

  // ✅ UPDATED: Calculate discounted amount when prices change
  useEffect(() => {
    if (formData.originalPrice && formData.sellingPrice) {
      const original = parseFloat(formData.originalPrice);
      const selling = parseFloat(formData.sellingPrice);
      const discounted = original - selling;
      setFormData(prev => ({
        ...prev,
        discountedAmount: discounted > 0 ? discounted.toString() : '0'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        discountedAmount: '0'
      }));
    }
  }, [formData.originalPrice, formData.sellingPrice]);

  // Reset offer fields when offer type changes to 'none'
  useEffect(() => {
    if (formData.offerType === 'none') {
      setFormData(prev => ({
        ...prev,
        buyX: '',
        getY: '',
        freeProductId: '',
        maxQuantity: '',
        offerDescription: ''
      }));
    }
  }, [formData.offerType]);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), where('isMainCategory', '==', true));
      const querySnapshot = await getDocs(q);
      const categoriesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
      setFilteredCategories(categoriesData);
      console.log("Categories loaded:", categoriesData.length);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAvailableProducts = async (userObj) => {
    try {
      let q;
      
      if (userObj.role === 'main_admin' || userObj.role === 'admin') {
        q = query(collection(db, 'products'), where('status', '==', 'available'));
        console.log("Fetching all products for admin");
      } else {
        if (vendorUid) {
          q = query(
            collection(db, 'products'), 
            where('status', '==', 'available'),
            where('vendorId', '==', vendorUid)
          );
          console.log("Fetching vendor products with UID:", vendorUid);
        } else {
          console.log("Vendor UID not available yet");
          setAvailableProducts([]);
          return;
        }
      }
      
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAvailableProducts(productsData);
      console.log("Available products loaded:", productsData.length);
    } catch (error) {
      console.error('Error fetching products:', error);
      setAvailableProducts([]);
    }
  };

  useEffect(() => {
    if (currentUser && vendorUid) {
      fetchAvailableProducts(currentUser);
    }
  }, [vendorUid]);

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
      if (level === 0) {
        setSubCategories([]);
      } else if (level === 1) {
        setNestedSubCategories([]);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'categoryId') {
      const selectedCategory = categories.find(cat => cat.id === value);
      setFormData(prev => ({
        ...prev,
        categoryId: value,
        categoryName: selectedCategory ? selectedCategory.name : '',
        subCategoryId: '',
        subCategoryName: '',
        nestedSubCategoryId: '',
        nestedSubCategoryName: ''
      }));
      
      if (value) {
        fetchSubCategories(value, 0);
      } else {
        setSubCategories([]);
        setNestedSubCategories([]);
      }
    }
    else if (name === 'subCategoryId') {
      const selectedSubCategory = subCategories.find(subCat => subCat.id === value);
      setFormData(prev => ({
        ...prev,
        subCategoryId: value,
        subCategoryName: selectedSubCategory ? selectedSubCategory.name : '',
        nestedSubCategoryId: '',
        nestedSubCategoryName: ''
      }));
      
      if (value) {
        fetchSubCategories(value, 1);
      } else {
        setNestedSubCategories([]);
      }
    }
    else if (name === 'nestedSubCategoryId') {
      const selectedNestedSubCategory = nestedSubCategories.find(nestedCat => nestedCat.id === value);
      setFormData(prev => ({
        ...prev,
        nestedSubCategoryId: value,
        nestedSubCategoryName: selectedNestedSubCategory ? selectedNestedSubCategory.name : ''
      }));
    }
    else if (name === 'offerType') {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        return {
          ...newData,
          offerDescription: generateOfferText(newData)
        };
      });
    }
    else if (name === 'buyX' || name === 'getY') {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        return {
          ...newData,
          offerDescription: generateOfferText(newData)
        };
      });
    }
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }

      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    alert('User not authenticated!');
    return;
  }

  // Validate required fields
  if (!formData.title || !formData.categoryId || !formData.originalPrice || !image) {
    alert('Please fill all required fields and upload an image.');
    return;
  }

  // Validate selling price is not greater than original price
  if (formData.sellingPrice && parseFloat(formData.sellingPrice) > parseFloat(formData.originalPrice)) {
    alert('Selling price cannot be greater than original price.');
    return;
  }

  // Validate custom unit when "any" is selected
  if (formData.unit === 'any' && !formData.customUnit) {
    alert('Please enter a custom unit name when "Any (custom)" is selected.');
    return;
  }

  // Validate offer fields
  if (formData.offerType !== 'none') {
    if ((formData.offerType === 'bxgy' || formData.offerType === 'bxgyf') && (!formData.buyX || !formData.getY)) {
      alert('Please fill both Buy Quantity and Get Free Quantity for this offer type.');
      return;
    }
    if ((formData.offerType === 'bogof' || formData.offerType === 'bxgyf') && !formData.freeProductId) {
      alert('Please select a free product for this offer type.');
      return;
    }
  }

  if (currentUser.role === 'vendor' && !vendorUid) {
    alert('Vendor authentication failed. Please try logging in again.');
    return;
  }

  setLoading(true);

  try {
    // Upload image to Firebase Storage
    const storage = getStorage();
    const imageRef = ref(storage, `products/${Date.now()}-${image.name}`);
    await uploadBytes(imageRef, image);
    const imageUrl = await getDownloadURL(imageRef);

    console.log("✅ Image uploaded successfully:", imageUrl);

    // Determine vendor UID and name
    let finalVendorUid;
    let finalVendorName;

    if (currentUser.role === 'main_admin' || currentUser.role === 'admin') {
      finalVendorUid = 'admin';
      finalVendorName = 'Admin';
    } else {
      finalVendorUid = vendorUid;
      finalVendorName = currentUser.restaurantName || currentUser.name || currentUser.email;
      
      console.log("✅ Using vendor UID for product:", finalVendorUid);
      console.log("✅ Using vendor name for product:", finalVendorName);
      
      if (!finalVendorUid) {
        throw new Error('Vendor UID not found. Please contact admin.');
      }
    }

    // ✅ UPDATED: Use sellingPrice instead of amount
    const sellingPrice = formData.sellingPrice || formData.originalPrice;
    const discountedAmount = formData.discountedAmount || '0';
    
    // ✅ CORRECTED: Handle custom unit logic
    const finalUnit = formData.unit === 'any' ? formData.customUnit : formData.unit;
    
    const productData = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      categoryId: formData.categoryId,
      categoryName: formData.categoryName || '',
      subCategoryName: formData.subCategoryName || '',
      subCategoryId: formData.subCategoryId || '',
      nestedSubCategoryName: formData.nestedSubCategoryName || '',
      nestedSubCategoryId: formData.nestedSubCategoryId || '',
      sellingPrice: parseFloat(sellingPrice), // ✅ CHANGED: amount → sellingPrice
      originalPrice: parseFloat(formData.originalPrice),
      discountedAmount: Math.max(0, parseFloat(discountedAmount)),
      foodType: formData.foodType || 'veg',
      size: formData.size || '',
      unit: finalUnit || '', // ✅ CORRECTED: Use the calculated finalUnit
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      priority: parseInt(formData.priority) || 0,
      status: formData.status || 'available',
      // Offer fields
      offerType: formData.offerType || 'none',
      buyX: formData.buyX ? parseInt(formData.buyX) : null,
      getY: formData.getY ? parseInt(formData.getY) : null,
      freeProductId: formData.freeProductId || null,
      maxQuantity: formData.maxQuantity ? parseInt(formData.maxQuantity) : 0,
      offerDescription: formData.offerDescription || generateOfferText(formData),
      // Vendor information
      vendorId: finalVendorUid,
      vendorName: finalVendorName,
      createdBy: currentUser.role || 'vendor',
      imageUrl: imageUrl,
      timestamp: Timestamp.now(),
    };

    console.log('✅ Final product data to save:', productData);

    // Remove empty fields
    Object.keys(productData).forEach(key => {
      if (productData[key] === '' || productData[key] === null || productData[key] === undefined) {
        delete productData[key];
      }
    });

    console.log('✅ Creating product with data:', productData);

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'products'), productData);
    
    console.log('✅ Product created with ID:', docRef.id);
    alert('Product created successfully!');
    router.push('/products');
  } catch (error) {
    console.error('❌ Error creating product:', error);
    alert('Failed to create product! ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      categoryName: '',
      categoryId: '',
      subCategoryName: '',
      subCategoryId: '',
      nestedSubCategoryName: '',
      nestedSubCategoryId: '',
      sellingPrice: '', // ✅ CHANGED: amount → sellingPrice
      originalPrice: '',
      discountedAmount: '0',
      foodType: 'veg',
      size: '',
      unit: '',
       customUnit: '',
      quantity: '',
      priority: '5',
      status: 'available',
      offerType: 'none',
      buyX: '',
      getY: '',
      freeProductId: '',
      maxQuantity: '',
      offerDescription: ''
    });
    setImage(null);
    setPreview('');
    setSubCategories([]);
    setNestedSubCategories([]);
  };

  if (!currentUser) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isVendor = currentUser.role === 'vendor';

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
              <h2 className="fw-bold text-dark mb-1">Create New Product</h2>
              <p className="text-muted mb-0">
                {isVendor ? 'Add a new food item to your menu' : 'Add a new product to the system'}
              </p>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div className="badge bg-primary bg-opacity-10 text-primary p-2">
                Logged in as: <strong>{currentUser.role.toUpperCase()}</strong>
              </div>
              {isVendor && (
                <div className="badge bg-success bg-opacity-10 text-success">
                  Vendor: {currentUser.name}
                </div>
              )}
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={resetForm}
                disabled={loading}
              >
                <Plus size={18} />
                Add Future Item
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4">
          <div className="card border-0 shadow-lg rounded-4">
            <div className="card-body p-4 p-md-5">
              <form onSubmit={handleSubmit}>
                {/* Table-like layout for form */}
                <div>
                  <table className="table table-borderless w-100">
                    <thead>
                      <tr>
                        <th width="20%" className="text-dark fw-semibold">
                          Field
                        </th>
                        <th width="80%" className="text-dark fw-semibold">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Product Name */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">
                            Product Name *
                          </label>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Enter product name"
                            required
                          />
                        </td>
                      </tr>

                      {/* Description */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">
                            Description
                          </label>
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
                          <label className="form-label fw-medium text-dark mb-0">
                            Food Type & Category
                          </label>
                        </td>
                        <td>
                          <div className="row g-3">
                            <div className="col-md-3">
                              <label className="form-label fw-medium text-dark mb-1">
                                Food Type
                              </label>
                              <select
                                className="form-select"
                                name="foodType"
                                value={formData.foodType}
                                onChange={handleInputChange}
                              >
                                {foodTypes.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label fw-medium text-dark mb-1">
                                Category *
                              </label>
                              <select
                                className="form-select"
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select Category</option>
                                {filteredCategories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {subCategories.length > 0 && (
                              <div className="col-md-3">
                                <label className="form-label fw-medium text-dark mb-1">
                                  Subcategory
                                </label>
                                <select
                                  className="form-select"
                                  name="subCategoryId"
                                  value={formData.subCategoryId}
                                  onChange={handleInputChange}
                                >
                                  <option value="">Select Subcategory</option>
                                  {subCategories.map((subCat) => (
                                    <option key={subCat.id} value={subCat.id}>
                                      {subCat.level > 0 ? "↳ " : ""}
                                      {subCat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {nestedSubCategories.length > 0 && (
                              <div className="col-md-3">
                                <label className="form-label fw-medium text-dark mb-1">
                                  Sub-Subcategory
                                </label>
                                <select
                                  className="form-select"
                                  name="nestedSubCategoryId"
                                  value={formData.nestedSubCategoryId}
                                  onChange={handleInputChange}
                                >
                                  <option value="">
                                    Select Sub-Subcategory
                                  </option>
                                  {nestedSubCategories.map((nestedCat) => (
                                    <option
                                      key={nestedCat.id}
                                      value={nestedCat.id}
                                    >
                                      {"↳ ".repeat(nestedCat.level)}
                                      {nestedCat.name}
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
                          <label className="form-label fw-medium text-dark mb-0">
                            Pricing
                          </label>
                        </td>
                        <td>
                          <div className="row">
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">
                                Original Price (₹) *
                              </label>
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
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">
                                Selling Price (₹) *
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                name="sellingPrice" // ✅ CHANGED: amount → sellingPrice
                                value={formData.sellingPrice}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                max={formData.originalPrice || ""}
                                required
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">
                                Discount Amount (₹)
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                name="discountedAmount"
                                value={formData.discountedAmount}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                readOnly
                              />
                              <small className="text-muted">
                                Auto-calculated
                              </small>
                            </div>
                          </div>
                          <small className="text-muted mt-2 d-block">
                            {formData.sellingPrice &&
                            formData.originalPrice &&
                            parseFloat(formData.sellingPrice) >
                              parseFloat(formData.originalPrice) ? (
                              <span className="text-danger">
                                Selling price cannot be more than original price
                              </span>
                            ) : (
                              "Selling price must be less than or equal to original price"
                            )}
                          </small>
                        </td>
                      </tr>

                      {/* Special Offers */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">
                            <Gift size={18} className="me-2" />
                            Special Offers
                          </label>
                        </td>
                        <td>
                          <div className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">
                                Offer Type
                              </label>
                              <select
                                className="form-select"
                                name="offerType"
                                value={formData.offerType}
                                onChange={handleInputChange}
                              >
                                {offerTypes.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Show these fields only when BXGY offer is selected */}
                            {(formData.offerType === "bxgy" ||
                              formData.offerType === "bxgyf") && (
                              <>
                                <div className="col-md-4">
                                  <label className="form-label fw-medium text-dark mb-1">
                                    Buy Quantity (X)
                                  </label>
                                  <input
                                    type="number"
                                    className="form-control"
                                    name="buyX"
                                    value={formData.buyX}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder="e.g., 2"
                                  />
                                </div>
                                <div className="col-md-4">
                                  <label className="form-label fw-medium text-dark mb-1">
                                    Get Free Quantity (Y)
                                  </label>
                                  <input
                                    type="number"
                                    className="form-control"
                                    name="getY"
                                    value={formData.getY}
                                    onChange={handleInputChange}
                                    min="1"
                                    placeholder="e.g., 1"
                                  />
                                </div>
                              </>
                            )}

                            {/* Show for different product offers */}
                            {(formData.offerType === "bogof" ||
                              formData.offerType === "bxgyf") && (
                              <div className="col-md-6">
                                <label className="form-label fw-medium text-dark mb-1">
                                  Free Product
                                </label>
                                <select
                                  className="form-select"
                                  name="freeProductId"
                                  value={formData.freeProductId}
                                  onChange={handleInputChange}
                                >
                                  <option value="">Select Free Product</option>
                                  {availableProducts.map((product) => (
                                    <option key={product.id} value={product.id}>
                                      {product.title} - ₹{product.sellingPrice || product.amount}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Maximum application limit */}
                            {formData.offerType !== "none" && (
                              <div className="col-md-4">
                                <label className="form-label fw-medium text-dark mb-1">
                                  Max Applications
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  name="maxQuantity"
                                  value={formData.maxQuantity}
                                  onChange={handleInputChange}
                                  min="1"
                                  placeholder="e.g., 5 (0 = unlimited)"
                                />
                                <small className="text-muted">
                                  Maximum times this offer can be applied per
                                  order (0 = unlimited)
                                </small>
                              </div>
                            )}

                            {/* Offer Description */}
                            {formData.offerType !== "none" && (
                              <div className="col-12">
                                <label className="form-label fw-medium text-dark mb-1">
                                  Offer Description
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="offerDescription"
                                  value={formData.offerDescription}
                                  onChange={handleInputChange}
                                  placeholder="e.g., Buy 2 Get 1 Free!"
                                />
                              </div>
                            )}
                          </div>

                          {/* Dynamic offer preview */}
                          {formData.offerType !== "none" && (
                            <div className="mt-3 p-3 bg-light rounded">
                              <h6 className="fw-semibold mb-2">
                                Offer Preview:
                              </h6>
                              <p className="mb-0 text-success fw-medium">
                                {generateOfferText(formData)}
                              </p>
                              {formData.maxQuantity && (
                                <small className="text-muted">
                                  Maximum {formData.maxQuantity} application(s)
                                  per order
                                </small>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

{/* Product Details */}
<tr>
  <td className="align-middle">
    <label className="form-label fw-medium text-dark mb-0">
      Product Details
    </label>
  </td>
  <td>
    <div className="row">
      <div className="col-md-4">
        <label className="form-label fw-medium text-dark mb-1">
          Size
        </label>
        <select
          className="form-select"
          name="size"
          value={formData.size}
          onChange={handleInputChange}
        >
          {sizes.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium text-dark mb-1">
          Unit
        </label>
        <select
          className="form-select"
          name="unit"
          value={formData.unit}
          onChange={handleInputChange}
        >
          {units.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
        
        {/* Custom Unit Input - Show only when "any" is selected */}
        {formData.unit === 'any' && (
          <div className="mt-2">
            <label className="form-label fw-medium text-dark mb-1">
              Custom Unit Name
            </label>
            <input
              type="text"
              className="form-control"
              name="customUnit"
              value={formData.customUnit || ''}
              onChange={handleInputChange}
              placeholder="Enter custom unit (e.g., bowl, plate, box)"
            />
          </div>
        )}
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium text-dark mb-1">
          Quantity
        </label>
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

                      {/* Priority & Status */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">
                            Priority & Status
                          </label>
                        </td>
                        <td>
                          <div className="row">
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">
                                Priority
                              </label>
                              <input
                                type="number"
                                className="form-control"
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                min="1"
                                max="1000"
                                placeholder="Enter priority (1-1000)"
                              />
                              <small className="text-muted">
                                Higher priority products appear first (1-1000)
                              </small>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label fw-medium text-dark mb-1">
                                Status
                              </label>
                              <select
                                className="form-select"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                              >
                                {statusOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <small className="text-muted">
                                Set product availability status
                              </small>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Image Upload */}
                      <tr>
                        <td className="align-middle">
                          <label className="form-label fw-medium text-dark mb-0">
                            Product Image *
                          </label>
                        </td>
                        <td>
                          <div
                            className="border-dashed border-2 rounded-3 p-4 text-center"
                            style={{
                              borderColor: "#dee2e6",
                              backgroundColor: "#f8f9fa",
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="d-none"
                              id="imageUpload"
                              onChange={handleImageChange}
                              required
                            />
                            <label
                              htmlFor="imageUpload"
                              className="cursor-pointer d-block"
                            >
                              <div className="py-3">
                                <Upload size={32} className="text-muted mb-2" />
                                <h6 className="fw-semibold text-dark mb-1">
                                  Click to upload product image
                                </h6>
                                <p className="text-muted mb-0 small">
                                  PNG, JPG, WEBP up to 10MB
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
                                style={{
                                  maxHeight: "200px",
                                  objectFit: "cover",
                                }}
                              />
                              <div className="mt-1">
                                <small className="text-muted">
                                  Image Preview
                                </small>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

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

                  <button
                    type="submit"
                    className="btn btn-primary px-4 py-2 d-flex align-items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div
                          className="spinner-border spinner-border-sm"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Creating Product...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Create Product
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}