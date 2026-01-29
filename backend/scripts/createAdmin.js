/**
 * One-time script to create the first admin user
 * Usage: node scripts/createAdmin.js
 *
 * Delete this script after use or add to .gitignore
 */

const mongoose = require('mongoose');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get admin details
    const name = await question('Admin name: ');
    const email = await question('Admin email: ');
    const password = await question('Admin password (min 6 chars): ');

    if (password.length < 6) {
      console.error('Password must be at least 6 characters');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('Email already registered');
      process.exit(1);
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
    });

    console.log('\nAdmin created successfully!');
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    console.log('\nYou can now login at /api/admin/auth/login');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit();
  }
};

createAdmin();
