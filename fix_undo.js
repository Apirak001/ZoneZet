const fs = require('fs');
let c = fs.readFileSync('public/indicator.js', 'utf8');

c = c.replace(
  '<button class="btn-delete-custom" type="button" title="Delete">',
  '<button class="btn-delete-custom" type="button" title="Delete" onclick="window.deleteRecordItem(\\'${cat.id}\\', ${index})">'
);

c = c.replace(
  '<button class="btn-history-custom" type="button" title="History">',
  '<button class="btn-history-custom" type="button" title="Undo Delete" onclick="window.undoDeleteRecord(\\'${cat.id}\\')">'
);

const newFunctions = `

if (!window.deletedRecords) {
  window.deletedRecords = { gdp: [], inflation: [], unemployment: [] };
}

window.deleteRecordItem = function(type, index) {
  if (!window.deletedRecords) window.deletedRecords = { gdp: [], inflation: [], unemployment: [] };
  if (!window.deletedRecords[type]) window.deletedRecords[type] = [];
  
  const removedItem = window.processedRecords[type].splice(index, 1)[0];
  window.deletedRecords[type].push({ item: removedItem, index: index });
  
  if (window.showGlassAlert) window.showGlassAlert('ลบข้อมูลเรียบร้อยแล้ว', 'success');
  window.initRecordPage();
};

window.undoDeleteRecord = function(type) {
  if (!window.deletedRecords || !window.deletedRecords[type] || window.deletedRecords[type].length === 0) {
    if (window.showGlassAlert) window.showGlassAlert('ไม่มีประวัติการลบในหมวดหมู่นี้', 'warning');
    return;
  }
  
  const lastDeleted = window.deletedRecords[type].pop();
  
  const currentLen = window.processedRecords[type].length;
  const insertIndex = Math.min(lastDeleted.index, currentLen);
  window.processedRecords[type].splice(insertIndex, 0, lastDeleted.item);
  
  if (window.showGlassAlert) window.showGlassAlert('เรียกคืนข้อมูลสำเร็จ!', 'success');
  window.initRecordPage();
};
`;

if (!c.includes('window.deleteRecordItem')) {
  fs.writeFileSync('public/indicator.js', c + newFunctions, 'utf8');
  console.log('Successfully injected undo/delete logic.');
} else {
  console.log('Already injected.');
}
