/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        let userMessage = `Permintaan Anda tidak dapat diproses karena diblokir oleh kebijakan keamanan (${blockReason}).`;
        if (blockReasonMessage) {
            userMessage += ` Detail: ${blockReasonMessage}`;
        }
        userMessage += " Coba ubah deskripsi Anda agar lebih umum.";
        console.error(userMessage, { response });
        throw new Error(userMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const userMessage = `Pembuatan gambar untuk ${context} gagal karena kebijakan keamanan (${finishReason}). Coba ulangi perintah Anda agar lebih lugas atau kurang spesifik tentang perubahan pada orang.`;
        console.error(userMessage, { response });
        throw new Error(userMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `Model AI tidak mengembalikan gambar untuk ${context}. ` + 
        (textFeedback 
            ? `Model merespons dengan teks: "${textFeedback}"`
            : "Ini bisa terjadi karena filter keamanan atau jika permintaan terlalu rumit. Coba ulangi perintah Anda agar lebih lugas.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and specific points.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspots An array of {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspots: { x: number, y: number }[]
): Promise<string> => {
    console.log('Starting generative edit at:', hotspots);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const hotspotString = hotspots.map(p => `(x: ${p.x}, y: ${p.y})`).join(', ');

    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request. The edit should intelligently incorporate all specified locations.
User Request: "${userPrompt}"
Edit Locations: Focus on the areas around these pixel coordinates: ${hotspotString}. For edits affecting a single object (e.g., changing shirt color), treat these points as markers on that object. For edits adding elements, consider these points as placement guides.

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.
- CRITICAL: Preserve the subject's identity. Do not alter core facial features or change their fundamental ethnicity. Edits should enhance, not replace. Even if a point is on a person's face for an unrelated edit (e.g., changing hair color), you must ONLY perform the requested edit and leave the face unchanged. The subject's identity and facial features must be preserved perfectly.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request.
Filter Request: "${filterPrompt}"

Filter Guidelines:
- Do not change the composition or content, only apply the style.
- The filter must not alter a person's fundamental ethnicity or core identity.

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.
- Preserve the subject's identity. Do not change their fundamental ethnicity. Global adjustments like lighting or color temperature should be applied naturally without altering a person's core characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};


/**
 * Generates a background image from a text prompt.
 * @param prompt The text prompt describing the desired background.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns A promise that resolves to the data URL of the generated background.
 */
export const generateBackgroundImage = async (
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
): Promise<string> => {
    console.log(`Generating background with prompt: ${prompt} and aspect ratio: ${aspectRatio}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Generate a high-quality, photorealistic background image. The scene should be: ${prompt}. The image should not contain any primary subjects, people, or animals; it should be a background scene.`,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            console.log('Successfully generated background image.');
            return `data:image/png;base64,${base64ImageBytes}`;
        } else {
            // FIX: Property 'promptFeedback' does not exist on type 'GenerateImagesResponse'.
            // Removed incorrect access to `promptFeedback`. If no images are returned,
            // it's often due to safety policies. A generic error is thrown as specific
            // block reasons are not available in this response.
            throw new Error('Pembuatan latar belakang gagal: Model AI tidak mengembalikan gambar.');
        }
    } catch (err) {
        console.error('Error calling generateImages API:', err);
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal saat pembuatan latar belakang.';
        throw new Error(errorMessage);
    }
};

/**
 * Composites a subject from one image onto a new background image.
 * @param subjectImage The image containing the subject to be extracted.
 * @param backgroundImage The new background image.
 * @returns A promise that resolves to the data URL of the final composited image.
 */
export const applyBackgroundToImage = async (
    subjectImage: File,
    backgroundImage: File,
): Promise<string> => {
    console.log(`Applying new background to image.`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const subjectImagePart = await fileToPart(subjectImage);
    const backgroundImagePart = await fileToPart(backgroundImage);
    
    const prompt = `You are an expert photo editor AI. Your task is to perfectly composite the main subject from the first image onto the second image (the new background).

Instructions:
1. Identify and isolate the main subject(s) in the first image.
2. Place the isolated subject(s) onto the second image, which serves as the new background.
3. The final image dimensions must match the background image.
4. Seamlessly blend the subject with the new background. Adjust lighting, shadows, and color grading on the subject to match the environment of the background image for a photorealistic result.
5. Do not include any part of the original background from the first image.

Output: Return ONLY the final composited image. Do not return text.`;

    const textPart = { text: prompt };

    console.log('Sending subject image, background image, and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [subjectImagePart, backgroundImagePart, textPart] },
    });
    console.log('Received response from model for background replacement.', response);
    
    return handleApiResponse(response, 'background replacement');
};

/**
 * Generates a random creative prompt suggestion from the AI.
 * @param context The context for the suggestion (e.g., 'retouch', 'filter').
 * @returns A promise that resolves to a string containing the editing idea.
 */
export const generateRandomPrompt = async (
    context: 'retouch' | 'filter' | 'adjustment' | 'background'
): Promise<string> => {
    console.log(`Generating random prompt for context: ${context}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const instruction = `You are a creative assistant for a photo editing app. Your task is to provide a single, short, creative photo editing idea for a user.
- The context for the idea is: "${context}".
- The response must be a concise, actionable phrase that can be used as a prompt for another AI.
- The response MUST be under 10 words.
- Do NOT use quotation marks or any introductory text like "Here's an idea:". Just return the prompt itself.
- Examples:
  - For 'filter': "a dreamy, ethereal glow" or "80s synthwave neon"
  - For 'retouch': "add magical sparkles to her eyes" or "make the water look like glass"
  - For 'adjustment': "dramatic, cinematic lighting" or "a warm, golden hour feel"
  - For 'background': "a futuristic city skyline at night" or "a tranquil, misty forest"

Give me one random idea for the "${context}" context.`;
    
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: instruction,
            config: {
                thinkingConfig: { thinkingBudget: 0 }
            }
        });

        const text = response.text.trim().replace(/["']/g, "");

        if (!text) {
            throw new Error('AI tidak mengembalikan saran.');
        }

        console.log(`Generated prompt suggestion: ${text}`);
        return text;

    } catch (err) {
        console.error('Error generating random prompt:', err);
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
        throw new Error(`Gagal mendapatkan ide dari AI. ${errorMessage}`);
    }
};