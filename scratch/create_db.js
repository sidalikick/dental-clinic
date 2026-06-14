import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const createDB = async () => {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // Connect to default DB
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    console.log('Connected to postgres database. Creating 4bb...');
    await client.query('CREATE DATABASE "4bb"');
    console.log('Database 4bb created successfully!');
    await client.end();
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database 4bb already exists.');
    } else {
      console.error('Error creating database:', err);
    }
    await client.end();
  }
};

createDB();
