import Groq from 'groq-sdk'
import dotenv from 'dotenv'
dotenv.config()

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function getChatCompletion(question) {
  return await groq.chat.completions.create({
    model: process.env.LLM_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an event assistant. Respond in a concise and friendly format with emoji bullet points where possible.'
      },
      {
        role: 'user',
        content: question
      }
    ]
  })
}

export {
  getChatCompletion
}