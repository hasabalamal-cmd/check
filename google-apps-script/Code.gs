/**
 * =========================================================================
 * تطبيق سند - Google Apps Script Backend API
 * نظام إدارة العملاء، الشيكات، فواتير التوريد، الفواتير المستلمة وملفات Drive
 * =========================================================================
 */

// إعدادات افتراضية - يمكن تخصيصها عبر Script Properties
var FOLDER_NAME = 'سند - صور ومستندات';

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
 * دالة مساعدة للحصول على مجلد Google Drive لتخزين صور الشيكات والفواتير
 */
function getTargetFolder() {
  var folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      console.warn('تعذر العثور على المجلد المحدد بالمعرف، سيتم إنشاء مجلد باسم سند تلقائياً.');
    }
  }

  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * تهيئة وإنشاء الجداول تلقائياً بالهيكلية المطلوبة إذا لم تكن موجودة
 */
function initDatabase() {
  var ss = getSpreadsheet();

  // 1. Customers
  var sheetCustomers = ss.getSheetByName('Customers');
  if (!sheetCustomers) {
    sheetCustomers = ss.insertSheet('Customers');
    sheetCustomers.appendRow([
      'CustomerID', 'ShopName', 'ContactName', 'Phone', 'Address', 'Notes', 'CreatedAt'
    ]);
    sheetCustomers.setFrozenRows(1);
    sheetCustomers.setRightToLeft(true);
  }

  // 2. Invoices
  var sheetInvoices = ss.getSheetByName('Invoices');
  if (!sheetInvoices) {
    sheetInvoices = ss.insertSheet('Invoices');
    sheetInvoices.appendRow([
      'InvoiceID', 'InvoiceNumber', 'CustomerID', 'InvoiceDate', 'Amount',
      'ReceiptStatus', 'ReceiptDate', 'InvoiceFile', 'Notes', 'CreatedAt'
    ]);
    sheetInvoices.setFrozenRows(1);
    sheetInvoices.setRightToLeft(true);
  }

  // 3. Cheques
  var sheetCheques = ss.getSheetByName('Cheques');
  if (!sheetCheques) {
    sheetCheques = ss.insertSheet('Cheques');
    sheetCheques.appendRow([
      'ChequeID', 'ChequeNumber', 'CustomerID', 'InvoiceID', 'Amount',
      'DueDate', 'Bank', 'ChequeImage', 'Notes', 'Status', 'PaidDate', 'CreatedAt'
    ]);
    sheetCheques.setFrozenRows(1);
    sheetCheques.setRightToLeft(true);
  }

  // 4. ReceivedInvoices
  var sheetReceived = ss.getSheetByName('ReceivedInvoices');
  if (!sheetReceived) {
    sheetReceived = ss.insertSheet('ReceivedInvoices');
    sheetReceived.appendRow([
      'ReceivedInvoiceID', 'InvoiceNumber', 'EntityName', 'Amount', 'InvoiceDate',
      'ReceiptStatus', 'ReceiptDate', 'InvoiceFile', 'Notes', 'CreatedAt'
    ]);
    sheetReceived.setFrozenRows(1);
    sheetReceived.setRightToLeft(true);
  }

  // 5. Settings
  var sheetSettings = ss.getSheetByName('Settings');
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet('Settings');
    sheetSettings.appendRow(['Setting', 'Value']);
    sheetSettings.appendRow(['Reminder1Days', '7']);
    sheetSettings.appendRow(['Reminder2Days', '3']);
    sheetSettings.appendRow(['Reminder3Days', '1']);
    sheetSettings.appendRow(['ReminderToday', '0']);
    sheetSettings.setFrozenRows(1);
    sheetSettings.setRightToLeft(true);
  }

  // 6. RemindersLog (سجل التنبيهات لتفادي التكرار)
  var sheetReminders = ss.getSheetByName('RemindersLog');
  if (!sheetReminders) {
    sheetReminders = ss.insertSheet('RemindersLog');
    sheetReminders.appendRow(['LogID', 'ChequeID', 'ReminderType', 'SentDate', 'Message']);
    sheetReminders.setFrozenRows(1);
    sheetReminders.setRightToLeft(true);
  }

  return { success: true, message: 'تم تهيئة جداول قاعدة البيانات بنجاح.' };
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
        message: 'Google Apps Script Web App متصل وجاهز للعمل مع تطبيق سند.',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'init') {
      var initResult = initDatabase();
      return createJsonResponse(initResult);
    }

    if (action === 'checkReminders') {
      var reminderResult = checkChequeReminders();
      return createJsonResponse({ success: true, result: reminderResult });
    }

    var ss = getSpreadsheet();
    initDatabase(); // التأكد من وجود الجداول

    if (action === 'getCustomers') {
      return createJsonResponse({ success: true, data: readTable(ss, 'Customers') });
    }
    if (action === 'getInvoices') {
      return createJsonResponse({ success: true, data: readTable(ss, 'Invoices') });
    }
    if (action === 'getCheques') {
      return createJsonResponse({ success: true, data: readTable(ss, 'Cheques') });
    }
    if (action === 'getReceivedInvoices') {
      return createJsonResponse({ success: true, data: readTable(ss, 'ReceivedInvoices') });
    }
    if (action === 'getSettings') {
      return createJsonResponse({ success: true, data: readSettings(ss) });
    }

    // Default: getInitialData (إرجاع جميع البيانات في طلب HTTP واحد فائق السرعة)
    var initialData = {
      customers: readTable(ss, 'Customers'),
      invoices: readTable(ss, 'Invoices'),
      cheques: readTable(ss, 'Cheques'),
      receivedInvoices: readTable(ss, 'ReceivedInvoices'),
      settings: readSettings(ss),
      reminders: readTable(ss, 'RemindersLog')
    };

    return createJsonResponse({ success: true, data: initialData });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || String(error)
    });
  }
}

