import { openai } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText } from 'ai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    console.log('Received messages:', messages);

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: convertToCoreMessages(messages),
      maxTokens: 500,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('エラーが発生しました', { status: 500 });
  }
}
