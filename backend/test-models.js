const { GoogleGenAI, Type } = require('@google/genai');
async function run() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
    const ai = new GoogleGenAI({ apiKey });
    const tools = [{ functionDeclarations: [{ name: 'get_doctors', description: 'test', parameters: { type: Type.OBJECT, properties: {} } }] }];
    const chat = ai.chats.create({
      model: 'gemini-3.1-flash-lite',
      config: { tools }
    });
    const response = await chat.sendMessage({ message: 'Quiero ver a los doctores disponibles' });
    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log('Function call returned:', response.functionCalls[0].name);
    } else {
      console.log('Text returned:', response.text);
    }
  } catch (e) {
    console.error(e.message);
  }
}
run();
