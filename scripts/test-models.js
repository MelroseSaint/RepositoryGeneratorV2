import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testModels() {
    console.log('🔍 Testing different Gemini models...\n');

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'INSERT_YOUR_API_KEY_HERE') {
        console.error('❌ Error: GEMINI_API_KEY is not defined or is using the placeholder.');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.0-pro'
    ];

    for (const modelName of modelsToTry) {
        try {
            console.log(`\n📡 Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Say "Hello"');
            const response = result.response;
            const text = response.text();
            console.log(`✅ ${modelName} works! Response: ${text.substring(0, 50)}...`);
            break; // If one works, we're good
        } catch (error) {
            console.log(`❌ ${modelName} failed: ${error.message}`);
        }
    }
}

testModels();
