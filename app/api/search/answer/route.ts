
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Initialize the provider with the API key
const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
    const { prompt, results } = await req.json();

    const context = results.map((r: any) =>
        `- ${r.full_name} (${r.position} at ${r.company}) [Connection: ${r.owner_name}]`
    ).join('\n');

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `You are a helpful network assistant. 
    Summarize the following search results for the user's query.
    Be concise (2-3 sentences max). 
    Highlight the most relevant person and why.
    Do not hallucinate. Only use the provided context.
    
    Context:
    ${context}`,
        prompt: `User Query: ${prompt}`,
    });

    return result.toTextStreamResponse({
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
}
