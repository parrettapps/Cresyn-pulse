import { db } from '@cresyn/db';
import { companies, contacts, users, userTenantMemberships } from '@cresyn/db/schema';
import { eq } from 'drizzle-orm';

// Sample data
const CUSTOMERS = [
  { name: 'The Home Depot', website: 'homedepot.com', city: 'Atlanta', state: 'GA', email: 'business@homedepot.com', phone: '(770) 433-8211' },
  { name: 'Best Buy', website: 'bestbuy.com', city: 'Richfield', state: 'MN', email: 'corporate@bestbuy.com', phone: '(612) 291-1000' },
  { name: 'eBay Inc.', website: 'ebay.com', city: 'San Jose', state: 'CA', email: 'info@ebay.com', phone: '(408) 376-7400' },
  { name: 'Target Corporation', website: 'target.com', city: 'Minneapolis', state: 'MN', email: 'corporate@target.com', phone: '(612) 304-6073' },
  { name: 'Costco Wholesale', website: 'costco.com', city: 'Issaquah', state: 'WA', email: 'info@costco.com', phone: '(425) 313-8100' },
];

const PARTNERS = [
  { name: 'Microsoft Corporation', website: 'microsoft.com', city: 'Redmond', state: 'WA', email: 'partners@microsoft.com', phone: '(425) 882-8080' },
  { name: 'Oracle Corporation', website: 'oracle.com', city: 'Austin', state: 'TX', email: 'partnerships@oracle.com', phone: '(512) 372-1000' },
  { name: 'Salesforce Inc.', website: 'salesforce.com', city: 'San Francisco', state: 'CA', email: 'partners@salesforce.com', phone: '(415) 901-7000' },
  { name: 'Adobe Inc.', website: 'adobe.com', city: 'San Jose', state: 'CA', email: 'partnerships@adobe.com', phone: '(408) 536-6000' },
  { name: 'Atlassian Corporation', website: 'atlassian.com', city: 'San Francisco', state: 'CA', email: 'partners@atlassian.com', phone: '(415) 701-9380' },
];

const SUPPLIERS = [
  { name: 'Sysco Corporation', website: 'sysco.com', city: 'Houston', state: 'TX', email: 'suppliers@sysco.com', phone: '(281) 584-1390' },
  { name: 'Grainger Industrial Supply', website: 'grainger.com', city: 'Chicago', state: 'IL', email: 'sales@grainger.com', phone: '(847) 535-1000' },
  { name: 'Fastenal Company', website: 'fastenal.com', city: 'Winona', state: 'MN', email: 'info@fastenal.com', phone: '(507) 454-5374' },
  { name: 'HD Supply', website: 'hdsupply.com', city: 'Atlanta', state: 'GA', email: 'service@hdsupply.com', phone: '(770) 852-9000' },
  { name: 'Uline Inc.', website: 'uline.com', city: 'Pleasant Prairie', state: 'WI', email: 'sales@uline.com', phone: '(800) 958-5463' },
];

// Contact name pools
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
];

const TITLES = [
  'Director of Sales', 'Account Manager', 'Business Development Manager',
  'Vice President of Operations', 'Senior Account Executive', 'Partnership Manager',
  'Procurement Manager', 'Supply Chain Director', 'Customer Success Manager',
  'Regional Sales Director', 'Strategic Partnerships Lead', 'Vendor Relations Manager',
];

