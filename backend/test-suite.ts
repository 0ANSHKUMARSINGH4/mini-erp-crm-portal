import axios from 'axios';

// Target the live Render backend API URL by default, fallback to process.env.TEST_BASE_URL
const API_BASE = process.env.TEST_BASE_URL || 'https://mini-erp-crm-portal.onrender.com/api';

async function runTests() {
  console.log('====================================================');
  console.log(`Starting Mini ERP + CRM Integration Test Suite`);
  console.log(`Targeting LIVE Backend API: ${API_BASE}`);
  console.log('====================================================\n');

  let adminToken = '';
  let salesToken = '';
  const timestamp = Date.now();

  // ----------------------------------------------------
  // MODULE 1: AUTH & ROLES
  // ----------------------------------------------------
  console.log('--- Module 1: Auth & RBAC Tests ---');

  // Test 1.1: Successful Admin Login
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@minierp.com',
      password: 'Admin@123'
    });
    adminToken = res.data.token;
    console.log('✔ [200 OK] Admin login successful on LIVE backend. Token acquired.');
  } catch (err: any) {
    console.error('❌ Admin login failed:', err.response?.data || err.message);
  }

  // Test 1.2: Successful Sales Login
  try {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'sales@minierp.com',
      password: 'Sales@123'
    });
    salesToken = res.data.token;
    console.log('✔ [200 OK] Sales login successful on LIVE backend.');
  } catch (err: any) {
    console.error('❌ Sales login failed:', err.response?.data || err.message);
  }

  // Test 1.3: Deliberate Failure - Invalid Password
  try {
    await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@minierp.com',
      password: 'WrongPassword'
    });
    console.error('❌ FAIL: Expected 401 Unauthorized for bad password, but request succeeded.');
  } catch (err: any) {
    if (err.response?.status === 401) {
      console.log('✔ [DELIBERATE FAILURE TEST PASS] 401 Unauthorized received for wrong password as expected.');
    } else {
      console.error('❌ Unexpected error for wrong password:', err.response?.data || err.message);
    }
  }

  // Test 1.4: Deliberate Failure - Role RBAC Guard
  try {
    // Sales role attempting to create a product (only Admin and Warehouse allowed)
    await axios.post(
      `${API_BASE}/products`,
      {
        name: 'Forbidden Product',
        sku: `FORBIDDEN-${timestamp}`,
        category: 'Test',
        unitPrice: 100,
        initialStock: 10,
        location: 'Bay 1'
      },
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    console.error('❌ FAIL: Expected 403 Forbidden for Sales creating product.');
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log('✔ [DELIBERATE FAILURE TEST PASS] 403 Forbidden enforced for unauthorized role as expected.');
    } else {
      console.error('❌ Unexpected error for RBAC guard:', err.response?.data || err.message);
    }
  }

  // ----------------------------------------------------
  // MODULE 2: CUSTOMER CRM
  // ----------------------------------------------------
  console.log('\n--- Module 2: Customer CRM Tests ---');
  let createdCustomerId = '';

  // Test 2.1: Add Customer
  try {
    const res = await axios.post(
      `${API_BASE}/customers`,
      {
        name: `Suresh Patel ${timestamp}`,
        mobile: `+91998877${timestamp.toString().slice(-4)}`,
        email: `suresh_${timestamp}@pateltraders.com`,
        businessName: `Patel Trading Co ${timestamp}`,
        gst: '27GHIJK9999L1Z9',
        customerType: 'WHOLESALE',
        address: '101 Market Yard, Pune',
        status: 'LEAD',
        notes: 'Initial inquiry received for quarterly order'
      },
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    createdCustomerId = res.data.customer.id;
    console.log(`✔ [201 Created] Customer created on LIVE DB. ID: ${createdCustomerId}`);
  } catch (err: any) {
    console.error('❌ Create customer failed:', err.response?.data || err.message);
  }

  // Test 2.2: Deliberate Failure - Missing required fields (Zod validation 422)
  try {
    await axios.post(
      `${API_BASE}/customers`,
      {
        name: 'Invalid Customer'
        // Missing mobile, email, businessName, address
      },
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    console.error('❌ FAIL: Expected 422 for missing required fields.');
  } catch (err: any) {
    if (err.response?.status === 422) {
      console.log('✔ [DELIBERATE FAILURE TEST PASS] 422 Unprocessable Entity received for input validation error as expected.');
    } else {
      console.error('❌ Unexpected error for Zod validation:', err.response?.data || err.message);
    }
  }

  // Test 2.3: List Customers with Search & Pagination
  try {
    const res = await axios.get(`${API_BASE}/customers?search=Patel&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    console.log(`✔ [200 OK] Customer list fetched from LIVE backend (${res.data.customers.length} match search query).`);
  } catch (err: any) {
    console.error('❌ List customers failed:', err.response?.data || err.message);
  }

  // Test 2.4: Add Follow-up Note
  try {
    const res = await axios.post(
      `${API_BASE}/customers/${createdCustomerId}/follow-ups`,
      {
        note: 'Followed up via telephone. Agreed to send sample products next week.',
        followUpDate: new Date('2026-08-10').toISOString()
      },
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    console.log('✔ [201 Created] Follow-up note added to customer history on LIVE DB.');
  } catch (err: any) {
    console.error('❌ Add follow-up failed:', err.response?.data || err.message);
  }

  // ----------------------------------------------------
  // MODULE 3: PRODUCT & INVENTORY
  // ----------------------------------------------------
  console.log('\n--- Module 3: Product & Inventory Tests ---');
  let testProductId = '';
  const testSku = `SKU-NET-${timestamp.toString().slice(-6)}`;

  // Test 3.1: Create Product
  try {
    const res = await axios.post(
      `${API_BASE}/products`,
      {
        name: 'High Performance Router AC1200',
        sku: testSku,
        category: 'Networking',
        unitPrice: 2499.00,
        initialStock: 20,
        minStockAlert: 5,
        location: 'Warehouse Shelf B3'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testProductId = res.data.product.id;
    console.log(`✔ [201 Created] Product created on LIVE DB. ID: ${testProductId}, Initial Stock: ${res.data.product.currentStock}`);
  } catch (err: any) {
    console.error('❌ Create product failed:', err.response?.data || err.message);
  }

  // Test 3.2: Deliberate Failure - Duplicate SKU (409 Conflict)
  try {
    await axios.post(
      `${API_BASE}/products`,
      {
        name: 'Duplicate Router',
        sku: testSku, // Duplicate!
        category: 'Networking',
        unitPrice: 2000.00,
        initialStock: 10,
        minStockAlert: 5,
        location: 'Shelf B3'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.error('❌ FAIL: Expected 409 Conflict for duplicate SKU.');
  } catch (err: any) {
    if (err.response?.status === 409) {
      console.log('✔ [DELIBERATE FAILURE TEST PASS] 409 Conflict returned for duplicate SKU as expected.');
    } else {
      console.error('❌ Unexpected error for duplicate SKU:', err.response?.data || err.message);
    }
  }

  // Test 3.3: Deliberate Failure - Direct edit of currentStock (422 Unprocessable Entity)
  try {
    await axios.put(
      `${API_BASE}/products/${testProductId}`,
      {
        name: 'Updated Router Name',
        currentStock: 999 // Prohibited direct edit!
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.error('❌ FAIL: Expected 422 error when attempting direct currentStock edit.');
  } catch (err: any) {
    if (err.response?.status === 422) {
      console.log('✔ [DELIBERATE FAILURE TEST PASS] 422 error rejected direct currentStock mutation as expected.');
    } else {
      console.error('❌ Unexpected response for direct stock mutation:', err.response?.data || err.message);
    }
  }

  // Test 3.4: Manual Stock IN Movement
  try {
    const res = await axios.post(
      `${API_BASE}/stock-movements`,
      {
        productId: testProductId,
        quantity: 10,
        type: 'IN',
        reason: 'Shipment container restock #9901'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✔ [201 Created] Stock IN movement logged on LIVE DB. New product stock: ${res.data.product.currentStock}`);
  } catch (err: any) {
    console.error('❌ Stock movement failed:', err.response?.data || err.message);
  }

  // ----------------------------------------------------
  // MODULE 4: SALES CHALLAN & ATOMIC STOCK DEDUCTION
  // ----------------------------------------------------
  console.log('\n--- Module 4: Sales Challan Tests ---');

  // Create a product with strictly 5 units in stock for testing stock insufficiency
  let limitedProductId = '';
  const limitedSku = `SKU-AUD-${timestamp.toString().slice(-6)}`;
  try {
    const res = await axios.post(
      `${API_BASE}/products`,
      {
        name: 'Limited Stock Headphones',
        sku: limitedSku,
        category: 'Audio',
        unitPrice: 1200.00,
        initialStock: 5,
        minStockAlert: 2,
        location: 'Cabinet 4'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    limitedProductId = res.data.product.id;
  } catch (err: any) {
    console.error('Failed to setup limited stock product:', err.message);
  }

  // Test 4.1: Create Draft Challan
  let draftChallanId = '';
  try {
    const res = await axios.post(
      `${API_BASE}/challans`,
      {
        customerId: createdCustomerId,
        status: 'DRAFT',
        notes: 'Urgent wholesale supply order',
        items: [
          { productId: limitedProductId, quantity: 15 } // Wants 15, but only 5 in stock!
        ]
      },
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    draftChallanId = res.data.challan.id;
    console.log(`✔ [201 Created] Draft Challan ${res.data.challan.challanNumber} created on LIVE DB.`);
  } catch (err: any) {
    console.error('❌ Create draft challan failed:', err.response?.data || err.message);
  }

  // Test 4.2: CRITICAL DELIBERATE FAILURE - Confirm Challan with Insufficient Stock (422 Error)
  try {
    await axios.post(
      `${API_BASE}/challans/${draftChallanId}/confirm`,
      {},
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    console.error('❌ FAIL: Expected 422 error when confirming challan with insufficient stock!');
  } catch (err: any) {
    if (err.response?.status === 422) {
      console.log('✔ [CRITICAL DELIBERATE FAILURE TEST PASS] 422 Error correctly rejected Challan confirmation due to insufficient stock!');
      console.log('   Error Message received:', err.response.data.error.message);
    } else {
      console.error('❌ Unexpected response for stock insufficiency:', err.response?.data || err.message);
    }
  }

  // Test 4.3: Create and Confirm Valid Challan (quantity = 3 <= stock 5)
  let validChallanId = '';
  try {
    const res = await axios.post(
      `${API_BASE}/challans`,
      {
        customerId: createdCustomerId,
        status: 'CONFIRMED',
        notes: 'Normal wholesale order',
        items: [
          { productId: limitedProductId, quantity: 3 } // Valid: stock 5 - 3 = 2 remaining
        ]
      },
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    validChallanId = res.data.challan.id;
    console.log(`✔ [201 Created] Confirmed Challan ${res.data.challan.challanNumber} created. Stock atomically decremented on LIVE DB.`);
  } catch (err: any) {
    console.error('❌ Create confirmed challan failed:', err.response?.data || err.message);
  }

  // Verify updated product stock
  try {
    const res = await axios.get(`${API_BASE}/products/${limitedProductId}`, {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    console.log(`   Product 'Limited Stock Headphones' remaining stock after confirmation: ${res.data.product.currentStock} (Expected: 2)`);
  } catch (err: any) {
    console.error('❌ Get product failed:', err.message);
  }

  // Test 4.4: Cancel Confirmed Challan and Verify Stock Reversal
  try {
    const res = await axios.post(
      `${API_BASE}/challans/${validChallanId}/cancel`,
      {},
      { headers: { Authorization: `Bearer ${salesToken}` } }
    );
    console.log(`✔ [200 OK] Sales Challan ${res.data.challan.challanNumber} cancelled.`);
  } catch (err: any) {
    console.error('❌ Cancel challan failed:', err.response?.data || err.message);
  }

  // Verify restored product stock
  try {
    const res = await axios.get(`${API_BASE}/products/${limitedProductId}`, {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    console.log(`   Product 'Limited Stock Headphones' stock after cancellation: ${res.data.product.currentStock} (Expected: 5 restored)`);
  } catch (err: any) {
    console.error('❌ Get product failed:', err.message);
  }

  console.log('\n====================================================');
  console.log('ALL MODULE INTEGRATION & FAILURE TESTS COMPLETED ON LIVE BACKEND!');
  console.log('====================================================');
}

runTests();
