/**
 * =========================================================================
 * تطبيق سند - Google Apps Script Backend API (الإصدار المطور Multi-Tenant)
 * نظام إدارة المحلات المتعددة، العملاء، الشيكات، الفواتير، والمرفقات في Drive
 * =========================================================================
 */

var ROOT_FOLDER_NAME = 'سند - صور ومستندات';

/**
 * دالة مساعدة للحصول على جدول البيانات النشط
 */
function getSpreadsheet() {
  var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) {
    return SpreadsheetApp.openById(prop);
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error('يرجى ربط السكريبت بجدول بيانات أو تحديد SPREADSHEET_ID في خصائص السكريبت (Script Properties).');
  }
}

/**
 * الحصول على المجلد الرئيسي لسند في Google Drive
 */
function getRootFolder() {
  var folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn('تعذر العثور على المجلد المحدد بالمعرف، سيتم إنشاء مجلد رئيسي جديد.');
    }
  }

  var folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * الحصول على أو إنشاء مجلد مخصص للمحل داخل Drive
 */
function getShopFolder(shopId) {
  var root = getRootFolder();
  var safeName = (shopId || 'DEFAULT').trim();
  var folders = root.getFoldersByName(safeName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newShopFolder = root.createFolder(safeName);
  newShopFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newShopFolder;
}

/**
 * تهيئة وإنشاء الجداول تلقائياً بالهيكلية المطلوبة إذا لم تكن موجودة
 */
function initDatabase() {
  var ss = getSpreadsheet();
  ensureHeaders_(ss, 'Shops', [
    'ShopID', 'ShopName', 'Username', 'Password', 'ContactName', 'Phone', 'Email',
    'Status', 'CreatedAt', 'Notes', 'Role'
  ]);
  ensureHeaders_(ss, 'Users', [
    'UserID', 'Username', 'PasswordHash', 'Role', 'Status', 'CreatedAt', 'Notes'
  ]);
  ensureHeaders_(ss, 'UserShops', ['UserID', 'ShopID']);
  ensureHeaders_(ss, 'Customers', [
    'CustomerID', 'ShopID', 'ShopName', 'ContactName', 'Phone', 'Address', 'Notes', 'CreatedAt'
  ]);
  ensureHeaders_(ss, 'Invoices', [
    'InvoiceID', 'ShopID', 'InvoiceNumber', 'CustomerID', 'InvoiceDate', 'Amount',
    'ReceiptStatus', 'ReceiptDate', 'InvoiceFile', 'Notes', 'CreatedAt'
  ]);
  ensureHeaders_(ss, 'Cheques', [
    'ChequeID', 'ShopID', 'ChequeNumber', 'CustomerID', 'InvoiceID', 'Amount',
    'DueDate', 'ChequeImage', 'Notes', 'Status', 'PaidDate', 'CreatedAt'
  ]);
  ensureHeaders_(ss, 'ReceivedInvoices', [
    'ReceivedInvoiceID', 'ShopID', 'InvoiceNumber', 'EntityName', 'Amount', 'InvoiceDate',
    'ReceiptStatus', 'ReceiptDate', 'InvoiceFile', 'Notes', 'CreatedAt'
  ]);
  ensureHeaders_(ss, 'Settings', ['Setting', 'Value', 'ShopID']);
  ensureHeaders_(ss, 'RemindersLog', [
    'LogID', 'ShopID', 'ChequeID', 'ReminderType', 'SentDate', 'Message'
  ]);
  var shopsSheet = ss.getSheetByName('Shops');
  if (shopsSheet.getLastRow() <= 1) {
    appendObjectByHeaders_(ss, 'Shops', {
      ShopID: 'BUNN',
      ShopName: 'Bunn Cafe & Roastery',
      Username: '',
      Password: '',
      ContactName: '',
      Phone: '',
      Email: '',
      Status: 'active',
      CreatedAt: new Date().toISOString(),
      Notes: 'المحل الافتراضي',
      Role: 'shop_user'
    });
  }
  createConfiguredAdmin_(ss, []);
  return { success: true, message: 'تم التأكد من تهيئة الجداول دون إضافة بيانات تجريبية.' };
}

/**
 * الترحيل الآمن للجداول القديمة إلى نظام Multi-Tenant دون حذف أي بيانات
 */
function migrateToMultiTenant() {
  var ss = getSpreadsheet();
  initDatabase();

  var tables = [
    { name: 'Customers', targetCol: 'ShopID' },
    { name: 'Invoices', targetCol: 'ShopID' },
    { name: 'Cheques', targetCol: 'ShopID' },
    { name: 'ReceivedInvoices', targetCol: 'ShopID' },
    { name: 'RemindersLog', targetCol: 'ShopID' }
  ];

  var logs = [];
  var ensureBunn = false;

  tables.forEach(function (t) {
    var sheet = ss.getSheetByName(t.name);
    if (!sheet) return;

    ensureHeaders_(ss, t.name, [t.targetCol]);
    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    if (lastCol === 0) return;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var shopIdIdx = headers.indexOf(t.targetCol);
    if (lastRow > 1 && shopIdIdx >= 0) {
      var colVals = sheet.getRange(2, shopIdIdx + 1, lastRow - 1, 1).getValues();
      var needsUpdate = false;
      for (var i = 0; i < colVals.length; i++) {
        if (!colVals[i][0] || String(colVals[i][0]).trim() === '') {
          colVals[i][0] = 'BUNN';
          ensureBunn = true;
          needsUpdate = true;
        } else if (normalizeId_(colVals[i][0]) === 'BUNN') {
          ensureBunn = true;
        }
      }
      if (needsUpdate) {
        sheet.getRange(2, shopIdIdx + 1, lastRow - 1, 1).setValues(colVals);
        logs.push('تم ربط الصفوف التي لا تملك ShopID في ' + t.name + ' بـ BUNN');
      }
    }
  });

  if (ensureBunn && !readTable(ss, 'Shops').some(function (shop) {
    return normalizeId_(shop.ShopID) === 'BUNN';
  })) {
    appendObjectByHeaders_(ss, 'Shops', {
      ShopID: 'BUNN', ShopName: 'Bunn Cafe & Roastery', Username: '', Password: '',
      Status: 'active', CreatedAt: new Date().toISOString(), Notes: 'المحل الافتراضي',
      Role: 'shop_user'
    });
    logs.push('تم إنشاء سجل BUNN الافتراضي لربط البيانات القديمة به.');
  }
  migrateLegacyShopUsers_(ss, logs);
  return {
    success: true,
    message: 'تم الترحيل إلى Multi-Tenant بنجاح دون المساس بالبيانات القديمة.',
    logs: logs
  };
}

/**
 * معالجة طلبات GET
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || 'getInitialData';

    if (action === 'ping' || action === 'test') {
      return createJsonResponse({
        success: true,
        message: 'Google Apps Script متصل.',
        timestamp: new Date().toISOString()
      });
    }

    var session = requireSession_(params.sessionToken || params.token);
    var ss = getSpreadsheet();
    initDatabase();

    if (action === 'init' || action === 'migrate') {
      requireAdmin_(session);
      return createJsonResponse(action === 'init' ? initDatabase() : migrateToMultiTenant());
    }

    if (action === 'getShops') {
      return createJsonResponse({ success: true, data: getShopsForSession_(ss, session) });
    }
    if (action === 'getUsers') {
      requireAdmin_(session);
      return createJsonResponse({ success: true, data: safeUsers_(ss) });
    }

    var requestedShopId = params.shopId || params.ShopID || '';
    var shopId = authorizeShop_(session, requestedShopId, action.indexOf('get') === 0);
    var filterShop = function (row) {
      return shopId === '*' || normalizeId_(row.ShopID) === shopId;
    };

    var getActions = {
      getCustomers: 'Customers',
      getInvoices: 'Invoices',
      getCheques: 'Cheques',
      getReceivedInvoices: 'ReceivedInvoices',
      getReminders: 'RemindersLog'
    };
    if (getActions[action]) {
      return createJsonResponse({
        success: true,
        data: safeTableData_(getActions[action], readTable(ss, getActions[action]).filter(filterShop))
      });
    }
    if (action === 'getSettings') {
      if (shopId === '*') throw new Error('FORBIDDEN: اختر محلًا محددًا لقراءة الإعدادات.');
      return createJsonResponse({ success: true, data: readSettings(ss, shopId) });
    }
    if (action !== 'getInitialData') throw new Error('الإجراء غير معروف: ' + action);

    var allShops = getShopsForSession_(ss, session);
    var selectedShop = shopId === '*' ? null : getShopById_(ss, shopId);
    var settings = shopId === '*' ? {} : readSettings(ss, shopId);

    var initialData = {
      shop: selectedShop || {},
      shops: allShops,
      customers: readTable(ss, 'Customers').filter(filterShop),
      invoices: readTable(ss, 'Invoices').filter(filterShop),
      cheques: safeTableData_('Cheques', readTable(ss, 'Cheques').filter(filterShop)),
      receivedInvoices: readTable(ss, 'ReceivedInvoices').filter(filterShop),
      settings: settings,
      reminders: readTable(ss, 'RemindersLog').filter(filterShop)
    };

    return createJsonResponse({ success: true, data: initialData, currentShopId: shopId });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || String(error),
      code: error.code || classifyError_(error)
    });
  }
}

/**
 * معالجة طلبات POST
 */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action;

    var ss = getSpreadsheet();
    if (action === 'login') {
      initDatabase();
      migrateToMultiTenant();
      return createJsonResponse(loginUser_(ss, payload.Username || payload.username, payload.Password || payload.password));
    }
    var session = requireSession_(payload.sessionToken || payload.token);
    initDatabase();
    if (action === 'logout') {
      var logoutSession = session;
      PropertiesService.getScriptProperties().deleteProperty(sessionPropertyKey_(payload.sessionToken || payload.token));
      return createJsonResponse({ success: true, userId: logoutSession.userId });
    }

    if (action === 'migrate') {
      requireAdmin_(session);
      return createJsonResponse(migrateToMultiTenant());
    }
    if (action === 'init') {
      requireAdmin_(session);
      return createJsonResponse(initDatabase());
    }
    if (action === 'getShops') {
      return createJsonResponse({ success: true, data: getShopsForSession_(ss, session) });
    }

    if (action === 'createShop' || action === 'updateShop' || action === 'deleteShop') {
      requireAdmin_(session);
      return createJsonResponse(handleShopMutation_(ss, action, payload));
    }
    if (action === 'setUserShopAccess') {
      requireAdmin_(session);
      return createJsonResponse(setUserShopAccess_(ss, payload.UserID, payload.ShopIDs));
    }
    if (action === 'createUser') {
      requireAdmin_(session);
      return createJsonResponse(createUser_(ss, payload));
    }
    if (action === 'resetUserPassword') {
      requireAdmin_(session);
      return createJsonResponse(resetUserPassword_(ss, payload.UserID, payload.Password));
    }

    var requestedShopId = payload.ShopID || payload.shopId || '';
    if (payload.ShopID && payload.shopId && normalizeId_(payload.ShopID) !== normalizeId_(payload.shopId)) {
      throw new Error('FORBIDDEN: لا يمكن إرسال ShopID متضارب.');
    }
    var shopId = authorizeShop_(session, requestedShopId, false);
    if (action === 'uploadFile' || action === 'uploadFiles') {
      var files = action === 'uploadFile'
        ? [payload]
        : (Array.isArray(payload.files) ? payload.files : []);
      if (!files.length) throw new Error('يجب إرسال ملف واحد على الأقل.');
      var uploadedFiles = files.map(function (file) { return handleFileUpload(file, shopId); });
      if (action === 'uploadFile') {
        return createJsonResponse({ success: true, fileId: uploadedFiles[0].fileId,
          fileUrl: uploadedFiles[0].fileUrl, webViewLink: uploadedFiles[0].webViewLink,
          name: uploadedFiles[0].name, mimeType: uploadedFiles[0].mimeType });
      }
      return createJsonResponse({ success: true, files: uploadedFiles });
    }

    if (action === 'getSettings' || action === 'updateSettings') {
      if (action === 'getSettings') return createJsonResponse({ success: true, data: readSettings(ss, shopId) });
      saveSettings_(ss, shopId, payload.settings || payload);
      return createJsonResponse({ success: true, data: readSettings(ss, shopId) });
    }

    var definitions = {
      Customer: { sheet: 'Customers', id: 'CustomerID', create: 'createCustomer', update: 'updateCustomer', remove: 'deleteCustomer' },
      Invoice: { sheet: 'Invoices', id: 'InvoiceID', create: 'createInvoice', update: 'updateInvoice', remove: 'deleteInvoice' },
      Cheque: { sheet: 'Cheques', id: 'ChequeID', create: 'createCheque', update: 'updateCheque', remove: 'deleteCheque' },
      ReceivedInvoice: { sheet: 'ReceivedInvoices', id: 'ReceivedInvoiceID', create: 'createReceivedInvoice', update: 'updateReceivedInvoice', remove: 'deleteReceivedInvoice' }
    };
    var definition = null;
    Object.keys(definitions).some(function (key) {
      if (definitions[key].create === action || definitions[key].update === action ||
          definitions[key].remove === action ||
          (key === 'Cheque' && action === 'updateChequeStatus') ||
          (key === 'ReceivedInvoice' && action === 'updateReceivedInvoiceStatus')) {
        definition = definitions[key];
        return true;
      }
      return false;
    });
    if (!definition) throw new Error('الإجراء غير معروف: ' + action);
    return createJsonResponse(mutateRecord_(ss, session, shopId, action, payload, definition));

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || String(error),
      code: error.code || classifyError_(error)
    });
  }
}

