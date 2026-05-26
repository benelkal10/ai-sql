require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
        console.error('ERROR: GEMINI_API_KEY is not set correctly in .env file!');
        return;
    }

    const genAI = new GoogleGenerativeAI(key);
    const modelsToTest = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro'];

    console.log('Testing Gemini models...');

    for (const modelName of modelsToTest) {
        try {
            console.log(`Checking model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'connection successful'");
            const response = await result.response;
            console.log(`✅ Success with ${modelName}: ${response.text()}`);
            return modelName; // Stop at the first working model
        } catch (err) {
            console.error(`❌ Failed with ${modelName}:`, err.message);
        }
    }
    console.error('FATAL: No models worked. Check your API key and region restrictions.');
}

testModels();
