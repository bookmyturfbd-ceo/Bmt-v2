import dotenv from 'dotenv';
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
console.log('DIRECT_URL:', process.env.DIRECT_URL?.replace(/:[^:@]+@/, ':***@'));
