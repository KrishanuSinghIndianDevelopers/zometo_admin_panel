'use server';

import { db } from '../../firebase/firebase';
import { collection, addDoc, Timestamp, getDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData) {
  try {
    // Extract form data
    const name = formData.get('name');
    const foodType = formData.get('foodType');
    const isLast = formData.get('isLast') === 'true';
    const isMainCategory = formData.get('isMainCategory') === 'true';
    const vendorDocumentId = formData.get('vendorUid');
    const vendorAuthUid = formData.get('vendorAuthUid');
    const currentUserData = formData.get('currentUser');
    const imageFile = formData.get('imageFile');
    const userRole = formData.get('userRole');
    const isAdminCategory = formData.get('isAdminCategory') === 'true';
    const parentId = formData.get('parentId');

    console.log('🔄 Server Action - Creating category:', { 
      name, 
      parentId,
      isMainCategory,
      userRole
    });

    // Validation
    if (!name || !name.trim()) {
      return { success: false, error: 'Category name is required' };
    }

    // ✅ UPDATED: Admin ke liye vendor validation skip karein
    const isAdminUser = userRole === 'admin' || userRole === 'main_admin';
    if (!isAdminUser && !vendorDocumentId) {
      return { success: false, error: 'Vendor information is missing' };
    }

    let currentUser = {};
    try {
      currentUser = currentUserData ? JSON.parse(currentUserData) : {};
    } catch (parseError) {
      console.log('⚠️ Could not parse current user data');
    }

    // ✅ CRITICAL: Food Type inheritance for subcategories
    let finalFoodType = foodType || 'veg'; // Default
    
    if (parentId) {
      // Subcategory hai - parent se foodType inherit karein
      try {
        const parentDoc = await getDoc(doc(db, 'categories', parentId));
        if (parentDoc.exists()) {
          const parentData = parentDoc.data();
          finalFoodType = parentData.foodType || 'veg';
          console.log('✅ Inherited foodType from parent:', finalFoodType);
        } else {
          console.log('⚠️ Parent category not found, using default foodType');
        }
      } catch (parentError) {
        console.error('❌ Error fetching parent category:', parentError);
      }
    } else {
      // Main category hai - client se foodType use karein
      console.log('✅ Using provided foodType for main category:', foodType);
    }

    let imageUrl = '';
    
    // Upload image if exists
    if (imageFile && imageFile.size > 0) {
      try {
        console.log('📁 Uploading image...');
        const storage = getStorage();
        const fileName = `category_${Date.now()}_${imageFile.name}`;
        const imageRef = ref(storage, `categories/${fileName}`);
        
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
        console.log('✅ Image uploaded:', imageUrl);
        
      } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
      }
    }

    // ✅ UPDATED: Admin aur Vendor ke liye alag data structure
    let categoryData = {
      // Basic info
      name: name.trim(),
      foodType: finalFoodType, // ✅ Inherited ya provided foodType
      
      // ✅ CRITICAL: Set parentCategory
      parentCategory: parentId || '',
      
      // Category structure
      isMainCategory: Boolean(isMainCategory),
      isLast: Boolean(isLast),
      
      // Media
      imageUrl: imageUrl,
      
      // Timestamps
      timestamp: Timestamp.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Status
      status: 'active',
      isActive: true,
    };

    // ✅ ADMIN vs VENDOR data
    if (isAdminUser) {
      // ADMIN: Global category with admin flags
      categoryData = {
        ...categoryData,
        vendorId: 'admin',
        vendorUid: 'admin', 
        vendorDocumentId: 'admin',
        vendorAuthUid: 'admin',
        vendorName: 'System Administrator',
        vendorEmail: 'admin@system',
        createdBy: userRole,
        isAdminCategory: true,
        isGlobal: true,
        accessibleToAll: true
      };
    } else {
      // VENDOR: Vendor-specific category
      categoryData = {
        ...categoryData,
        vendorId: vendorDocumentId,
        vendorUid: vendorDocumentId,
        vendorDocumentId: vendorDocumentId,
        vendorAuthUid: vendorAuthUid,
        vendorName: currentUser?.restaurantName || currentUser?.name || 'Unknown Vendor',
        vendorEmail: currentUser?.email || '',
        createdBy: currentUser?.role || 'vendor',
        isAdminCategory: false,
        isGlobal: false,
        accessibleToAll: false
      };
    }

    console.log('💾 Saving category to Firestore:', {
      name: categoryData.name,
      foodType: categoryData.foodType,
      parentCategory: categoryData.parentCategory,
      isMainCategory: categoryData.isMainCategory,
      vendorId: categoryData.vendorId
    });

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'categories'), categoryData);
    
    console.log('✅ Category created successfully! ID:', docRef.id);
    
    // Revalidate the categories page
    revalidatePath('/categories');
    
    return { 
      success: true, 
      message: 'Category created successfully!',
      categoryId: docRef.id,
      categoryName: name,
      createdBy: userRole,
      foodType: finalFoodType,
      redirectUrl: '/categories'
    };

  } catch (error) {
    console.error('❌ Server Action Error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create category' 
    };
  }
}