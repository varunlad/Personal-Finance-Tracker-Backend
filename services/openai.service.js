const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function categorizeExpense(text) {
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo", // cheapest & best
    messages: [
      {
        role: "system",
        content:
          "You are a finance assistant that categorizes expenses.",
      },
      {
        role: "user",
        content: `
Categorize this expense into ONE category only:
Food, Rent, Travel, Shopping, Entertainment, Utilities, Investment, Other.

Expense: "${text}"

Reply with only the category name.
`,
      },
    ],
    temperature: 0,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { categorizeExpense };
