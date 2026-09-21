import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

console.log("API KEY LOADED:", !!process.env.OPENROUTER_API_KEY);

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function testAI() {
  try {
    const response = await client.chat.completions.create({
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: "What color is an apple?",
        },
      ],
    });

    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error("AI ERROR:", error.message);
  }
}

testAI();