'use server';

import { db } from '../../firebase/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

// Helper to convert Firestore data to plain objects (NO FUNCTIONS)
const sanitizeDataForClient = (data) => {
  if (data && typeof data === 'object') {
    // Handle Timestamp - convert to ISO string directly
    if (data instanceof Timestamp) {
      return data.toDate().toISOString();
    }
    
    // Handle Arrays
    if (Array.isArray(data)) {
      return data.map(item => sanitizeDataForClient(item));
    }
    
    // Handle regular objects
    const sanitized = {};
    for (const key in data) {
      if (data.hasOwnProperty(key) && typeof data[key] !== 'function') {
        sanitized[key] = sanitizeDataForClient(data[key]);
      }
    }
    return sanitized;
  }
  return data;
};

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

// ✅ Get all vendors for admin dropdown
export async function getAllVendors() {
  try {
    const q = query(collection(db, 'vendors'));
    const querySnapshot = await getDocs(q);
    const vendors = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...sanitizeDataForClient(doc.data()),
    }));
    return { success: true, vendors };
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return { success: false, error: 'Failed to load vendors', vendors: [] };
  }
}

// ✅ Get Vendor UID from email
export async function getVendorUid(email) {
  try {
    if (!email) {
      console.error('No email provided to getVendorUid');
      return null;
    }

    const vendorsQuery = query(
      collection(db, 'vendors'),
      where('email', '==', email)
    );
    
    const vendorsSnapshot = await getDocs(vendorsQuery);
    if (!vendorsSnapshot.empty) {
      const vendorId = vendorsSnapshot.docs[0].id;
      console.log('Found vendor UID:', vendorId, 'for email:', email);
      return vendorId;
    }
    
    console.log('No vendor found for email:', email);
    return null;
  } catch (error) {
    console.error('Error getting vendor UID:', error);
    return null;
  }
}

// ✅ Fetch categories with vendor filtering
export async function getCategories(vendorUid = null) {
  try {
    let q;
    
    // Validate vendorUid before using in query
    if (vendorUid && typeof vendorUid === 'string' && vendorUid.trim() !== '') {
      console.log('Fetching categories for vendor:', vendorUid);
      q = query(
        collection(db, 'categories'), 
        where('vendorId', '==', vendorUid),
        where('isMainCategory', '==', true)
      );
    } else {
      console.log('Fetching all categories (no vendor filter)');
      q = query(collection(db, 'categories'), where('isMainCategory', '==', true));
    }
    
    const querySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...sanitizeDataForClient(doc.data()),
    }));
    
    console.log(`Fetched ${categories.length} categories`);
    return { success: true, categories };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: 'Failed to load categories', categories: [] };
  }
}

// ✅ Fetch subcategories with vendor filtering
export async function getSubCategories(parentId, level = 0, vendorUid = null) {
  try {
    let q;
    
    // Validate vendorUid before using in query
    if (vendorUid && typeof vendorUid === 'string' && vendorUid.trim() !== '') {
      q = query(
        collection(db, 'categories'), 
        where('parentCategory', '==', parentId),
        where('vendorId', '==', vendorUid)
      );
    } else {
      q = query(collection(db, 'categories'), where('parentCategory', '==', parentId));
    }
    
    const querySnapshot = await getDocs(q);
    const subCategories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...sanitizeDataForClient(doc.data()),
      level: level
    }));
    return { success: true, subCategories };
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return { success: false, error: 'Failed to load subcategories', subCategories: [] };
  }
}

// ✅ Fetch products with vendor filtering - FIXED VERSION
export async function getProducts(vendorUid = null, selectedVendorId = null) {
  try {
    let q;
    
    console.log('getProducts called with:', { vendorUid, selectedVendorId });

    // Case 1: Admin filtering by specific vendor
    if (selectedVendorId && selectedVendorId !== 'all') {
      console.log('Filtering by selected vendor:', selectedVendorId);
      q = query(
        collection(db, 'products'), 
        where('vendorId', '==', selectedVendorId)
      );
    }
    // Case 2: Vendor viewing their own products
    else if (vendorUid && typeof vendorUid === 'string' && vendorUid.trim() !== '') {
      console.log('Filtering by vendor UID:', vendorUid);
      q = query(
        collection(db, 'products'), 
        where('vendorId', '==', vendorUid)
      );
    }
    // Case 3: Admin viewing all products (no filters)
    else {
      console.log('Fetching all products (no vendor filter)');
      q = query(collection(db, 'products'));
    }
    
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...sanitizeDataForClient(doc.data()),
    }));
    
    console.log(`Fetched ${products.length} products`);
    return { success: true, products };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, error: 'Failed to load products', products: [] };
  }
}