function ensureHeaders_(ss, sheetName, requiredHeaders) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(requiredHeaders);
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
    return sheet;
  }
  if (sheet.getLastColumn() === 0) {
    sheet.appendRow(requiredHeaders);
  } else {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    requiredHeaders.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        headers.push(header);
      }
    });
  }
  sheet.setFrozenRows(1);
  sheet.setRightToLeft(true);
  return sheet;
}

function normalizeId_(value) {
  return String(value || '').trim().toUpperCase();
}

function classifyError_(error) {
  var message = String(error && error.message || error);
  if (/UNAUTHORIZED/i.test(message)) return 'UNAUTHORIZED';
  if (/FORBIDDEN/i.test(message)) return 'FORBIDDEN';
  return 'REQUEST_FAILED';
}

function hashPassword_(password, salt) {
  var rounds = 12000;
  var passwordBytes = Utilities.newBlob(String(password)).getBytes();
  var block = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(String(salt)).getBytes().concat([0, 0, 0, 1]),
    passwordBytes
  );
  var derived = block.slice();
  for (var i = 1; i < rounds; i++) {
    block = Utilities.computeHmacSha256Signature(block, passwordBytes);
    for (var j = 0; j < derived.length; j++) {
      derived[j] = (derived[j] ^ block[j]) & 255;
    }
  }
  return 'PBKDF2-SHA256$' + rounds + '$' + salt + '$' + Utilities.base64Encode(derived);
}

