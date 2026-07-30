import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mini ERP + CRM database...');

  // 1. Seed Users for 4 Roles
  const usersData = [
    { name: 'Admin User', email: 'admin@minierp.com', password: await bcrypt.hash('Admin@123', 10), role: Role.ADMIN },
    { name: 'Sales Representative', email: 'sales@minierp.com', password: await bcrypt.hash('Sales@123', 10), role: Role.SALES },
    { name: 'Warehouse Manager', email: 'warehouse@minierp.com', password: await bcrypt.hash('Warehouse@123', 10), role: Role.WAREHOUSE },
    { name: 'Accounts Officer', email: 'accounts@minierp.com', password: await bcrypt.hash('Accounts@123', 10), role: Role.ACCOUNTS },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.password, role: u.role, name: u.name },
      create: u,
    });
  }
  console.log('✔ Seeded 4 role users successfully.');

  // 2. Seed Sample Customers
  await prisma.customer.upsert({
    where: { id: 'c1111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'c1111111-1111-1111-1111-111111111111',
      name: 'Rajesh Kumar',
      mobile: '+919876543210',
      email: 'rajesh@apexwholesalers.com',
      businessName: 'Apex Wholesalers Pvt Ltd',
      gst: '27AAAAA0000A1Z5',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 42, Industrial Area Phase II, Mumbai',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-05'),
      notes: 'Key distributor for Western Region',
      followUps: {
        create: [
          {
            note: 'Initial meeting held. Requested catalog and bulk pricing.',
            followUpDate: new Date('2026-07-20'),
            createdBy: 'Sales Representative'
          },
          {
            note: 'Agreed on 15% volume discount terms. Converting to active status.',
            followUpDate: new Date('2026-07-25'),
            createdBy: 'Sales Representative'
          }
        ]
      }
    }
  });

  await prisma.customer.upsert({
    where: { id: 'c2222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: 'c2222222-2222-2222-2222-222222222222',
      name: 'Anita Sharma',
      mobile: '+919812345678',
      email: 'anita@metroretailers.in',
      businessName: 'Metro Retail Mart',
      gst: '27BBBBB1111B1Z2',
      customerType: CustomerType.RETAIL,
      address: 'Shop 12, Main Street, Delhi',
      status: CustomerStatus.LEAD,
      followUpDate: new Date('2026-08-01'),
      notes: 'Interested in electronic hardware stock',
      followUps: {
        create: [
          {
            note: 'Sent introductory catalog via email.',
            followUpDate: new Date('2026-07-26'),
            createdBy: 'Sales Representative'
          }
        ]
      }
    }
  });
  console.log('✔ Seeded sample CRM customers and follow-ups.');

  // 3. Seed Sample Products & Initial Stock Movements
  await prisma.product.upsert({
    where: { sku: 'SKU-ELEC-1001' },
    update: {},
    create: {
      name: 'Wireless Ergonomic Mouse',
      sku: 'SKU-ELEC-1001',
      category: 'Electronics',
      unitPrice: 450.00,
      currentStock: 100,
      minStockAlert: 20,
      location: 'Rack A-12',
      stockMovements: {
        create: [
          {
            quantity: 100,
            type: MovementType.IN,
            reason: 'Initial stock intake batch #1001',
            createdBy: 'Warehouse Manager'
          }
        ]
      }
    }
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-ELEC-2002' },
    update: {},
    create: {
      name: 'Mechanical RGB Keyboard',
      sku: 'SKU-ELEC-2002',
      category: 'Electronics',
      unitPrice: 1850.00,
      currentStock: 15, // Below min alert threshold (25)!
      minStockAlert: 25,
      location: 'Rack B-04',
      stockMovements: {
        create: [
          {
            quantity: 15,
            type: MovementType.IN,
            reason: 'Initial stock intake batch #1002',
            createdBy: 'Warehouse Manager'
          }
        ]
      }
    }
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-OFF-3003' },
    update: {},
    create: {
      name: 'Heavy Duty Paper Shredder',
      sku: 'SKU-OFF-3003',
      category: 'Office Supplies',
      unitPrice: 3200.00,
      currentStock: 50,
      minStockAlert: 10,
      location: 'Warehouse Floor Bay 2',
      stockMovements: {
        create: [
          {
            quantity: 50,
            type: MovementType.IN,
            reason: 'Initial stock intake batch #1003',
            createdBy: 'Warehouse Manager'
          }
        ]
      }
    }
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-AUDIO-999' },
    update: {},
    create: {
      name: 'Limited Stock Headphones',
      sku: 'SKU-AUDIO-999',
      category: 'Audio',
      unitPrice: 1200.00,
      currentStock: 5, // Exactly 5 units for insufficient stock demo test!
      minStockAlert: 2,
      location: 'Cabinet 4',
      stockMovements: {
        create: [
          {
            quantity: 5,
            type: MovementType.IN,
            reason: 'Initial stock intake batch #1004',
            createdBy: 'Warehouse Manager'
          }
        ]
      }
    }
  });
  console.log('✔ Seeded sample products & initial inventory logs (including Limited Stock Headphones).');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