// ✅ Create product with vendor UID - UPDATED VERSION
export async function createProduct(formData) {
  try {
    const {
      title,
      description,
      categoryId,
      categoryName,
      subCategoryId,
      subCategoryName,
      nestedSubCategoryId,
      nestedSubCategoryName,
      sellingPrice, // ✅ UPDATED: amount → sellingPrice
      originalPrice,
      foodType,
      size,
      unit,
      customUnit, // ✅ ADDED: Custom unit field
      quantity,
      priority,
      status,
      offerType,
      buyX,
      getY,
      freeProductId,
      maxQuantity,
      offerDescription,
      imageFile,
      currentUser,
      vendorUid,
      restaurantName
    } = formData;

    console.log('Creating product with vendorUid:', vendorUid);

    // Validate required fields including vendorUid
    if (!title || !categoryId || !originalPrice || !imageFile) {
      return { success: false, error: 'Please fill all required fields and upload an image.' };
    }

    // CRITICAL: Validate vendorUid
    if (!vendorUid || typeof vendorUid !== 'string' || vendorUid.trim() === '') {
      console.error('Invalid vendorUid:', vendorUid);
      return { success: false, error: 'Vendor authentication failed. Please log in again.' };
    }

    // ✅ ADDED: Validate custom unit when "any" is selected
    if (unit === 'any' && !customUnit) {
      return { success: false, error: 'Please enter a custom unit name when "Any (custom)" is selected.' };
    }

    // Upload image to Firebase Storage
    const storage = getStorage();
    const imageRef = ref(storage, `products/${Date.now()}-${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(imageRef);

    // ✅ UPDATED: Use sellingPrice instead of amount
    const finalSellingPrice = sellingPrice || originalPrice;
    const discountedAmount = parseFloat(originalPrice) - parseFloat(finalSellingPrice);

    // ✅ UPDATED: Handle custom unit
    const finalUnit = unit === 'any' ? customUnit : unit;

    // Prepare product data
    const productData = {
      title: title.trim(),
      description: description?.trim() || '',
      categoryId,
      categoryName: categoryName || '',
      subCategoryId: subCategoryId || '',
      subCategoryName: subCategoryName || '',
      nestedSubCategoryId: nestedSubCategoryId || '',
      nestedSubCategoryName: nestedSubCategoryName || '',
      sellingPrice: parseFloat(finalSellingPrice), // ✅ UPDATED: amount → sellingPrice
      originalPrice: parseFloat(originalPrice),
      discountedAmount: Math.max(0, discountedAmount),
      foodType: foodType || 'veg',
      size: size || '',
      unit: finalUnit || '', // ✅ UPDATED: Use custom unit if "any" is selected
      quantity: quantity ? parseFloat(quantity) : null,
      priority: parseInt(priority) || 0,
      status: status || 'available',
      // Offer fields
      offerType: offerType || 'none',
      buyX: buyX ? parseInt(buyX) : null,
      getY: getY ? parseInt(getY) : null,
      freeProductId: freeProductId || null,
      maxQuantity: maxQuantity ? parseInt(maxQuantity) : 0,
      offerDescription: offerDescription || generateOfferText({ offerType, buyX, getY }),
      // Vendor information - CRITICAL: Always include vendorId
      vendorId: vendorUid, // This must be a valid string
      vendorName: currentUser?.name || currentUser?.restaurantName || 'Unknown Vendor',
      createdBy: currentUser?.role || 'vendor',
      imageUrl,
      timestamp: Timestamp.now(),
    };

    console.log('Product data to save:', productData);

    // Remove empty fields
    Object.keys(productData).forEach(key => {
      if (productData[key] === null || productData[key] === undefined || productData[key] === '') {
        delete productData[key];
      }
    });

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'products'), productData);
    
    console.log('Product created successfully with ID:', docRef.id);
    return { 
      success: true, 
      message: 'Product created successfully!',
      productId: docRef.id 
    };

  } catch (error) {
    console.error('Error creating product:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create product. Please try again.' 
    };
  }
}

// ✅ Delete product with vendor validation
export async function deleteProduct(productId, vendorUid = null) {
  try {
    if (vendorUid && typeof vendorUid === 'string' && vendorUid.trim() !== '') {
      // For vendors, verify they own the product before deleting
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (!productDoc.exists()) {
        return { success: false, error: 'Product not found' };
      }
      
      const productData = productDoc.data();
      if (productData.vendorId !== vendorUid) {
        return { success: false, error: 'You can only delete your own products' };
      }
    }
    
    await deleteDoc(doc(db, 'products', productId));
    return { success: true, message: 'Product deleted successfully!' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

// ✅ Update product status with vendor validation
export async function updateProductStatus(productId, newStatus, vendorUid = null) {
  try {
    if (vendorUid && typeof vendorUid === 'string' && vendorUid.trim() !== '') {
      // For vendors, verify they own the product before updating
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (!productDoc.exists()) {
        return { success: false, error: 'Product not found' };
      }
      
      const productData = productDoc.data();
      if (productData.vendorId !== vendorUid) {
        return { success: false, error: 'You can only update your own products' };
      }
    }
    
    await updateDoc(doc(db, 'products', productId), {
      status: newStatus
    });
    
    return { success: true, message: 'Status updated successfully!' };
  } catch (error) {
    console.error('Error updating status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}