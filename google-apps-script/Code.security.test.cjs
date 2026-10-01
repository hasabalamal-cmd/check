const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

class MemoryRange {
  constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
    Object.assign(this, { sheet, row, column, rowCount, columnCount });
  }

  getValues() {
    const values = [];
    for (let r = 0; r < this.rowCount; r++) {
      const row = [];
      for (let c = 0; c < this.columnCount; c++) {
        row.push(this.sheet.rows[this.row - 1 + r]?.[this.column - 1 + c] ?? '');
      }
      values.push(row);
    }
    return values;
  }

  setValues(values) {
    values.forEach((row, r) => row.forEach((value, c) => this.setCell_(r, c, value)));
    return this;
  }

  getValue() {
    return this.getValues()[0][0];
  }

  setValue(value) {
    this.setCell_(0, 0, value);
    return this;
  }

  clearContent() {
    this.setValue('');
    return this;
  }

  setCell_(rowOffset, columnOffset, value) {
    const rowIndex = this.row - 1 + rowOffset;
    const columnIndex = this.column - 1 + columnOffset;
    while (this.sheet.rows.length <= rowIndex) this.sheet.rows.push([]);
    while (this.sheet.rows[rowIndex].length <= columnIndex) this.sheet.rows[rowIndex].push('');
    this.sheet.rows[rowIndex][columnIndex] = value;
  }
}

class MemorySheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }

  getLastRow() {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.rows[i].some((cell) => cell !== '' && cell !== null && cell !== undefined)) return i + 1;
    }
    return 0;
  }

  getLastColumn() {
    return this.rows.reduce((max, row) => Math.max(max, row.length), 0);
  }

  getRange(row, column, rowCount = 1, columnCount = 1) {
    return new MemoryRange(this, row, column, rowCount, columnCount);
  }

  appendRow(row) {
    this.rows.push([...row]);
    return this;
  }

  deleteRow(row) {
    this.rows.splice(row - 1, 1);
    return this;
  }

  setFrozenRows() { return this; }
  setRightToLeft() { return this; }
}

class MemorySpreadsheet {
  constructor() {
    this.sheets = new Map();
  }

  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }

  insertSheet(name) {
    const sheet = new MemorySheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

function createHarness() {
  const spreadsheet = new MemorySpreadsheet();
  const properties = new Map();
  const folders = new Map();
  const digest = (value) => crypto.createHash('sha256').update(Buffer.from(value)).digest();
  const uuid = () => crypto.randomUUID();
  let fileSequence = 0;

  const makeFolder = (name) => ({
    name,
    children: new Map(),
    files: [],
    getFoldersByName(childName) {
      const child = this.children.get(childName);
      return { hasNext: () => Boolean(child), next: () => child };
    },
    createFolder(childName) {
      const child = makeFolder(childName);
      this.children.set(childName, child);
      folders.set(childName, child);
      return child;
    },
    createFile(blob) {
      const file = {
        id: `file-${++fileSequence}`,
        blob,
        setSharing() {},
        getId() { return this.id; },
        getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; },
      };
      this.files.push(file);
      return file;
    },
    setSharing() {},
  });
  const roots = new Map();
  const context = {
    console,
    Date,
    Math,
    JSON,
    isNaN,
    isFinite,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) || null,
        setProperty: (key, value) => properties.set(key, String(value)),
        deleteProperty: (key) => properties.delete(key),
        getProperties: () => Object.fromEntries(properties),
      }),
    },
    SpreadsheetApp: {
      openById: () => spreadsheet,
      getActiveSpreadsheet: () => spreadsheet,
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        text,
        setMimeType() { return this; },
        getContent() { return this.text; },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_algorithm, value) => [...digest(value)],
      computeHmacSha256Signature: (value, key) => [
        ...crypto.createHmac('sha256', Buffer.from(key)).update(Buffer.from(value)).digest(),
      ],
      base64Encode: (value) => Buffer.from(value).toString('base64'),
      base64EncodeWebSafe: (value) => Buffer.from(value).toString('base64url'),
      base64Decode: (value) => [...Buffer.from(value, 'base64')],
      getUuid: uuid,
      newBlob: (value, mimeType, name) => ({
        bytes: Array.from(value),
        mimeType,
        name,
        getBytes() { return this.bytes; },
      }),
    },
    DriveApp: {
      Access: { ANYONE_WITH_LINK: 'anyone' },
      Permission: { VIEW: 'view' },
      getFolderById: () => { throw new Error('folder not found'); },
      getFoldersByName: (name) => ({
        hasNext: () => roots.has(name),
        next: () => roots.get(name),
      }),
      createFolder: (name) => {
        const root = makeFolder(name);
        roots.set(name, root);
        folders.set(name, root);
        return root;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('google-apps-script/Code.gs', 'utf8'), context);
  return { context, spreadsheet, properties, folders };
}