/**
 * معالجة طلبات POST
 */
function doPost(e) {
  try {
    var ss = getSpreadsheet();
    initDatabase();

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action;

    // 1. رفع صورة إلى Google Drive
    if (action === 'uploadFile') {
      var fileRes = handleFileUpload(payload);
      return createJsonResponse(fileRes);
    }

    // 2. عمليات العملاء
    if (action === 'createCustomer') {
      var row = [
        payload.CustomerID || ('cust-' + new Date().getTime()),
        payload.ShopName || '',
        payload.ContactName || '',
        payload.Phone || '',
        payload.Address || '',
        payload.Notes || '',
        payload.CreatedAt || new Date().toISOString()
      ];
      appendRowToSheet(ss, 'Customers', row);
      return createJsonResponse({ success: true, id: row[0], data: payload });
    }

    if (action === 'updateCustomer') {
      var updated = updateRowById(ss, 'Customers', 'CustomerID', payload.CustomerID, {
        'ShopName': payload.ShopName,
        'ContactName': payload.ContactName,
        'Phone': payload.Phone,
        'Address': payload.Address,
        'Notes': payload.Notes
      });
      return createJsonResponse({ success: updated, id: payload.CustomerID });
    }

    if (action === 'deleteCustomer') {
      var deleted = deleteRowById(ss, 'Customers', 'CustomerID', payload.CustomerID);
      return createJsonResponse({ success: deleted, id: payload.CustomerID });
    }

    // 3. عمليات فواتير العملاء
    if (action === 'createInvoice') {
      var rowInv = [
        payload.InvoiceID || ('inv-' + new Date().getTime()),
        payload.InvoiceNumber || '',
        payload.CustomerID || '',
        payload.InvoiceDate || '',
        Number(payload.Amount) || 0,
        payload.ReceiptStatus || 'مستحق',
        payload.ReceiptDate || '',
        payload.InvoiceFile || '',
        payload.Notes || '',
        payload.CreatedAt || new Date().toISOString()
      ];
      appendRowToSheet(ss, 'Invoices', rowInv);
      return createJsonResponse({ success: true, id: rowInv[0], data: payload });
    }

    if (action === 'updateInvoice') {
      var updatedInv = updateRowById(ss, 'Invoices', 'InvoiceID', payload.InvoiceID, {
        'InvoiceNumber': payload.InvoiceNumber,
        'CustomerID': payload.CustomerID,
        'InvoiceDate': payload.InvoiceDate,
        'Amount': Number(payload.Amount) || 0,
        'ReceiptStatus': payload.ReceiptStatus,
        'ReceiptDate': payload.ReceiptDate,
        'InvoiceFile': payload.InvoiceFile,
        'Notes': payload.Notes
      });
      return createJsonResponse({ success: updatedInv, id: payload.InvoiceID });
    }

    if (action === 'deleteInvoice') {
      var deletedInv = deleteRowById(ss, 'Invoices', 'InvoiceID', payload.InvoiceID);
      return createJsonResponse({ success: deletedInv, id: payload.InvoiceID });
    }

    // 4. عمليات الشيكات
    if (action === 'createCheque') {
      var rowChk = [
        payload.ChequeID || ('chk-' + new Date().getTime()),
        payload.ChequeNumber || '',
        payload.CustomerID || '',
        payload.InvoiceID || '',
        Number(payload.Amount) || 0,
        payload.DueDate || '',
        payload.Bank || '',
        payload.ChequeImage || '',
        payload.Notes || '',
        payload.Status || 'قادم',
        payload.PaidDate || '',
        payload.CreatedAt || new Date().toISOString()
      ];
      appendRowToSheet(ss, 'Cheques', rowChk);
      return createJsonResponse({ success: true, id: rowChk[0], data: payload });
    }

    if (action === 'updateCheque') {
      var updatedChk = updateRowById(ss, 'Cheques', 'ChequeID', payload.ChequeID, {
        'ChequeNumber': payload.ChequeNumber,
        'CustomerID': payload.CustomerID,
        'InvoiceID': payload.InvoiceID,
        'Amount': Number(payload.Amount) || 0,
        'DueDate': payload.DueDate,
        'Bank': payload.Bank,
        'ChequeImage': payload.ChequeImage,
        'Notes': payload.Notes,
        'Status': payload.Status,
        'PaidDate': payload.PaidDate
      });
      return createJsonResponse({ success: updatedChk, id: payload.ChequeID });
    }

    if (action === 'updateChequeStatus') {
      var updatedChkStatus = updateRowById(ss, 'Cheques', 'ChequeID', payload.ChequeID, {
        'Status': payload.Status,
        'PaidDate': payload.PaidDate || (payload.Status === 'مدفوع' ? new Date().toISOString().split('T')[0] : '')
      });
      return createJsonResponse({ success: updatedChkStatus, id: payload.ChequeID });
    }

    if (action === 'deleteCheque') {
      var deletedChk = deleteRowById(ss, 'Cheques', 'ChequeID', payload.ChequeID);
      return createJsonResponse({ success: deletedChk, id: payload.ChequeID });
    }

    // 5. عمليات الفواتير المستلمة
    if (action === 'createReceivedInvoice') {
      var rowRec = [
        payload.ReceivedInvoiceID || ('rec-' + new Date().getTime()),
        payload.InvoiceNumber || '',
        payload.EntityName || '',
        Number(payload.Amount) || 0,
        payload.InvoiceDate || '',
        payload.ReceiptStatus || 'لم يتم الاستلام',
        payload.ReceiptDate || '',
        payload.InvoiceFile || '',
        payload.Notes || '',
        payload.CreatedAt || new Date().toISOString()
      ];
      appendRowToSheet(ss, 'ReceivedInvoices', rowRec);
      return createJsonResponse({ success: true, id: rowRec[0], data: payload });
    }

    if (action === 'updateReceivedInvoice') {
      var updatedRec = updateRowById(ss, 'ReceivedInvoices', 'ReceivedInvoiceID', payload.ReceivedInvoiceID, {
        'InvoiceNumber': payload.InvoiceNumber,
        'EntityName': payload.EntityName,
        'Amount': Number(payload.Amount) || 0,
        'InvoiceDate': payload.InvoiceDate,
        'ReceiptStatus': payload.ReceiptStatus,
        'ReceiptDate': payload.ReceiptDate,
        'InvoiceFile': payload.InvoiceFile,
        'Notes': payload.Notes
      });
      return createJsonResponse({ success: updatedRec, id: payload.ReceivedInvoiceID });
    }

    if (action === 'updateReceivedInvoiceStatus') {
      var updatedRecStatus = updateRowById(ss, 'ReceivedInvoices', 'ReceivedInvoiceID', payload.ReceivedInvoiceID, {
        'ReceiptStatus': payload.ReceiptStatus,
        'ReceiptDate': payload.ReceiptDate || ''
      });
      return createJsonResponse({ success: updatedRecStatus, id: payload.ReceivedInvoiceID });
    }

    if (action === 'deleteReceivedInvoice') {
      var deletedRec = deleteRowById(ss, 'ReceivedInvoices', 'ReceivedInvoiceID', payload.ReceivedInvoiceID);
      return createJsonResponse({ success: deletedRec, id: payload.ReceivedInvoiceID });
    }

    // 6. مزامنة كاملة عند البدء إذا كان الجدول فارغاً
    if (action === 'syncSeedData') {
      if (payload.customers && payload.customers.length) {
        payload.customers.forEach(function (c) {
          appendRowToSheet(ss, 'Customers', [
            c.CustomerID || c.id, c.ShopName || c.name, c.ContactName || c.contactPerson,
            c.Phone || c.phone, c.Address || c.address, c.Notes || c.notes, c.CreatedAt || c.createdAt
          ]);
        });
      }
      if (payload.invoices && payload.invoices.length) {
        payload.invoices.forEach(function (inv) {
          appendRowToSheet(ss, 'Invoices', [
            inv.InvoiceID || inv.id, inv.InvoiceNumber || inv.invoiceNumber, inv.CustomerID || inv.customerId,
            inv.InvoiceDate || inv.invoiceDate, Number(inv.Amount || inv.amount),
            inv.ReceiptStatus || 'مستحق', inv.ReceiptDate || '', inv.InvoiceFile || inv.image || '',
            inv.Notes || inv.notes, inv.CreatedAt || inv.createdAt
          ]);
        });
      }
      if (payload.cheques && payload.cheques.length) {
        payload.cheques.forEach(function (chk) {
          appendRowToSheet(ss, 'Cheques', [
            chk.ChequeID || chk.id, chk.ChequeNumber || chk.checkNumber, chk.CustomerID || chk.customerId,
            chk.InvoiceID || chk.linkedInvoiceId || '', Number(chk.Amount || chk.amount),
            chk.DueDate || chk.dueDate, chk.Bank || chk.bankName || '', chk.ChequeImage || chk.image || '',
            chk.Notes || chk.notes, chk.Status || chk.status, chk.PaidDate || chk.cashedDate || '', chk.CreatedAt || chk.createdAt
          ]);
        });
      }
      if (payload.receivedInvoices && payload.receivedInvoices.length) {
        payload.receivedInvoices.forEach(function (rec) {
          appendRowToSheet(ss, 'ReceivedInvoices', [
            rec.ReceivedInvoiceID || rec.id, rec.InvoiceNumber || rec.invoiceNumber, rec.EntityName || rec.sourceName,
            Number(rec.Amount || rec.amount), rec.InvoiceDate || rec.invoiceDate,
            rec.ReceiptStatus || rec.receiptStatus, rec.ReceiptDate || '', rec.InvoiceFile || rec.image || '',
            rec.Notes || rec.notes, rec.CreatedAt || rec.createdAt
          ]);
        });
      }
      return createJsonResponse({ success: true, message: 'تم استيراد البيانات بنجاح.' });
    }

    return createJsonResponse({ success: false, error: 'إجراء غير معروف: ' + action });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.message || String(error)
    });
  }
}

