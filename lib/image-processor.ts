import { GoogleGenerativeAI } from '@google/generative-ai';

export class ImageProcessor {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async extractImageContent(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Use Gemini 2.0 Flash which supports vision
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Convert buffer to base64
      const base64Image = buffer.toString('base64');
      
      // Create image part for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      };
      
      // Extract searchable content ONLY (no LLM descriptions!)
      const prompt = `Extract ALL text, numbers, and data from this image. Return ONLY the actual content visible in the image.

Rules:
- DO NOT add descriptions like "This image shows..." or "The document contains..."
- DO NOT add interpretations or summaries
- ONLY transcribe the exact text/data you see
- If there's a title, include it
- If there are bullet points, list them
- If there are tables/charts, extract the data
- If it's purely visual with no text, describe ONLY the key elements (e.g., "Logo: Company X", "Product: Blue Widget")

Return raw content only.`;
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      return text || 'Unable to extract content from image';
      
    } catch (error) {
      console.error('Image processing error:', error);
      // Return a basic placeholder instead of throwing
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Falling back to placeholder for image due to: ${errorMessage}`);
      return `[Image file: ${mimeType}] - Content extraction temporarily unavailable`;
    }
  }
}
