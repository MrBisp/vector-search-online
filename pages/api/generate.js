import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
});

export default async function handler(req, res) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: req.body.text
            }
        ]
      });

    const responseData = response.data;
    res.status(200).json({ message: response })      
}; 