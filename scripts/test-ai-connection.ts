import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local if it exists
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function testConnection() {
    console.log('🧪 Testing Gemini AI Connection...');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY is not defined in environment variables.');
        console.log('👉 Please create a .env.local file with GEMINI_API_KEY=your_key_here');
        process.exit(1);
    }

    console.log('🔑 API Key found (length: ' + apiKey.length + ')');

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-flash-latest as verified
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log('📡 Sending test prompt to Gemini (model: gemini-flash-latest)...');
        const result = await model.generateContent('Hello! Are you working? Reply with "Yes, I am working!"');
        const response = result.response;
        const text = response.text();

        console.log('✅ Success! Response from AI:');
        console.log('--------------------------------------------------');
        console.log(text);
        console.log('--------------------------------------------------');

    } catch (error: any) {
        console.error('❌ API Call Failed:');
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