/**
 * رفع وحفظ صورة أو ملف في Google Drive
 */
function handleFileUpload(payload) {
  if (!payload.base64Data) {
    throw new Error('لم يتم إرسال بيانات الصورة (base64Data).');
  }

  var folder = getTargetFolder();
  var rawBase64 = payload.base64Data;

  // إزالة data:image/png;base64, إذا كانت موجودة
  var commaIndex = rawBase64.indexOf(',');
  if (commaIndex > -1) {
    rawBase64 = rawBase64.substring(commaIndex + 1);
  }

  var decodedBytes = Utilities.base64Decode(rawBase64);
  var mimeType = payload.mimeType || 'image/jpeg';
  var fileName = payload.filename || ('sanad_file_' + new Date().getTime() + '.jpg');

  var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // رابط العرض المباشر في المتصفح
  var fileId = file.getId();
  var fileUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
  var webViewLink = file.getUrl();

  return {
    success: true,
    fileId: fileId,
    fileUrl: fileUrl,
    webViewLink: webViewLink
  };
}

/**
 * قراءة جدول وتحويله إلى قائمة كائنات JSON بناءً على رؤوس الأعمدة
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
 * قراءة إعدادات التنبيهات
 */
function readSettings(ss) {
  var sheet = ss.getSheetByName('Settings');
  var settings = {
    Reminder1Days: 7,
    Reminder2Days: 3,
    Reminder3Days: 1,
    ReminderToday: 0
  };
  if (!sheet) return settings;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return settings;

  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    var key = data[i][0];
    var val = data[i][1];
    if (key) {
      settings[key] = Number(val);
    }
  }
  return settings;
}

