import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually for script execution
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testConnection() {
    console.log('🧪 Testing Gemini AI Connection (TypeScript)...');

    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        console.error('❌ Error: GEMINI_API_KEY is not defined.');
        console.log('👉 Please create a .env.local file and add your GEMINI_API_KEY.');
        process.exit(1);
    }

    console.log(`🔑 API Key found (ending with ...${apiKey.slice(-4)}).`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        console.log('📡 Sending a test prompt to the Gemini API...');

        const result = await model.generateContent('Hello! Respond with "Yes, I am working!"');
        const response = result.response;
        const text = response.text();

        if (text.includes('Yes, I am working!')) {
            console.log('✅ Success! AI model responded correctly.');
            console.log('----------------------------------------');
            console.log(`AI Response: "${text}"`);
            console.log('----------------------------------------');
        } else {
            throw new Error(`Unexpected response: ${text}`);
        }

    } catch (error: any) {
        console.error('❌ API Call Failed:');
        if (error.message) {
            console.error(`   Error Message: ${error.message}`);
        }
        if (error.stack) {
            console.error(`   Stack Trace: ${error.stack}`);
        }
        console.log('\nTroubleshooting Tips:');
        console.log('1. Double-check your GEMINI_API_KEY in .env.local.');
        console.log('2. Ensure you have internet connectivity.');
        console.log('3. Check the Google AI status page for API outages.');
        process.exit(1);
    }
}

testConnection();
