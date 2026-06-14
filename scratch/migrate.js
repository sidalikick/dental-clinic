import pool from '../server/db.js';
import fs from 'fs';
import path from 'path';

const runSchema = async () => {
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema.sql...');
    await pool.query(schema);
    console.log('Schema executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error executing schema:', err);
    process.exit(1);
  }
};

runSchema();
