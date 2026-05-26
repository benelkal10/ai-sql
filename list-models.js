require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.includes('your_gemini')) {
        console.error('API Key not set correctly.');
        return;
    }

    try {
        // We use a manual fetch to check the models endpoint directly
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error.message);
            return;
        }

        console.log('Available Models:');
        data.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName})`);
        });
    } catch (err) {
        console.error('Network or Parse Error:', err.message);
    }
}

listModels();