function createPasswordHash_(password) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  return hashPassword_(password, salt);
}

function constantTimeEquals_(left, right) {
  if (left.length !== right.length) return false;
  var mismatch = 0;
  for (var i = 0; i < left.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

function verifyPassword_(password, storedHash) {
  var parts = String(storedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'PBKDF2-SHA256' || Number(parts[1]) !== 12000) return false;
  return constantTimeEquals_(hashPassword_(password, parts[2]), storedHash);
}

function sessionPropertyKey_(token) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token || ''));
  return 'SESSION_' + Utilities.base64EncodeWebSafe(digest);
}

function cleanupExpiredSessions_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf('SESSION_') !== 0) return;
    try {
      var session = JSON.parse(all[key]);
      if (new Date(session.expiresAt).getTime() <= Date.now()) props.deleteProperty(key);
    } catch (error) {
      props.deleteProperty(key);
    }
  });
}

function revokeUserSessions_(userId) {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf('SESSION_') !== 0) return;
    try {
      var session = JSON.parse(all[key]);
      if (String(session.userId) === String(userId)) props.deleteProperty(key);
    } catch (error) {
      props.deleteProperty(key);
    }
  });
}

function migrateLegacyShopUsers_(ss, logs) {
  var shops = readTable(ss, 'Shops');
  var users = readTable(ss, 'Users');
  var memberships = readTable(ss, 'UserShops');
  var usersByName = {};
  users.forEach(function (user) {
    usersByName[String(user.Username || '').toLowerCase()] = user;
  });
  var membershipKeys = {};
  memberships.forEach(function (entry) {
    membershipKeys[String(entry.UserID) + '|' + normalizeId_(entry.ShopID)] = true;
  });

  shops.forEach(function (shop) {
    var shopId = normalizeId_(shop.ShopID);
    var username = String(shop.Username || '').trim();
    var legacyPassword = String(shop.Password || '');
    if (!shopId || !username || !legacyPassword) return;

    var user = usersByName[username.toLowerCase()];
    var canMigrate = true;
    if (!user) {
      user = {
        UserID: 'usr-' + Utilities.getUuid(),
        Username: username,
        PasswordHash: createPasswordHash_(legacyPassword),
        Role: String(shop.Role || '').toLowerCase() === 'admin' ? 'admin' : 'shop_user',
        Status: String(shop.Status || 'active').toLowerCase(),
        CreatedAt: shop.CreatedAt || new Date().toISOString(),
        Notes: 'Migrated from legacy Shops credentials'
      };
      appendObjectByHeaders_(ss, 'Users', user);
      usersByName[username.toLowerCase()] = user;
      logs.push('تم نقل حساب ' + username + ' إلى Users باستخدام PasswordHash.');
    } else if (!user.PasswordHash) {
      var existingUserRow = findRowById_(ss, 'Users', 'UserID', user.UserID);
      var migratedHash = createPasswordHash_(legacyPassword);
      updateOwnedRecord_(existingUserRow, { PasswordHash: migratedHash });
      user.PasswordHash = migratedHash;
    } else if (!verifyPassword_(legacyPassword, user.PasswordHash)) {
      canMigrate = false;
      logs.push('تعارض بيانات اعتماد للحساب ' + username + '؛ لم يتم ربط المحل أو مسح كلمة المرور القديمة.');
    }
    if (canMigrate) {
      var membershipKey = String(user.UserID) + '|' + shopId;
      if (String(user.Role).toLowerCase() !== 'admin' && !membershipKeys[membershipKey]) {
        appendObjectByHeaders_(ss, 'UserShops', { UserID: user.UserID, ShopID: shopId });
        membershipKeys[membershipKey] = true;
      }
      clearLegacyPassword_(ss, shopId);
    }
  });

  createConfiguredAdmin_(ss, logs);
}

