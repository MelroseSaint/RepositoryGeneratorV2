import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

async function test() {
    console.log('Starting test...');
    const envLocalPath = path.resolve(process.cwd(), '.env.local');

    if (fs.existsSync(envLocalPath)) {
        console.log('Loading .env.local');
        const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('NO KEY FOUND');
        process.exit(1);
    }

    const modelName = 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
    console.log('Testing Model:', modelName);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Success! Response:', data.candidates[0].content.parts[0].text);
        } else {
            const text = await response.text();
            console.log('Error Body:', text);
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

test();
