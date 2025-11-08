// app/actions/categoryActionServer.js
'use server';

import { db } from '../../firebase/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function createCategory(formData) {
  try {
    // Extract form data
    const name = formData.get('name')?.toString()?.trim();
    const foodType = formData.get('foodType')?.toString() || 'veg';
    const isLast = formData.get('isLast') === 'true';
    const vendorDocumentId = formData.get('vendorUid')?.toString();
    const userRole = formData.get('userRole')?.toString() || 'vendor';
    const priority = parseInt(formData.get('priority')?.toString() || '5');
    const parentId = formData.get('parentId')?.toString();
    const imageUrl = formData.get('imageUrl')?.toString() || ''; // ✅ Get uploaded image URL

    console.log('📦 Creating category:', { name, userRole, parentId, hasImage: !!imageUrl });

    // Validation
    if (!name) {
      return { success: false, error: 'Category name is required' };
    }

    const isAdminUser = userRole === 'admin' || userRole === 'main_admin';
    const isVendor = userRole === 'vendor';
    
    if (!isAdminUser && !isVendor) {
      return { success: false, error: 'Permission denied' };
    }

    if (isVendor && !vendorDocumentId) {
      return { success: false, error: 'Vendor information missing' };
    }

    // Prepare category data
    const categoryData = {
      // Basic info
      name: name,
      foodType: foodType,
      priority: priority,
      isLast: isLast,
      
      // Parent category info
      parentCategory: parentId || '',
      isMainCategory: !parentId,
      
      // Media (now properly set from client-side upload)
      imageUrl: imageUrl,
      
      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      
      // Status
      status: isVendor ? 'pending' : 'approved',
      isActive: !isVendor,
    };

    // Add role-specific data
    if (isAdminUser) {
      // Admin categories
      Object.assign(categoryData, {
        vendorId: 'admin',
        vendorName: 'System Administrator',
        restaurantName: 'Admin Categories',
        createdBy: userRole,
        isAdminCategory: true,
        isGlobal: true,
        accessibleToAll: true,
      });
    } else {
      // Vendor categories
      Object.assign(categoryData, {
        vendorId: vendorDocumentId,
        vendorName: 'Vendor',
        restaurantName: 'Vendor Restaurant',
        createdBy: 'vendor',
        isAdminCategory: false,
        isGlobal: false,
        accessibleToAll: false,
      });
    }

    console.log('💾 Saving to database...');

    // Save to appropriate collection
    let docRef;
    if (isVendor) {
      // Vendor pending categories
      docRef = await addDoc(collection(db, 'pending_categories'), {
        ...categoryData,
        requestedBy: vendorDocumentId,
        requestedAt: Timestamp.now()
      });
      console.log('✅ Saved to pending_categories:', docRef.id);
    } else {
      // Admin approved categories
      docRef = await addDoc(collection(db, 'categories'), categoryData);
      console.log('✅ Saved to categories:', docRef.id);
    }

    return { 
      success: true, 
      message: isVendor ? 
        'Category submitted for approval!' : 
        'Category created successfully!',
      categoryId: docRef.id
    };

  } catch (error) {
    console.error('❌ Server Action Error:', error);
    
    let errorMessage = 'Failed to create category';
    if (error.message.includes('quota')) {
      errorMessage = 'Storage quota exceeded.';
    } else if (error.message.includes('permission-denied')) {
      errorMessage = 'Permission denied. Please check your Firebase rules.';
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}