/**
 * إضافة صف إلى الجدول
 */
function appendRowToSheet(ss, sheetName, rowData) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    initDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  sheet.appendRow(rowData);
}

/**
 * تعديل صف محدد بمعرف ID
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
      rowIndex = i + 2; // +1 zero-index, +1 header row
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
 * جدولة فحص الشيكات وإرسال التنبيهات (Time-driven Trigger)
 * تفحص Google Sheets وتنشئ التنبيهات ولا ترسل التنبيه أكثر من مرة لنفس الشيك
 */
function checkChequeReminders() {
  var ss = getSpreadsheet();
  var cheques = readTable(ss, 'Cheques');
  var customers = readTable(ss, 'Customers');
  var settings = readSettings(ss);
  var remindersLog = readTable(ss, 'RemindersLog');

  var customerMap = {};
  customers.forEach(function (c) {
    customerMap[c.CustomerID] = c.ShopName;
  });

  // تكوين سجلات التنبيه السابقة لتجنب التكرار
  var loggedKeys = {};
  remindersLog.forEach(function (r) {
    var key = r.ChequeID + '_' + r.ReminderType;
    loggedKeys[key] = true;
  });

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var newReminders = [];

  cheques.forEach(function (chk) {
    // تجاهل الشيكات المدفوعة أو الملغاة
    if (chk.Status === 'مدفوع' || chk.Status === 'ملغي' || chk.Status === 'cashed' || chk.Status === 'cancelled') {
      return;
    }

    if (!chk.DueDate) return;

    var due = new Date(chk.DueDate);
    due.setHours(0, 0, 0, 0);

    var diffTime = due.getTime() - today.getTime();
    var daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));

    var reminderType = null;
    if (daysDiff === Number(settings.Reminder1Days)) {
      reminderType = '7_days';
    } else if (daysDiff === Number(settings.Reminder2Days)) {
      reminderType = '3_days';
    } else if (daysDiff === Number(settings.Reminder3Days)) {
      reminderType = '1_day';
    } else if (daysDiff === Number(settings.ReminderToday)) {
      reminderType = 'today';
    } else if (daysDiff < 0) {
      reminderType = 'overdue';
    }

    if (reminderType) {
      var logKey = chk.ChequeID + '_' + reminderType;
      // التحقق من عدم الإرسال المسبق لنفس الشيك ونفس نوع التنبيه
      if (!loggedKeys[logKey]) {
        var storeName = customerMap[chk.CustomerID] || chk.CustomerID;
        var msg = 'تنبيه شيك ' + (daysDiff <= 0 ? 'مستحق' : 'قادم') +
                  '\nالمحل: ' + storeName +
                  '\nالمبلغ: ' + chk.Amount + ' ريال' +
                  '\nتاريخ الاستحقاق: ' + chk.DueDate +
                  (daysDiff > 0 ? ('\nمتبقي ' + daysDiff + ' أيام') : '\nالشيك مستحق اليوم أو متأخر');

        appendRowToSheet(ss, 'RemindersLog', [
          'rem-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
          chk.ChequeID,
          reminderType,
          new Date().toISOString(),
          msg
        ]);

        loggedKeys[logKey] = true;
        newReminders.push({ chequeId: chk.ChequeID, type: reminderType, message: msg });
      }
    }
  });

  return {
    checkedChequesCount: cheques.length,
    newRemindersCreated: newReminders.length,
    reminders: newReminders
  };
}

/**
 * دالة مساعدة لإنشاء مشغّل مجدول يومياً في Google Apps Script
 */
function setupDailyTrigger() {
  // حذف أي مشغلات سابقة لنفس الدالة
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkChequeReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // إنشاء مشغل جديد يعمل يومياً في الصباح الباكر (بين 8:00 و 9:00 صباحاً)
  ScriptApp.newTrigger('checkChequeReminders')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  console.log('تم إنشاء المشغل اليومي checkChequeReminders بنجاح.');
}

/**
 * دالة مساعدة لإرجاع استجابة JSON مع رؤوس CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