function clearLegacyPassword_(ss, shopId) {
  var sheet = ss.getSheetByName('Shops');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var passwordCol = headers.indexOf('Password');
  var idCol = headers.indexOf('ShopID');
  if (passwordCol < 0 || idCol < 0) return;
  var rows = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), sheet.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (normalizeId_(rows[i][idCol]) === normalizeId_(shopId) && rows[i][passwordCol]) {
      sheet.getRange(i + 2, passwordCol + 1).clearContent();
      return;
    }
  }
}

function createConfiguredAdmin_(ss, logs) {
  var props = PropertiesService.getScriptProperties();
  var username = String(props.getProperty('ADMIN_USERNAME') || '').trim();
  var password = String(props.getProperty('ADMIN_PASSWORD') || '');
  if (!username || !password) return;
  var users = readTable(ss, 'Users');
  var existingUser = users.filter(function (user) {
    return String(user.Username || '').toLowerCase() === username.toLowerCase();
  })[0];
  if (existingUser) {
    if (String(existingUser.Role).toLowerCase() !== 'admin') {
      throw new Error('ADMIN_USERNAME مستخدم بالفعل لحساب غير إداري؛ اختر اسمًا آخر في خصائص السكريبت.');
    }
    props.deleteProperty('ADMIN_PASSWORD');
    return;
  }
  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD يجب ألا يقل عن 10 أحرف.');
  }

  var userId = 'usr-' + Utilities.getUuid();
  appendObjectByHeaders_(ss, 'Users', {
    UserID: userId,
    Username: username,
    PasswordHash: createPasswordHash_(password),
    Role: 'admin',
    Status: 'active',
    CreatedAt: new Date().toISOString(),
    Notes: 'Initial administrator'
  });
  props.deleteProperty('ADMIN_PASSWORD');
  logs.push('تم إنشاء حساب المدير الأول من خصائص السكريبت وحذف كلمة المرور المؤقتة.');
}

function activeShopIdsForUser_(ss, user) {
  var shops = readTable(ss, 'Shops');
  if (String(user.Role).toLowerCase() === 'admin') {
    return shops.filter(function (shop) {
      return String(shop.Status || 'active').toLowerCase() === 'active';
    }).map(function (shop) { return normalizeId_(shop.ShopID); });
  }
  var allowed = {};
  readTable(ss, 'UserShops').forEach(function (membership) {
    if (String(membership.UserID) === String(user.UserID)) {
      allowed[normalizeId_(membership.ShopID)] = true;
    }
  });
  return shops.filter(function (shop) {
    var id = normalizeId_(shop.ShopID);
    return allowed[id] && String(shop.Status || 'active').toLowerCase() === 'active';
  }).map(function (shop) { return normalizeId_(shop.ShopID); });
}

function loginUser_(ss, usernameInput, passwordInput) {
  var username = String(usernameInput || '').trim().toLowerCase();
  var password = String(passwordInput || '');
  if (!username || !password) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
  var users = readTable(ss, 'Users');
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].Username || '').trim().toLowerCase() === username) {
      user = users[i];
      break;
    }
  }
  if (!user || String(user.Status || '').toLowerCase() !== 'active' ||
      !verifyPassword_(password, user.PasswordHash)) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
  }
  var allowedShopIds = activeShopIdsForUser_(ss, user);
  if (!allowedShopIds.length) throw new Error('FORBIDDEN: لا توجد محلات نشطة مرتبطة بهذا المستخدم.');

  var now = Date.now();
  var createdAt = new Date(now).toISOString();
  var expiresAt = new Date(now + 6 * 60 * 60 * 1000).toISOString();
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var selectedShop = getShopById_(ss, allowedShopIds[0]);
  var session = {
    sessionId: Utilities.getUuid(),
    userId: String(user.UserID),
    username: String(user.Username),
    role: String(user.Role).toLowerCase() === 'admin' ? 'admin' : 'shop_user',
    allowedShopIds: allowedShopIds,
    shopId: allowedShopIds[0],
    shopName: selectedShop ? String(selectedShop.ShopName || '') : '',
    createdAt: createdAt,
    expiresAt: expiresAt
  };
  cleanupExpiredSessions_();
  PropertiesService.getScriptProperties().setProperty(sessionPropertyKey_(token), JSON.stringify(session));
  return { success: true, session: session, token: token };
}

function requireSession_(token) {
  if (!token) throw new Error('UNAUTHORIZED: يلزم تسجيل الدخول.');
  var props = PropertiesService.getScriptProperties();
  var key = sessionPropertyKey_(token);
  var raw = props.getProperty(key);
  if (!raw) throw new Error('UNAUTHORIZED: الجلسة غير صالحة أو منتهية.');
  var session = JSON.parse(raw);
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    props.deleteProperty(key);
    throw new Error('UNAUTHORIZED: انتهت صلاحية الجلسة.');
  }
  var users = readTable(getSpreadsheet(), 'Users');
  var user = users.filter(function (row) {
    return String(row.UserID) === String(session.userId);
  })[0];
  if (!user || String(user.Status || '').toLowerCase() !== 'active') {
    props.deleteProperty(key);
    throw new Error('UNAUTHORIZED: الحساب غير نشط.');
  }
  session.username = String(user.Username);
  session.role = String(user.Role).toLowerCase() === 'admin' ? 'admin' : 'shop_user';
  session.allowedShopIds = activeShopIdsForUser_(getSpreadsheet(), user);
  if (!session.allowedShopIds.length) throw new Error('FORBIDDEN: لا توجد صلاحيات لمحلات نشطة.');
  return session;
}

function requireAdmin_(session) {
  if (!session || session.role !== 'admin') throw new Error('FORBIDDEN: هذه العملية متاحة للمدير فقط.');
}

