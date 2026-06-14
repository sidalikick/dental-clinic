const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function main() {
  try {
    const filePath = path.join(__dirname, '../ادوية_طب_الاسنان_الجزائر.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read raw sheet as 2D array
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`Loaded Excel file. Total raw rows: ${rows.length}`);
    
    let currentCategory = 'عام';
    let insertedCount = 0;
    
    // Start from row 3 (index 3 is the first data/category row, as row 2 is the headers)
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      // If it's a category header (usually has text in first column and rest is empty)
      const firstCell = row[0];
      const hasRest = row.slice(1).some(cell => cell !== undefined && cell !== null && cell !== '');
      
      if (firstCell && !hasRest) {
        currentCategory = firstCell.toString().trim();
        console.log(`Switching to category: ${currentCategory}`);
        continue;
      }
      
      // If we have a medicine name at index 1
      const medicineDci = row[1];
      if (medicineDci) {
        const form = row[2] ? row[2].toString().trim() : '';
        const medicineName = form ? `${medicineDci.toString().trim()} (${form})` : medicineDci.toString().trim();
        
        const dose = row[3] ? row[3].toString().trim() : '';
        const duration = row[4] ? row[4].toString().trim() : '';
        
        let disease = row[5] ? row[5].toString().trim() : '';
        if (!disease) {
          disease = currentCategory;
        }
        
        const notesRaw = row[6] ? row[6].toString().trim() : '';
        const status = row[7] ? row[7].toString().trim() : '';
        let notes = notesRaw;
        if (status) {
          notes = notes ? `${notes} | الوضع: ${status}` : `الوضع: ${status}`;
        }
        
        // Insert into database
        await pool.query(
          `INSERT INTO prescription_templates (disease, medicine, dose, duration, age, notes) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [disease, medicineName, dose, duration, 'الكل', notes]
        );
        
        insertedCount++;
      }
    }
    
    console.log(`Successfully imported ${insertedCount} medications into the database!`);
  } catch (err) {
    console.error('Error during import:', err);
  } finally {
    await pool.end();
  }
}

main();