function response(output) {
  return JSON.parse(output.getContent());
}

function post(context, payload) {
  return response(context.doPost({ postData: { contents: JSON.stringify(payload) } }));
}

function get(context, params) {
  return response(context.doGet({ parameter: params }));
}

test('Google Apps Script enforces sessions and tenant ownership', async (t) => {
  const { context: gas, spreadsheet, properties, folders } = createHarness();
  gas.initDatabase();
  const bunn = gas.findRowById_(spreadsheet, 'Shops', 'ShopID', 'BUNN');
  gas.updateOwnedRecord_(bunn, { Username: 'bunn', Password: 'BunnLegacyPassword!234' });
  gas.appendObjectByHeaders_(spreadsheet, 'Shops', {
    ShopID: 'TEST001',
    ShopName: 'Test Shop',
    Username: 'test',
    Password: 'TestLegacyPassword!234',
    Status: 'active',
    CreatedAt: new Date().toISOString(),
    Role: 'shop_user',
  });
  properties.set('ADMIN_USERNAME', 'admin');
  properties.set('ADMIN_PASSWORD', 'AdminPassword!234');
  gas.appendObjectByHeaders_(spreadsheet, 'Customers', {
    CustomerID: 'bunn-customer', ShopID: 'BUNN', ShopName: 'Bunn customer',
  });
  gas.appendObjectByHeaders_(spreadsheet, 'Invoices', {
    InvoiceID: 'bunn-invoice', ShopID: 'BUNN', CustomerID: 'bunn-customer',
    InvoiceNumber: 'B-1', Amount: 100,
  });
  gas.appendObjectByHeaders_(spreadsheet, 'Cheques', {
    ChequeID: 'bunn-cheque', ShopID: 'BUNN', CustomerID: 'bunn-customer',
    InvoiceID: 'bunn-invoice', ChequeNumber: '8001', Amount: 100,
  });
  gas.appendObjectByHeaders_(spreadsheet, 'Customers', {
    CustomerID: 'test-customer', ShopID: 'TEST001', ShopName: 'Test customer',
  });
  gas.appendObjectByHeaders_(spreadsheet, 'Invoices', {
    InvoiceID: 'test-invoice', ShopID: 'TEST001', CustomerID: 'test-customer',
    InvoiceNumber: 'T-1', Amount: 200,
  });
  gas.appendObjectByHeaders_(spreadsheet, 'Cheques', {
    ChequeID: 'test-cheque', ShopID: 'TEST001', CustomerID: 'test-customer',
    InvoiceID: 'test-invoice', ChequeNumber: '9001', Amount: 200,
  });
  gas.appendObjectByHeaders_(spreadsheet, 'RemindersLog', {
    LogID: 'bunn-log', ShopID: 'BUNN', ChequeID: 'bunn-cheque', ReminderType: 'today',
  });
  gas.appendObjectByHeaders_(spreadsheet, 'RemindersLog', {
    LogID: 'test-log', ShopID: 'TEST001', ChequeID: 'test-cheque', ReminderType: 'today',
  });
  const chequeSheet = spreadsheet.getSheetByName('Cheques');
  chequeSheet.getRange(1, chequeSheet.getLastColumn() + 1).setValue('Bank');

  const migration = gas.migrateToMultiTenant();
  assert.equal(migration.success, true);
  assert.equal(gas.findRowById_(spreadsheet, 'Shops', 'ShopID', 'BUNN').record.Password, '');
  assert.equal(gas.findRowById_(spreadsheet, 'Shops', 'ShopID', 'TEST001').record.Password, '');
  assert.ok(gas.readTable(spreadsheet, 'Users').every((user) => user.PasswordHash.startsWith('PBKDF2-SHA256$')));
  assert.equal(gas.readTable(spreadsheet, 'Shops').length, 2, 'migration does not create demo shops');

  const bunnLogin = post(gas, { action: 'login', Username: 'bunn', Password: 'BunnLegacyPassword!234' });
  assert.equal(bunnLogin.success, true);
  const bunnToken = bunnLogin.token;
  const bunnData = get(gas, {
    action: 'getInitialData', shopId: 'BUNN', sessionToken: bunnToken,
  });
  assert.equal(bunnData.success, true);
  assert.deepEqual(bunnData.data.customers.map((customer) => customer.CustomerID), ['bunn-customer']);
  assert.equal(bunnData.data.shops.length, 1);
  assert.equal('Password' in bunnData.data.shops[0], false);
  assert.equal(JSON.stringify(bunnData.data).includes('PasswordHash'), false);
  assert.equal(get(gas, { action: 'getShops', sessionToken: bunnToken }).data.length, 1);
  assert.equal(get(gas, { action: 'getUsers', sessionToken: bunnToken }).code, 'FORBIDDEN');
  assert.deepEqual(
    get(gas, { action: 'getReminders', shopId: 'BUNN', sessionToken: bunnToken }).data.map((row) => row.LogID),
    ['bunn-log']
  );

  const crossShopRead = get(gas, {
    action: 'getInitialData', shopId: 'TEST001', sessionToken: bunnToken,
  });
  assert.equal(crossShopRead.success, false);
  assert.equal(crossShopRead.code, 'FORBIDDEN');
  const legacyNamedShopRead = get(gas, {
    action: 'getInitialData', shopId: 'ABC001', sessionToken: bunnToken,
  });
  assert.equal(legacyNamedShopRead.code, 'FORBIDDEN');
  const allRead = get(gas, {
    action: 'getInitialData', shopId: 'ALL', sessionToken: bunnToken,
  });
  assert.equal(allRead.success, false);

  const crossCustomerUpdate = post(gas, {
    action: 'updateCustomer', CustomerID: 'test-customer', ShopID: 'BUNN',
    shopId: 'BUNN', ShopName: 'hacked', sessionToken: bunnToken,
  });
  assert.equal(crossCustomerUpdate.code, 'FORBIDDEN');
  assert.equal(gas.findRowById_(spreadsheet, 'Customers', 'CustomerID', 'test-customer').record.ShopName, 'Test customer');

  const crossInvoiceDelete = post(gas, {
    action: 'deleteInvoice', InvoiceID: 'test-invoice', ShopID: 'BUNN', shopId: 'BUNN',
    sessionToken: bunnToken,
  });
  assert.equal(crossInvoiceDelete.code, 'FORBIDDEN');
  assert.ok(gas.findRowById_(spreadsheet, 'Invoices', 'InvoiceID', 'test-invoice'));

  const crossChequeDelete = post(gas, {
    action: 'deleteCheque', ChequeID: 'test-cheque', ShopID: 'BUNN', shopId: 'BUNN',
    sessionToken: bunnToken,
  });
  assert.equal(crossChequeDelete.code, 'FORBIDDEN');
  assert.ok(gas.findRowById_(spreadsheet, 'Cheques', 'ChequeID', 'test-cheque'));

  const driveFileCount = () => [...folders.values()].reduce((count, folder) => count + folder.files.length, 0);
  const fileCountBefore = driveFileCount();
  const crossShopUpload = post(gas, {
    action: 'uploadFile', ShopID: 'TEST001', shopId: 'TEST001',
    base64Data: 'data:image/png;base64,YQ==', filename: 'private.png', mimeType: 'image/png',
    sessionToken: bunnToken,
  });
  assert.equal(crossShopUpload.code, 'FORBIDDEN');
  assert.equal(driveFileCount(), fileCountBefore);
  const abcUpload = post(gas, {
    action: 'uploadFile',
    ShopID: 'ABC001',
    shopId: 'ABC001',
    base64Data: 'data:image/png;base64,YQ==',
    filename: 'not-authorized.png',
    mimeType: 'image/png',
    sessionToken: bunnToken,
  });
  assert.equal(abcUpload.code, 'FORBIDDEN');
  assert.equal(driveFileCount(), fileCountBefore);
  const multiUpload = post(gas, {
    action: 'uploadFiles',
    ShopID: 'BUNN',
    shopId: 'BUNN',
    files: [
      { base64Data: 'data:image/png;base64,YQ==', filename: 'one.png', mimeType: 'image/png' },
      { base64Data: 'data:application/pdf;base64,Yg==', filename: 'two.pdf', mimeType: 'application/pdf' },
    ],
    sessionToken: bunnToken,
  });
  assert.equal(multiUpload.files.length, 2);
  assert.ok(multiUpload.files.every((file) =>
    file.fileId && file.fileUrl && file.webViewLink && file.name && file.mimeType
  ));
  assert.equal(folders.get('BUNN').files.length, 2);
  assert.equal(folders.has('TEST001'), false);

  const crossShopLink = post(gas, {
    action: 'createCheque', ChequeID: 'invalid-link', ShopID: 'BUNN', shopId: 'BUNN',
    CustomerID: 'bunn-customer', InvoiceID: 'test-invoice', Amount: 20,
    Bank: 'must-not-persist', sessionToken: bunnToken,
  });
  assert.equal(crossShopLink.code, 'FORBIDDEN');

  const validCheque = post(gas, {
    action: 'createCheque', ChequeID: 'new-bunn-cheque', ShopID: 'BUNN', shopId: 'BUNN',
    CustomerID: 'bunn-customer', Amount: 30, Bank: 'must-not-persist', sessionToken: bunnToken,
  });
  assert.equal(validCheque.success, true);
  assert.equal(gas.findRowById_(spreadsheet, 'Cheques', 'ChequeID', 'new-bunn-cheque').record.ChequeNumber, '');
  assert.equal(gas.findRowById_(spreadsheet, 'Cheques', 'ChequeID', 'new-bunn-cheque').record.Bank, '');
  const bunnCheques = get(gas, { action: 'getCheques', shopId: 'BUNN', sessionToken: bunnToken });
  assert.equal('Bank' in bunnCheques.data.find((cheque) => cheque.ChequeID === 'new-bunn-cheque'), false);

  const bunnSettings = post(gas, {
    action: 'updateSettings', ShopID: 'BUNN', shopId: 'BUNN',
    settings: { Reminder1Days: 2 },
    sessionToken: bunnToken,
  });
  assert.equal(bunnSettings.success, true);

  const adminLogin = post(gas, { action: 'login', Username: 'admin', Password: 'AdminPassword!234' });
  assert.equal(adminLogin.success, true);
  const adminToken = adminLogin.token;
  const adminShops = get(gas, { action: 'getShops', sessionToken: adminToken });
  assert.equal(adminShops.data.length, 2);
  const adminUsers = get(gas, { action: 'getUsers', sessionToken: adminToken });
  assert.ok(adminUsers.data.every((user) => !('PasswordHash' in user) && !('Password' in user)));
  const adminAll = get(gas, { action: 'getInitialData', shopId: 'ALL', sessionToken: adminToken });
  assert.equal(adminAll.success, true);
  assert.equal(adminAll.data.customers.length, 2);
  const newMultiShopUser = post(gas, {
    action: 'createUser',
    Username: 'reporter',
    Password: 'ReporterPassword!234',
    Role: 'shop_user',
    ShopIDs: ['BUNN', 'TEST001'],
    sessionToken: adminToken,
  });
  assert.deepEqual(newMultiShopUser.allowedShopIds, ['BUNN', 'TEST001']);
  assert.equal(post(gas, {
    action: 'createUser',
    Username: 'blocked',
    Password: 'BlockedPassword!234',
    Role: 'shop_user',
    ShopIDs: ['BUNN'],
    sessionToken: bunnToken,
  }).code, 'FORBIDDEN');
  const forbiddenShopCreate = post(gas, {
    action: 'createShop', ShopID: 'NOPE', Username: 'nope', Password: 'NopePassword!234',
    sessionToken: bunnToken,
  });
  assert.equal(forbiddenShopCreate.code, 'FORBIDDEN');

  const testUser = gas.readTable(spreadsheet, 'Users').find((user) => user.Username === 'test');
  const assigned = post(gas, {
    action: 'setUserShopAccess', UserID: testUser.UserID, ShopIDs: ['BUNN', 'TEST001'],
    sessionToken: adminToken,
  });
  assert.deepEqual(assigned.allowedShopIds, ['BUNN', 'TEST001']);
  const testLogin = post(gas, { action: 'login', Username: 'test', Password: 'TestLegacyPassword!234' });
  assert.equal(testLogin.success, true);
  const testTenantData = get(gas, {
    action: 'getInitialData', shopId: 'TEST001', sessionToken: testLogin.token,
  });
  assert.deepEqual(testTenantData.data.customers.map((customer) => customer.CustomerID), ['test-customer']);
  const switchedBunnData = get(gas, {
    action: 'getInitialData', shopId: 'BUNN', sessionToken: testLogin.token,
  });
  assert.deepEqual(switchedBunnData.data.customers.map((customer) => customer.CustomerID), ['bunn-customer']);
  assert.equal(get(gas, {
    action: 'getSettings', shopId: 'TEST001', sessionToken: testLogin.token,
  }).data.Reminder1Days, 7);
  const resetPassword = post(gas, {
    action: 'resetUserPassword',
    UserID: testUser.UserID,
    Password: 'ChangedPassword!234',
    sessionToken: adminToken,
  });
  assert.equal(resetPassword.success, true);
  assert.equal(get(gas, {
    action: 'getInitialData', shopId: 'TEST001', sessionToken: testLogin.token,
  }).code, 'UNAUTHORIZED');
  assert.equal(post(gas, {
    action: 'login', Username: 'test', Password: 'ChangedPassword!234',
  }).success, true);

  await t.test('rejects requests without a valid session', () => {
    assert.equal(get(gas, { action: 'getInitialData', shopId: 'BUNN' }).code, 'UNAUTHORIZED');
    assert.equal(post(gas, { action: 'deleteCheque', ChequeID: 'bunn-cheque', ShopID: 'BUNN' }).code, 'UNAUTHORIZED');
  });
});

