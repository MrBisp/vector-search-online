import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_TOKEN,
});

export default async function handler(req, res) {
    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: req.body.text,
        encoding_format: "float",
      });
      
      const embeddingData = embedding.data;


    res.status(200).json({ message: embeddingData })
}; 