function authorizeShop_(session, requestedShopId, allowAdminAll) {
  var requested = normalizeId_(requestedShopId);
  if (!requested) throw new Error('FORBIDDEN: يجب تحديد ShopID صراحةً.');
  if (requested === '*' || requested === 'ALL') {
    if (session.role === 'admin' && allowAdminAll && requested === 'ALL') return '*';
    throw new Error('FORBIDDEN: الوصول إلى جميع المحلات غير مسموح بهذا الطلب.');
  }
  if (session.allowedShopIds.indexOf(requested) < 0) {
    throw new Error('FORBIDDEN: لا تملك صلاحية الوصول إلى المحل ' + requested + '.');
  }
  return requested;
}

function getShopById_(ss, shopId) {
  var shops = readTable(ss, 'Shops');
  for (var i = 0; i < shops.length; i++) {
    if (normalizeId_(shops[i].ShopID) === normalizeId_(shopId)) return safeShop_(shops[i]);
  }
  return null;
}

function safeShop_(shop) {
  return {
    ShopID: shop.ShopID,
    ShopName: shop.ShopName,
    ContactName: shop.ContactName || '',
    Phone: shop.Phone || '',
    Email: shop.Email || '',
    Status: shop.Status || 'active',
    CreatedAt: shop.CreatedAt || '',
    Notes: shop.Notes || ''
  };
}

function getShopsForSession_(ss, session) {
  var allowed = session.role === 'admin' ? null : session.allowedShopIds;
  return readTable(ss, 'Shops').filter(function (shop) {
    return !allowed || allowed.indexOf(normalizeId_(shop.ShopID)) >= 0;
  }).map(safeShop_);
}

function safeUsers_(ss) {
  return readTable(ss, 'Users').map(function (user) {
    return {
      UserID: user.UserID,
      Username: user.Username,
      Role: user.Role,
      Status: user.Status,
      CreatedAt: user.CreatedAt,
      Notes: user.Notes,
      allowedShopIds: activeShopIdsForUser_(ss, user)
    };
  });
}

function setUserShopAccess_(ss, userId, shopIds) {
  var user = findRowById_(ss, 'Users', 'UserID', userId);
  if (!user) throw new Error('المستخدم غير موجود.');
  if (String(user.record.Role).toLowerCase() === 'admin') {
    throw new Error('لا يحتاج حساب المدير إلى عضويات UserShops.');
  }
  if (!Array.isArray(shopIds) || !shopIds.length) {
    throw new Error('يجب إسناد محل نشط واحد على الأقل للمستخدم.');
  }
  var shops = readTable(ss, 'Shops');
  var normalized = [];
  shopIds.forEach(function (id) {
    var shopId = normalizeId_(id);
    if (!shopId) throw new Error('معرف المحل غير صالح.');
    if (normalized.indexOf(shopId) >= 0) throw new Error('تم تكرار معرف المحل: ' + shopId);
    var shop = shops.filter(function (entry) {
      return normalizeId_(entry.ShopID) === shopId &&
        String(entry.Status || '').toLowerCase() === 'active';
    })[0];
    if (!shop) throw new Error('المحل غير موجود أو غير نشط: ' + shopId);
    normalized.push(shopId);
  });
  if (!normalized.length) throw new Error('لم يتم تحديد أي محل صالح.');

  var sheet = ss.getSheetByName('UserShops');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var userCol = headers.indexOf('UserID');
  for (var row = sheet.getLastRow(); row >= 2; row--) {
    if (String(sheet.getRange(row, userCol + 1).getValue()) === String(userId)) {
      sheet.deleteRow(row);
    }
  }
  normalized.forEach(function (shopId) {
    appendObjectByHeaders_(ss, 'UserShops', { UserID: userId, ShopID: shopId });
  });
  return { success: true, userId: userId, allowedShopIds: normalized };
}

function createUser_(ss, payload) {
  var username = String(payload.Username || '').trim();
  var password = String(payload.Password || '');
  var role = String(payload.Role || 'shop_user').toLowerCase();
  var status = String(payload.Status || 'active').toLowerCase();
  if (!username) throw new Error('اسم المستخدم مطلوب.');
  if (password.length < 10) throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف.');
  if (['admin', 'shop_user'].indexOf(role) < 0) throw new Error('Role غير صالح.');
  if (['active', 'inactive'].indexOf(status) < 0) throw new Error('Status غير صالح.');
  if (readTable(ss, 'Users').some(function (user) {
    return String(user.Username || '').trim().toLowerCase() === username.toLowerCase();
  })) throw new Error('اسم المستخدم مستخدم مسبقًا.');

  var normalizedShopIds = [];
  if (role === 'shop_user') {
    if (!Array.isArray(payload.ShopIDs) || !payload.ShopIDs.length) {
      throw new Error('يجب إسناد محل نشط واحد على الأقل لمستخدم المحل.');
    }
    var activeShops = readTable(ss, 'Shops').filter(function (shop) {
      return String(shop.Status || 'active').toLowerCase() === 'active';
    });
    payload.ShopIDs.forEach(function (id) {
      var shopId = normalizeId_(id);
      if (!shopId || normalizedShopIds.indexOf(shopId) >= 0) return;
      if (!activeShops.some(function (shop) { return normalizeId_(shop.ShopID) === shopId; })) {
        throw new Error('المحل غير موجود أو غير نشط: ' + shopId);
      }
      normalizedShopIds.push(shopId);
    });
    if (!normalizedShopIds.length) throw new Error('لم يتم تحديد أي محل صالح.');
  }

  var userId = 'usr-' + Utilities.getUuid();
  appendObjectByHeaders_(ss, 'Users', {
    UserID: userId,
    Username: username,
    PasswordHash: createPasswordHash_(password),
    Role: role,
    Status: status,
    CreatedAt: new Date().toISOString(),
    Notes: payload.Notes || ''
  });
  normalizedShopIds.forEach(function (shopId) {
    appendObjectByHeaders_(ss, 'UserShops', { UserID: userId, ShopID: shopId });
  });
  return { success: true, userId: userId, username: username, role: role, allowedShopIds: normalizedShopIds };
}

function resetUserPassword_(ss, userId, password) {
  if (String(password || '').length < 10) {
    throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف.');
  }
  var user = findRowById_(ss, 'Users', 'UserID', userId);
  if (!user) throw new Error('المستخدم غير موجود.');
  updateOwnedRecord_(user, { PasswordHash: createPasswordHash_(String(password)) });
  revokeUserSessions_(userId);
  return { success: true, userId: userId };
}