test('updating a shop never changes accounts linked to it', () => {
  const { context: gas, spreadsheet, properties } = createHarness();
  properties.set('ADMIN_USERNAME', 'admin');
  properties.set('ADMIN_PASSWORD', 'AdminPassword!234');
  gas.initDatabase();

  const adminLogin = post(gas, {
    action: 'login', Username: 'admin', Password: 'AdminPassword!234',
  });
  assert.equal(adminLogin.success, true);

  const createShop = post(gas, {
    action: 'createShop',
    ShopID: 'SHARED01',
    ShopName: 'Shared Shop',
    Username: 'shop-user-a',
    Password: 'ShopUserA!Password234',
    sessionToken: adminLogin.token,
  });
  assert.equal(createShop.success, true);
  const createdShop = gas.findRowById_(spreadsheet, 'Shops', 'ShopID', 'SHARED01');
  assert.equal(createdShop.record.Username, '');
  assert.equal(createdShop.record.Password, '');

  const userA = gas.readTable(spreadsheet, 'Users').find((user) => user.Username === 'shop-user-a');
  const createUserB = post(gas, {
    action: 'createUser',
    Username: 'shop-user-b',
    Password: 'ShopUserB!Password234',
    Role: 'shop_user',
    ShopIDs: ['SHARED01'],
    sessionToken: adminLogin.token,
  });
  assert.equal(createUserB.success, true);
  const userB = gas.readTable(spreadsheet, 'Users').find((user) => user.Username === 'shop-user-b');
  const before = [userA, userB].map(({ UserID, Username, PasswordHash }) => ({
    UserID, Username, PasswordHash,
  }));
  const userALogin = post(gas, {
    action: 'login', Username: 'shop-user-a', Password: 'ShopUserA!Password234',
  });
  const userBLogin = post(gas, {
    action: 'login', Username: 'shop-user-b', Password: 'ShopUserB!Password234',
  });
  assert.equal(userALogin.success, true);
  assert.equal(userBLogin.success, true);

  const updated = post(gas, {
    action: 'updateShop',
    ShopID: 'SHARED01',
    ShopName: 'Renamed Shop',
    ContactName: 'New Contact',
    Phone: '555-0100',
    Email: 'shop@example.test',
    Status: 'active',
    Notes: 'Updated shop-only fields',
    Username: 'attacker-chosen-name',
    Password: 'AttackerPassword!234',
    PasswordHash: 'attacker-hash',
    UserID: 'attacker-user-id',
    sessionToken: adminLogin.token,
  });
  assert.equal(updated.success, true);

  const after = gas.readTable(spreadsheet, 'Users')
    .filter((user) => [userA.UserID, userB.UserID].includes(user.UserID))
    .map(({ UserID, Username, PasswordHash }) => ({ UserID, Username, PasswordHash }));
  assert.deepEqual(JSON.parse(JSON.stringify(after)), before);
  const updatedShop = gas.findRowById_(spreadsheet, 'Shops', 'ShopID', 'SHARED01');
  assert.equal(updatedShop.record.ShopName, 'Renamed Shop');
  assert.equal(updatedShop.record.Username, '');
  assert.equal(updatedShop.record.Password, '');

  const reset = post(gas, {
    action: 'resetUserPassword',
    UserID: userA.UserID,
    Password: 'NewShopUserA!Password234',
    sessionToken: adminLogin.token,
  });
  assert.equal(reset.success, true);
  assert.equal(post(gas, {
    action: 'login', Username: 'shop-user-a', Password: 'ShopUserA!Password234',
  }).success, false);
  assert.equal(post(gas, {
    action: 'login', Username: 'shop-user-a', Password: 'NewShopUserA!Password234',
  }).success, true);
  assert.equal(post(gas, {
    action: 'login', Username: 'shop-user-b', Password: 'ShopUserB!Password234',
  }).success, true);
  assert.equal(get(gas, {
    action: 'getInitialData', shopId: 'SHARED01', sessionToken: userALogin.token,
  }).code, 'UNAUTHORIZED');
  assert.equal(get(gas, {
    action: 'getInitialData', shopId: 'SHARED01', sessionToken: userBLogin.token,
  }).success, true);

  const publicShop = get(gas, {
    action: 'getShops', sessionToken: adminLogin.token,
  }).data.find((shop) => shop.ShopID === 'SHARED01');
  assert.equal('Username' in publicShop, false);
  assert.equal('Role' in publicShop, false);
});