function generateCompanyCode(name: string, existingCodes: Set<string>): string {
  // Extract first 4 letters
  const lettersOnly = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  let prefix = lettersOnly.substring(0, 4);
  if (prefix.length < 4) {
    prefix = prefix.padEnd(4, 'X');
  }

  // Find next available number for this prefix
  let number = 1;
  let code = `${prefix}-${String(number).padStart(4, '0')}`;
  while (existingCodes.has(code)) {
    number++;
    code = `${prefix}-${String(number).padStart(4, '0')}`;
  }

  existingCodes.add(code);
  return code;
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

async function seedCRM() {
  console.log('🌱 Starting CRM seed...\n');

  // Get the specific user by email
  const targetEmail = 'frankyoconnell@gmail.com';
  const user = await db.query.users.findFirst({
    where: eq(users.email, targetEmail),
    columns: { id: true, email: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${targetEmail}`);
    process.exit(1);
  }

  console.log(`👤 Found user: ${user.email}`);

  const membership = await db.query.userTenantMemberships.findFirst({
    where: eq(userTenantMemberships.userId, user.id),
    columns: { tenantId: true },
  });

  if (!membership) {
    console.error('❌ User is not a member of any tenant.');
    process.exit(1);
  }

  const tenantId = membership.tenantId;
  console.log(`🏢 Using tenant: ${tenantId}\n`);

  const existingCodes = new Set<string>();
  const createdCompanies: Array<{ id: string; name: string; type: string }> = [];

  // Create customers
  console.log('📦 Creating customers...');
  for (const data of CUSTOMERS) {
    const companyCode = generateCompanyCode(data.name, existingCodes);
    const [company] = await db
      .insert(companies)
      .values({
        tenantId,
        companyCode,
        name: data.name,
        type: 'customer',
        website: data.website,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        country: 'US',
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: companies.id, name: companies.name });

    if (company) {
      createdCompanies.push({ id: company.id, name: company.name, type: 'customer' });
      console.log(`  ✓ ${company.name} (${companyCode})`);
    }
  }

  // Create partners
  console.log('\n🤝 Creating partners...');
  for (const data of PARTNERS) {
    const companyCode = generateCompanyCode(data.name, existingCodes);
    const [company] = await db
      .insert(companies)
      .values({
        tenantId,
        companyCode,
        name: data.name,
        type: 'partner',
        website: data.website,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        country: 'US',
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: companies.id, name: companies.name });

    if (company) {
      createdCompanies.push({ id: company.id, name: company.name, type: 'partner' });
      console.log(`  ✓ ${company.name} (${companyCode})`);
    }
  }

  // Create suppliers
  console.log('\n📮 Creating suppliers...');
  for (const data of SUPPLIERS) {
    const companyCode = generateCompanyCode(data.name, existingCodes);
    const [company] = await db
      .insert(companies)
      .values({
        tenantId,
        companyCode,
        name: data.name,
        type: 'supplier',
        website: data.website,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        country: 'US',
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: companies.id, name: companies.name });

    if (company) {
      createdCompanies.push({ id: company.id, name: company.name, type: 'supplier' });
      console.log(`  ✓ ${company.name} (${companyCode})`);
    }
  }

  // Create 3 contacts per company
  console.log('\n👥 Creating contacts...');
  let totalContacts = 0;

  for (const company of createdCompanies) {
    const usedNames = new Set<string>();

    for (let i = 0; i < 3; i++) {
      let firstName = randomElement(FIRST_NAMES);
      let lastName = randomElement(LAST_NAMES);
      let fullName = `${firstName} ${lastName}`;

      // Ensure unique names within company
      while (usedNames.has(fullName)) {
        firstName = randomElement(FIRST_NAMES);
        lastName = randomElement(LAST_NAMES);
        fullName = `${firstName} ${lastName}`;
      }
      usedNames.add(fullName);

      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/[^a-z]/g, '')}.com`;
      const phone = `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
      const title = randomElement(TITLES);
      const isPrimary = i === 0; // First contact is primary

      await db.insert(contacts).values({
        tenantId,
        companyId: company.id,
        firstName,
        lastName,
        email,
        phone,
        title,
        isPrimary,
        createdBy: user.id,
        updatedBy: user.id,
      });

      totalContacts++;
    }

    console.log(`  ✓ ${company.name}: 3 contacts created`);
  }

  console.log('\n✅ Seed complete!');
  console.log(`📊 Summary:`);
  console.log(`   - Companies: ${createdCompanies.length}`);
  console.log(`     • Customers: ${CUSTOMERS.length}`);
  console.log(`     • Partners: ${PARTNERS.length}`);
  console.log(`     • Suppliers: ${SUPPLIERS.length}`);
  console.log(`   - Contacts: ${totalContacts}\n`);
}

seedCRM()
  .then(() => {
    console.log('👋 Bye!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
