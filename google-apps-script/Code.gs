/**
 * Lalana & Kartik — RSVP → Google Sheets
 *
 * STANDALONE SETUP (use this if Extensions → Apps Script fails in the sheet):
 * 1. Go to https://script.google.com → New project
 * 2. Paste this entire file into the editor
 * 3. Run setupSheet once (authorize when prompted)
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL into rsvp-config.js on the website
 *
 * Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1IoWq55wBcP4h6_PZoZNDBEKXrjBsYlKUIg7W76aRKNY/edit
 */

var SPREADSHEET_ID = '1IoWq55wBcP4h6_PZoZNDBEKXrjBsYlKUIg7W76aRKNY';
var SHEET_NAME = 'Sheet1';

var HEADERS = [
  'Timestamp',
  'Name',
  'Guest Count',
  'Response',
  'Wedding Ceremony',
  'Reception',
  'Message'
];

function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  return sheet || ss.getActiveSheet();
}

function setupSheet() {
  var sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Lalana & Kartik RSVP endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    setupSheet();

    var payload = JSON.parse(e.postData.contents);
    var events = payload.events || [];
    var attending = payload.attending === 'yes' ? 'Joyfully Joining' : 'Sadly Regret';
    var wedding = events.indexOf('Wedding Ceremony') !== -1 ? '\u2713' : '';
    var reception = events.indexOf('Reception') !== -1 ? '\u2713' : '';

    getSheet_().appendRow([
      new Date(),
      String(payload.name || '').trim(),
      Number(payload.guests) || 0,
      attending,
      wedding,
      reception,
      String(payload.message || '').trim()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