test('uploadFile validates MIME type, extension, size, authorization, and tenant folder', () => {
  const { context: gas, spreadsheet, properties, folders } = createHarness();
  gas.initDatabase();
  const bunn = gas.findRowById_(spreadsheet, 'Shops', 'ShopID', 'BUNN');
  gas.updateOwnedRecord_(bunn, { Username: 'uploader', Password: 'UploaderPassword!234' });
  const login = post(gas, {
    action: 'login', Username: 'uploader', Password: 'UploaderPassword!234',
  });
  assert.equal(login.success, true);
  const sessionToken = login.token;
  const upload = (file, extra = {}) => post(gas, {
    action: 'uploadFile',
    ShopID: 'BUNN',
    sessionToken,
    ...file,
    ...extra,
  });
  const fileCount = () => [...folders.values()].reduce((total, folder) => total + folder.files.length, 0);
  const initialFileCount = fileCount();

  const jpg = upload({
    base64Data: 'data:image/jpeg;base64,YQ==',
    filename: 'small.jpg',
    mimeType: 'image/jpeg',
    folderId: 'attacker-folder-id',
    FolderID: 'another-attacker-folder-id',
  });
  assert.equal(jpg.success, true);
  assert.equal(folders.get('BUNN').files.at(-1).blob.name, 'small.jpg');
  assert.equal(folders.has('attacker-folder-id'), false);
  assert.equal(fileCount(), initialFileCount + 1);

  const pdf = upload({
    base64Data: 'data:application/pdf;base64,Yg==',
    filename: 'small.pdf',
    mimeType: 'application/pdf',
  });
  assert.equal(pdf.success, true);
  assert.equal(folders.get('BUNN').files.at(-1).blob.mimeType, 'application/pdf');

  const badExtension = upload({
    base64Data: 'data:image/png;base64,YQ==',
    filename: 'payload.svg',
    mimeType: 'image/png',
  });
  assert.equal(badExtension.success, false);
  assert.equal(badExtension.error, 'نوع الملف غير مسموح. الأنواع المسموحة: JPG, JPEG, PNG, WEBP, GIF, PDF.');

  const badMimeType = upload({
    base64Data: 'data:image/png;base64,YQ==',
    filename: 'payload.png',
    mimeType: 'image/svg+xml',
  });
  assert.equal(badMimeType.success, false);
  assert.equal(badMimeType.error, 'نوع الملف غير مسموح. الأنواع المسموحة: JPG, JPEG, PNG, WEBP, GIF, PDF.');

  const oversized = upload({
    base64Data: Buffer.alloc(10 * 1024 * 1024 + 1).toString('base64'),
    filename: 'large.jpg',
    mimeType: 'image/jpeg',
  });
  assert.equal(oversized.success, false);
  assert.equal(oversized.error, 'حجم الملف يتجاوز الحد المسموح (10 MB).');
  assert.equal(fileCount(), initialFileCount + 2);

  const crossTenant = post(gas, {
    action: 'uploadFile',
    ShopID: 'TEST001',
    shopId: 'TEST001',
    sessionToken,
    base64Data: 'data:image/jpeg;base64,YQ==',
    filename: 'cross-tenant.jpg',
    mimeType: 'image/jpeg',
    folderId: 'attacker-folder-id',
  });
  assert.equal(crossTenant.code, 'FORBIDDEN');
  assert.equal(folders.has('TEST001'), false);
  assert.equal(fileCount(), initialFileCount + 2);
});