function safeTableData_(sheetName, rows) {
  return rows.map(function (row) {
    var safe = {};
    Object.keys(row).forEach(function (key) {
      var normalizedKey = String(key).toLowerCase();
      if (normalizedKey === 'password' || normalizedKey === 'passwordhash' ||
          (sheetName === 'Cheques' && (normalizedKey === 'bank' || normalizedKey === 'bankname'))) return;
      safe[key] = row[key];
    });
    return safe;
  });
}

function appendObjectByHeaders_(ss, sheetName, object) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('الجدول غير موجود: ' + sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (header) {
    return object[header] === undefined || object[header] === null ? '' : object[header];
  }));
}

function findRowById_(ss, sheetName, idColumn, id) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idIndex = headers.indexOf(idColumn);
  if (idIndex < 0) return null;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) {
      var record = {};
      headers.forEach(function (header, index) { record[header] = values[i][index]; });
      return { sheet: sheet, headers: headers, rowIndex: i + 2, record: record };
    }
  }
  return null;
}

function requireOwnedRecord_(ss, definition, recordId, shopId) {
  var found = findRowById_(ss, definition.sheet, definition.id, recordId);
  if (!found || normalizeId_(found.record.ShopID) !== normalizeId_(shopId)) {
    throw new Error('FORBIDDEN: السجل غير موجود أو لا يتبع المحل المحدد.');
  }
  return found;
}

function requireRelatedRecord_(ss, sheetName, idColumn, recordId, shopId, required) {
  if (!recordId && !required) return;
  if (!recordId && required) throw new Error('يجب تحديد ' + idColumn + '.');
  var found = findRowById_(ss, sheetName, idColumn, recordId);
  if (!found || normalizeId_(found.record.ShopID) !== normalizeId_(shopId)) {
    throw new Error('FORBIDDEN: السجل المرتبط غير موجود أو يتبع محلًا آخر.');
  }
}

function updateOwnedRecord_(found, updates) {
  Object.keys(updates).forEach(function (key) {
    if (key === 'ShopID' || updates[key] === undefined) return;
    var index = found.headers.indexOf(key);
    if (index >= 0) found.sheet.getRange(found.rowIndex, index + 1).setValue(updates[key]);
  });
}

function mutateRecord_(ss, session, shopId, action, payload, definition) {
  var now = new Date().toISOString();
  var id = payload[definition.id] || (definition.id.replace('ID', '').toLowerCase() + '-' + Utilities.getUuid());
  var update = action === definition.update || action === 'updateChequeStatus' ||
    action === 'updateReceivedInvoiceStatus';
  var remove = action === definition.remove;
  var updates = {};

  if (definition.sheet === 'Customers') {
    updates = {
      ShopName: payload.ShopName,
      ContactName: payload.ContactName,
      Phone: payload.Phone,
      Address: payload.Address,
      Notes: payload.Notes
    };
  } else if (definition.sheet === 'Invoices') {
    if (!remove) requireRelatedRecord_(ss, 'Customers', 'CustomerID', payload.CustomerID, shopId, true);
    updates = {
      InvoiceNumber: payload.InvoiceNumber,
      CustomerID: payload.CustomerID,
      InvoiceDate: payload.InvoiceDate,
      Amount: payload.Amount === undefined ? undefined : Number(payload.Amount) || 0,
      ReceiptStatus: payload.ReceiptStatus,
      ReceiptDate: payload.ReceiptDate,
      InvoiceFile: payload.InvoiceFile,
      Notes: payload.Notes
    };
  } else if (definition.sheet === 'Cheques') {
    if (!remove && action !== 'updateChequeStatus') {
      requireRelatedRecord_(ss, 'Customers', 'CustomerID', payload.CustomerID, shopId, true);
      requireRelatedRecord_(ss, 'Invoices', 'InvoiceID', payload.InvoiceID, shopId, false);
    }
    updates = action === 'updateChequeStatus' ? {
      Status: payload.Status,
      PaidDate: payload.PaidDate || (payload.Status === 'مدفوع' ? now.split('T')[0] : '')
    } : {
      ChequeNumber: payload.ChequeNumber === undefined ? undefined : String(payload.ChequeNumber),
      CustomerID: payload.CustomerID,
      InvoiceID: payload.InvoiceID,
      Amount: payload.Amount === undefined ? undefined : Number(payload.Amount) || 0,
      DueDate: payload.DueDate,
      ChequeImage: payload.ChequeImage,
      Notes: payload.Notes,
      Status: payload.Status,
      PaidDate: payload.PaidDate
    };
  } else if (definition.sheet === 'ReceivedInvoices') {
    updates = action === 'updateReceivedInvoiceStatus' ? {
      ReceiptStatus: payload.ReceiptStatus,
      ReceiptDate: payload.ReceiptDate || ''
    } : {
      InvoiceNumber: payload.InvoiceNumber,
      EntityName: payload.EntityName,
      Amount: payload.Amount === undefined ? undefined : Number(payload.Amount) || 0,
      InvoiceDate: payload.InvoiceDate,
      ReceiptStatus: payload.ReceiptStatus,
      ReceiptDate: payload.ReceiptDate,
      InvoiceFile: payload.InvoiceFile,
      Notes: payload.Notes
    };
  }

  if (update || remove) {
    var found = requireOwnedRecord_(ss, definition, id, shopId);
    if (remove) {
      found.sheet.deleteRow(found.rowIndex);
    } else {
      if (definition.sheet === 'Cheques') {
        requireRelatedRecord_(ss, 'Customers', 'CustomerID', updates.CustomerID === undefined ? found.record.CustomerID : updates.CustomerID, shopId, true);
        requireRelatedRecord_(ss, 'Invoices', 'InvoiceID', updates.InvoiceID === undefined ? found.record.InvoiceID : updates.InvoiceID, shopId, false);
      }
      if (definition.sheet === 'Invoices') {
        requireRelatedRecord_(ss, 'Customers', 'CustomerID', updates.CustomerID === undefined ? found.record.CustomerID : updates.CustomerID, shopId, true);
      }
      updateOwnedRecord_(found, updates);
    }
    return { success: true, id: id };
  }

  if (definition.sheet === 'Invoices') {
    requireRelatedRecord_(ss, 'Customers', 'CustomerID', payload.CustomerID, shopId, true);
  }
  if (definition.sheet === 'Cheques') {
    requireRelatedRecord_(ss, 'Customers', 'CustomerID', payload.CustomerID, shopId, true);
    requireRelatedRecord_(ss, 'Invoices', 'InvoiceID', payload.InvoiceID, shopId, false);
  }

  var created = {};
  created[definition.id] = id;
  created.ShopID = shopId;
  created.CreatedAt = payload.CreatedAt || now;
  if (definition.sheet === 'Customers') {
    created.ShopName = payload.ShopName || '';
    created.ContactName = payload.ContactName || '';
    created.Phone = payload.Phone || '';
    created.Address = payload.Address || '';
    created.Notes = payload.Notes || '';
  } else if (definition.sheet === 'Invoices') {
    created.InvoiceNumber = payload.InvoiceNumber || '';
    created.CustomerID = payload.CustomerID;
    created.InvoiceDate = payload.InvoiceDate || '';
    created.Amount = Number(payload.Amount) || 0;
    created.ReceiptStatus = payload.ReceiptStatus || 'مستحق';
    created.ReceiptDate = payload.ReceiptDate || '';
    created.InvoiceFile = payload.InvoiceFile || '';
    created.Notes = payload.Notes || '';
  } else if (definition.sheet === 'Cheques') {
    created.ChequeNumber = payload.ChequeNumber === undefined ? '' : String(payload.ChequeNumber);
    created.CustomerID = payload.CustomerID || '';
    created.InvoiceID = payload.InvoiceID || '';
    created.Amount = Number(payload.Amount) || 0;
    created.DueDate = payload.DueDate || '';
    created.ChequeImage = payload.ChequeImage || '';
    created.Notes = payload.Notes || '';
    created.Status = payload.Status || 'قادم';
    created.PaidDate = payload.PaidDate || '';
  } else if (definition.sheet === 'ReceivedInvoices') {
    created.InvoiceNumber = payload.InvoiceNumber || '';
    created.EntityName = payload.EntityName || '';
    created.Amount = Number(payload.Amount) || 0;
    created.InvoiceDate = payload.InvoiceDate || '';
    created.ReceiptStatus = payload.ReceiptStatus || 'لم يتم الاستلام';
    created.ReceiptDate = payload.ReceiptDate || '';
    created.InvoiceFile = payload.InvoiceFile || '';
    created.Notes = payload.Notes || '';
  }
  appendObjectByHeaders_(ss, definition.sheet, created);
  return { success: true, id: id };
}

