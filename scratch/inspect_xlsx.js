const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = path.join(__dirname, '../ادوية_طب_الاسنان_الجزائر.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Read raw sheet as 2D array
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  console.log('Total raw rows:', rows.length);
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    console.log(`Row ${i}:`, rows[i]);
  }
} catch (err) {
  console.error('Error reading excel file:', err.message);
}
