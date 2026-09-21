
import { GoogleGenAI } from "@google/genai";

// Helper for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>, 
  maxRetries: number = 10, // Increased retries
  baseDelay: number = 2000 // Reduced base delay slightly for faster initial retries
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Get error details safely
      const message = (error.message || error.toString() || '').toLowerCase();
      const status = (error.status || '').toString().toLowerCase();
      const code = error.code || 0;

      // Broad check for overloading, capacity issues, AND Internal Server Errors (500)
      // The API sometimes returns 500 for transient issues with video generation
      const isTransientError = 
        message.includes('overloaded') || 
        message.includes('429') || 
        message.includes('503') || 
        message.includes('quota') || 
        message.includes('capacity') ||
        message.includes('internal server error') ||
        status.includes('internal server error') ||
        code === 500;
      
      if (isTransientError && attempt < maxRetries - 1) {
        // Exponential backoff with a cap
        const delay = Math.min(baseDelay * Math.pow(1.5, attempt), 20000); 
        console.warn(`API Error (${code || status || 'Unknown'}). Retrying in ${Math.round(delay/1000)}s... (Attempt ${attempt + 1}/${maxRetries})`);
        await wait(delay);
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
};

export const generateBazarVideo = async (prompt: string): Promise<string | null> => {
  // Always create a new instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Retry the initial request if the model is overloaded or errors out
    let operation = await retryWithBackoff(async () => {
      return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });
    }, 5, 3000); 

    console.log('Video generation started...');

    // Poll for completion
    while (!operation.done) {
      // Wait 10 seconds before checking again
      await wait(10000);
      
      // Retry the polling request as well if it fails due to network/server transient issues
      operation = await retryWithBackoff(async () => {
        return await ai.operations.getVideosOperation({ operation: operation });
      }, 5, 5000);
      
      console.log('Polling video generation status...');
    }

    // Check for explicit API errors in the operation object
    if (operation.error) {
      throw new Error(String(operation.error.message || "Unknown operation error"));
    }

    // Attempt to retrieve the URI from response or result
    // We check multiple locations as the LRO structure can vary slightly in different contexts
    let videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri && (operation as any).result) {
       videoUri = (operation as any).result?.generatedVideos?.[0]?.video?.uri;
    }

    if (!videoUri) {
      console.error("Operation completed but no URI found. Full Operation Object:", JSON.stringify(operation, null, 2));
      throw new Error("No video URI returned from the operation. The content might have been filtered or the service is temporarily unavailable.");
    }

    // Append API key for access
    return `${videoUri}&key=${process.env.API_KEY}`;

  } catch (error: any) {
    console.error("Video generation failed:", error);
    
    // Normalize error message from Google API response structure
    if (error.error && error.error.message) {
      throw new Error(error.error.message);
    }
    // Handle the specific JSON error object structure if it comes as a string or object
    if (error.status === 'Internal Server Error' || error.code === 500) {
      throw new Error("O servidor de vídeo está temporariamente indisponível (Erro 500). Por favor, tente novamente em alguns instantes.");
    }
    
    throw error;
  }
};
