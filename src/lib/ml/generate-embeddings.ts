import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", // or "text-embedding-3-large"
    input: text,
    encoding_format: "float", // Use "float" for pgvector
  });

  return response.data[0].embedding;
}