function handleShopMutation_(ss, action, payload) {
  var shops = readTable(ss, 'Shops');
  var shopId = normalizeId_(payload.ShopID);
  if (action === 'createShop') {
    if (!/^[A-Z0-9_-]+$/.test(shopId)) throw new Error('معرف المحل غير صالح.');
    if (shops.some(function (shop) { return normalizeId_(shop.ShopID) === shopId; })) {
      throw new Error('معرف المحل موجود مسبقًا.');
    }
    var username = String(payload.Username || '').trim();
    var password = String(payload.Password || '');
    if (!username || password.length < 10) throw new Error('اسم المستخدم مطلوب وكلمة المرور يجب ألا تقل عن 10 أحرف.');
    if (readTable(ss, 'Users').some(function (user) { return String(user.Username).toLowerCase() === username.toLowerCase(); })) {
      throw new Error('اسم المستخدم مستخدم مسبقًا.');
    }
    if (['active', 'inactive'].indexOf(String(payload.Status || 'active').toLowerCase()) < 0) {
      throw new Error('قيمة Status غير صالحة.');
    }
    appendObjectByHeaders_(ss, 'Shops', {
      ShopID: shopId, ShopName: payload.ShopName || shopId,
      ContactName: payload.ContactName || '', Phone: payload.Phone || '', Email: payload.Email || '',
      Status: payload.Status || 'active', CreatedAt: new Date().toISOString(), Notes: payload.Notes || ''
    });
    var userId = 'usr-' + Utilities.getUuid();
    appendObjectByHeaders_(ss, 'Users', {
      UserID: userId, Username: username, PasswordHash: createPasswordHash_(password), Role: 'shop_user',
      Status: 'active', CreatedAt: new Date().toISOString(), Notes: ''
    });
    appendObjectByHeaders_(ss, 'UserShops', { UserID: userId, ShopID: shopId });
    return { success: true, id: shopId };
  }

  var found = findRowById_(ss, 'Shops', 'ShopID', shopId);
  if (!found) throw new Error('المحل غير موجود.');
  if (action === 'deleteShop') {
    updateOwnedRecord_(found, { Status: 'inactive' });
    return { success: true, id: shopId, deactivated: true };
  }
  var newStatus = String(payload.Status || found.record.Status || 'active').toLowerCase();
  if (['active', 'inactive'].indexOf(newStatus) < 0) throw new Error('قيمة Status غير صالحة.');
  updateOwnedRecord_(found, {
    ShopName: payload.ShopName === undefined ? undefined : String(payload.ShopName),
    ContactName: payload.ContactName === undefined ? undefined : String(payload.ContactName),
    Phone: payload.Phone === undefined ? undefined : String(payload.Phone),
    Email: payload.Email === undefined ? undefined : String(payload.Email),
    Status: newStatus,
    Notes: payload.Notes === undefined ? undefined : String(payload.Notes)
  });
  return { success: true, id: shopId };
}

function readSettings(ss, shopId) {
  var defaults = { Reminder1Days: 7, Reminder2Days: 3, Reminder3Days: 1, ReminderToday: 0 };
  var sheet = ss.getSheetByName('Settings');
  if (!sheet || sheet.getLastRow() <= 1) return defaults;
  var rows = readTable(ss, 'Settings');
  rows.forEach(function (row) {
    if (normalizeId_(row.ShopID)) return;
    if (row.Setting && row.Value !== '') {
      var value = Number(row.Value);
      if (!isNaN(value)) defaults[row.Setting] = value;
    }
  });
  rows.forEach(function (row) {
    if (normalizeId_(row.ShopID) !== normalizeId_(shopId)) return;
    if (row.Setting && row.Value !== '') {
      var value = Number(row.Value);
      if (!isNaN(value)) defaults[row.Setting] = value;
    }
  });
  return defaults;
}

