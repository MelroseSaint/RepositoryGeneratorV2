import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually since we are in a script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testConnection() {
    console.log('🧪 Testing Gemini AI Connection...');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'INSERT_YOUR_API_KEY_HERE') {
        console.error('❌ Error: GEMINI_API_KEY is not defined or is using the placeholder.');
        console.log('👉 Please edit .env.local and add your actual GEMINI_API_KEY');
        process.exit(1);
    }

    console.log('🔑 API Key found (length: ' + apiKey.length + ')');

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('📡 Sending test prompt to Gemini...');
        const result = await model.generateContent('Hello! Are you working? Reply with "Yes, I am working!"');
        const response = result.response;
        const text = response.text();

        console.log('✅ Success! Response from AI:');
        console.log('--------------------------------------------------');
        console.log(text);
        console.log('--------------------------------------------------');

    } catch (error) {
        console.error('❌ API Call Failed:');
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