test('inactive shops cannot be assigned or used as active user access', () => {
  const { context: gas, spreadsheet, properties } = createHarness();
  properties.set('ADMIN_USERNAME', 'admin');
  properties.set('ADMIN_PASSWORD', 'AdminPassword!234');
  gas.initDatabase();
  const adminLogin = post(gas, {
    action: 'login', Username: 'admin', Password: 'AdminPassword!234',
  });
  assert.equal(adminLogin.success, true);

  const created = post(gas, {
    action: 'createShop',
    ShopID: 'INACTIVE01',
    ShopName: 'Inactive Shop',
    Username: 'inactive-user',
    Password: 'InactiveUserPassword!234',
    Status: 'inactive',
    sessionToken: adminLogin.token,
  });
  assert.equal(created.success, true);
  const inactiveUser = gas.readTable(spreadsheet, 'Users')
    .find((user) => user.Username === 'inactive-user');
  assert.equal(inactiveUser.Status, 'active');
  assert.deepEqual(JSON.parse(JSON.stringify(gas.activeShopIdsForUser_(spreadsheet, inactiveUser))), []);
  assert.equal(post(gas, {
    action: 'login', Username: 'inactive-user', Password: 'InactiveUserPassword!234',
  }).code, 'FORBIDDEN');

  const activeUserResult = post(gas, {
    action: 'createUser',
    Username: 'assigned-user',
    Password: 'AssignedUserPassword!234',
    Role: 'shop_user',
    ShopIDs: ['BUNN'],
    sessionToken: adminLogin.token,
  });
  assert.equal(activeUserResult.success, true);
  const userId = activeUserResult.userId;
  for (const shopIds of [['MISSING01'], ['INACTIVE01'], ['BUNN', 'BUNN']]) {
    const result = post(gas, {
      action: 'setUserShopAccess',
      UserID: userId,
      ShopIDs: shopIds,
      sessionToken: adminLogin.token,
    });
    assert.equal(result.success, false);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(gas.activeShopIdsForUser_(
    spreadsheet,
    gas.findRowById_(spreadsheet, 'Users', 'UserID', userId).record
  ))), ['BUNN']);
});