function saveSettings_(ss, shopId, settings) {
  var allowedKeys = ['Reminder1Days', 'Reminder2Days', 'Reminder3Days', 'ReminderToday'];
  var sheet = ss.getSheetByName('Settings');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  allowedKeys.forEach(function (key) {
    if (settings[key] === undefined) return;
    var value = Number(settings[key]);
    if (!isFinite(value) || value < 0) throw new Error('قيمة إعداد التنبيه غير صالحة: ' + key);
    var rows = readTable(ss, 'Settings');
    var existing = rows.filter(function (row) {
      return row.Setting === key && normalizeId_(row.ShopID) === normalizeId_(shopId);
    })[0];
    if (existing) {
      if (headers.indexOf('ShopID') >= 0) {
        var all = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
        for (var i = 0; i < all.length; i++) {
          if (all[i][headers.indexOf('Setting')] === key &&
              normalizeId_(all[i][headers.indexOf('ShopID')]) === normalizeId_(shopId)) {
            sheet.getRange(i + 2, headers.indexOf('Value') + 1).setValue(value);
            return;
          }
        }
      }
    }
    appendObjectByHeaders_(ss, 'Settings', { Setting: key, Value: value, ShopID: shopId });
  });
}

/**
 * رفع وحفظ صورة أو ملف في مجلد المحل في Google Drive
 */
function handleFileUpload(payload, shopId) {
  if (!payload.base64Data) {
    throw new Error('لم يتم إرسال بيانات الصورة (base64Data).');
  }

  var rawBase64 = payload.base64Data;
  var dataUriMimeType = '';
  var commaIndex = rawBase64.indexOf(',');
  if (commaIndex > -1) {
    var dataUriHeader = rawBase64.substring(0, commaIndex);
    var dataUriMatch = dataUriHeader.match(/^data:([^;,]+);base64$/i);
    if (!dataUriMatch) throw new Error('بيانات الملف المرسلة غير صالحة.');
    dataUriMimeType = String(dataUriMatch[1]).toLowerCase();
    rawBase64 = rawBase64.substring(commaIndex + 1);
  }

  rawBase64 = String(rawBase64).replace(/\s/g, '');
  var mimeType = String(payload.mimeType || dataUriMimeType || 'image/jpeg').trim().toLowerCase();
  var fileName = String(payload.filename || ('sanad_' + shopId + '_' + new Date().getTime() +
    (mimeType === 'application/pdf' ? '.pdf' : '.jpg'))).trim();
  var extensionMatch = fileName.match(/\.([^.]+)$/);
  var extension = extensionMatch ? '.' + extensionMatch[1].toLowerCase() : '';
  var mimeExtensions = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf']
  };
  var invalidTypeMessage = 'نوع الملف غير مسموح. الأنواع المسموحة: JPG, JPEG, PNG, WEBP, GIF, PDF.';

  if (!mimeExtensions[mimeType] || mimeExtensions[mimeType].indexOf(extension) < 0 ||
      (dataUriMimeType && dataUriMimeType !== mimeType)) {
    throw new Error(invalidTypeMessage);
  }

  var maxFileSize = 10 * 1024 * 1024;
  var paddingMatch = rawBase64.match(/=*$/);
  var paddingLength = paddingMatch ? paddingMatch[0].length : 0;
  var estimatedSize = Math.floor(rawBase64.length * 3 / 4) - paddingLength;
  if (estimatedSize > maxFileSize) {
    throw new Error('حجم الملف يتجاوز الحد المسموح (10 MB).');
  }
  var decodedBytes = Utilities.base64Decode(rawBase64);
  if (decodedBytes.length > maxFileSize) {
    throw new Error('حجم الملف يتجاوز الحد المسموح (10 MB).');
  }

  var folder = getShopFolder(shopId);
  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var fileUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
  var webViewLink = file.getUrl();

  return {
    success: true,
    fileId: fileId,
    fileUrl: fileUrl,
    webViewLink: webViewLink,
    name: fileName,
    mimeType: mimeType
  };
}

/**
 * قراءة جدول وتحويله إلى كائنات JSON
 */
function readTable(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, 'Asia/Riyadh', 'yyyy-MM-dd');
      }
      item[headers[j]] = val;
      if (val !== '' && val !== null && val !== undefined) {
        hasContent = true;
      }
    }
    if (hasContent) {
      results.push(item);
    }
  }

  return results;
}

/**
 * إضافة صف إلى الجدول (تدعم مصفوفة أو كائن يتم ربطه بأسماء الأعمدة تلقائياً)
 */
function appendRowToSheet(ss, sheetName, rowData) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    initDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  if (!sheet) return;

  if (Array.isArray(rowData)) {
    sheet.appendRow(rowData);
  } else if (typeof rowData === 'object' && rowData !== null) {
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return;
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      var val = '';
      if (rowData[h] !== undefined && rowData[h] !== null) {
        val = rowData[h];
      } else {
        var foundKey = null;
        for (var k in rowData) {
          if (k.toLowerCase() === h.toLowerCase()) {
            foundKey = k;
            break;
          }
        }
        if (foundKey && rowData[foundKey] !== undefined && rowData[foundKey] !== null) {
          val = rowData[foundKey];
        }
      }
      row.push(val);
    }
    sheet.appendRow(row);
  }
}

/**
 * تعديل صف محدد بالـ ID
 */
function updateRowById(ss, sheetName, idColName, targetId, updates) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return false;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idColIndex = headers.indexOf(idColName);
  if (idColIndex === -1) return false;

  var idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  var rowIndex = -1;

  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(targetId)) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex === -1) return false;

  for (var key in updates) {
    var colIdx = headers.indexOf(key);
    if (colIdx !== -1) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(updates[key]);
    }
  }

  return true;
}

/**
 * حذف صف محدد بالـ ID
 */
function deleteRowById(ss, sheetName, idColName, targetId) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return false;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idColIndex = headers.indexOf(idColName);
  if (idColIndex === -1) return false;

  var idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();

  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(targetId)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }

  return false;
}

/**
 * دالة مساعدة لإرجاع استجابة JSON
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
