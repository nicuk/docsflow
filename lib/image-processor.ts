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
      
      // Generate comprehensive description
      const prompt = `Analyze this image and provide:
1. A detailed description of what you see
2. Any text visible in the image (OCR)
3. Key objects, people, or elements
4. Context and purpose of the image
5. Any data, charts, or diagrams present

Be thorough and specific.`;
      
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