test('migration appends a single ShopID column and preserves legacy rows', () => {
  const { context: gas, spreadsheet } = createHarness();
  const legacyCustomers = spreadsheet.insertSheet('Customers');
  legacyCustomers.appendRow(['CustomerID', 'ShopName']);
  legacyCustomers.appendRow(['legacy-customer', 'Legacy account']);
  const legacyInvoices = spreadsheet.insertSheet('Invoices');
  legacyInvoices.appendRow(['InvoiceID', 'CustomerID']);
  legacyInvoices.appendRow(['legacy-invoice', 'legacy-customer']);

  gas.migrateToMultiTenant();
  gas.migrateToMultiTenant();
  const customerHeaders = legacyCustomers.getRange(1, 1, 1, legacyCustomers.getLastColumn()).getValues()[0];
  const invoiceHeaders = legacyInvoices.getRange(1, 1, 1, legacyInvoices.getLastColumn()).getValues()[0];
  assert.equal(customerHeaders.filter((header) => header === 'ShopID').length, 1);
  assert.equal(invoiceHeaders.filter((header) => header === 'ShopID').length, 1);
  assert.equal(gas.readTable(spreadsheet, 'Customers').length, 1);
  assert.equal(gas.readTable(spreadsheet, 'Invoices').length, 1);
  assert.equal(gas.readTable(spreadsheet, 'Customers')[0].ShopID, 'BUNN');
  assert.equal(gas.readTable(spreadsheet, 'Invoices')[0].ShopID, 'BUNN');
  assert.equal(gas.readTable(spreadsheet, 'Shops').length, 1);
});
