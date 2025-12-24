
import { 
  GoogleGenAI, 
  GenerateContentResponse, 
  Content, 
  Part, 
  Modality, 
  HarmCategory, 
  HarmBlockThreshold, 
  Type, 
  FunctionDeclaration
} from "@google/genai";
import { Message, Role, Attachment, Source, ChatConfig, PersonalizationConfig, StudentConfig, ExamConfig, ExamQuestion, Persona, Flashcard, StudyPlan, MediaAction } from "../types";
import { memoryService } from "./memoryService";

// Helper to init AI - STRICTLY use process.env.API_KEY
export const getAI = () => new GoogleGenAI({ apiKey: process.env.APIKEY });

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const HELPLINE_MESSAGE = `I cannot fulfill this request. I care about your well-being. If you are going through a difficult time or are in immediate danger, please reach out for support:
- **Suicide & Crisis Lifeline**: 988 (USA)
- **Emergency**: Call 911 or your local emergency number
- **International Support**: Visit findahelpline.com
You are not alone. Please seek help from a professional.`;

// Helper to format history
const formatHistory = (messages: Message[]): Content[] => {
  return messages.map((msg) => {
    const parts: Part[] = [];
    if (msg.role === Role.USER && msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att) => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.base64,
          },
        });
      });
    }
    if (msg.text) parts.push({ text: msg.text });
    return { role: msg.role, parts: parts };
  }).filter(content => content.parts.length > 0); 
};

export const MEDIA_PLAYER_TOOL: FunctionDeclaration = {
  name: "play_media",
  description: "Plays music, videos, or podcasts. Use this when the user asks to listen to a song, watch a video, or play media.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      media_type: { type: Type.STRING, enum: ["song", "video", "playlist", "podcast"] },
      title: { type: Type.STRING, description: "Title of the song or video" },
      artist: { type: Type.STRING, description: "Artist or Channel name (optional)" },
      platform: { type: Type.STRING, enum: ["youtube", "spotify"], description: "Platform to play on. Default to youtube." },
      query: { type: Type.STRING, description: "Search query for the media (e.g. 'Shape of You Ed Sheeran')" }
    },
    required: ["media_type", "title", "platform", "query"]
  }
};

export const SAVE_MEMORY_TOOL: FunctionDeclaration = {
  name: "save_memory",
  description: "Saves a new fact, preference, or piece of information about the user to long-term memory. Use this when the user tells you something important about themselves, their projects, or their life.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The fact or information to remember (e.g. 'User likes spicy food', 'Working on Zara AI project')." },
      category: { type: Type.STRING, enum: ["core", "preference", "project", "emotional", "fact"], description: "The category of the memory." },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords associated with this memory." }
    },
    required: ["content", "category"]
  }
};

export const ZARA_CORE_IDENTITY = `
**IDENTITY: Zara AI — Your Adaptive & Intelligent Companion**

**CREATOR INFORMATION (STRICT & MANDATORY):**
If asked "Who created you?", "Who made you?", "Who is your developer?" or about your origins, reply with pride but casually:
- **Developer**: **Mohammed Majeed**
- **Context**: He's a brilliant developer who built me with passion. He wanted me to be a smart, unique, and super friendly AI for everyone.

====================================================================
## 1. ADAPTIVE PERSONALITY & TONE (CRITICAL)
====================================================================
You are a social chameleon. You must INSTANTLY detect the user's tone and mirror it.

- **MODE A: PROFESSIONAL / FORMAL**
  - **Trigger**: User speaks formally, asks technical questions, uses polite English, or is business-oriented.
  - **Response**: Be precise, expert, efficient, and polite. Use clear structure. No slang.
  - **Example**: "Certainly. Here is the analysis of the code structure..."

- **MODE B: FRIENDLY / CASUAL (The "Nanba" Mode)**
  - **Trigger**: User uses slang, speaks casually, uses Tamil/Tanglish, calls you "Bro", "Machi", "Nanba", or is playful.
  - **Response**: Be warm, chatty, enthusiastic, and fun. Use emojis.
  - **Example**: "Sollu nanba! All good, nee eppadi irukka?"

- **MODE C: EMPATHETIC**
  - **Trigger**: User is sad, frustrated, or sharing personal feelings.
  - **Response**: Be supportive, gentle, and a good listener.

====================================================================
## 2. LANGUAGE & LOCALIZATION (AUTO-DETECT)
====================================================================
- **MULTI-LINGUAL SUPPORT**: You support ALL languages.
- **RULE**: Reply in the **EXACT language and dialect** the user is speaking.
  - **Tamil**: Speak pure or colloquial Tamil.
  - **Tanglish**: Mix English and Tamil naturally (e.g. "Romba super-a irukku").
  - **English**: Speak standard English.
  - **Other**: If they speak French, Hindi, etc., switch immediately.

====================================================================
## 3. MEDIA HANDLING (STRICT)
====================================================================
- If the user wants to **LISTEN** to music/audio: Call 'play_media' with media_type='song'. This will play the audio directly.
- If the user wants to **WATCH** a video: Call 'play_media' with media_type='video'. This will open a new tab for them.
- Be proactive. If they say "Play that trend song", do it immediately.

====================================================================
## 4. VISUALIZATION & DIAGRAMS (STRICT MERMAID RULES)
====================================================================
If the user asks for a diagram, flowchart, visualization, or visual explanation:
- **ACTION**: Generate a **MERMAID.JS** code block.
- **SYNTAX RULES (CRITICAL - DO NOT FAIL THESE)**: 
  1. **WRAP ALL LABELS**: Every single node label MUST be wrapped in double quotes. 
     - CORRECT: \`A["My Label"]\`
     - INCORRECT: \`A[My Label]\`
  2. **CLOSE SHAPES**: Ensure every opening brace \`{\`, \`[\`, \`(\` has a matching closing brace.
     - CORRECT: \`B{"Is it true?"}\`
     - INCORRECT: \`B{Is it true?\`
  3. **EDGE LABELS**: Use the pipe syntax for edge labels.
     - CORRECT: \`A -->|Yes| B\` or \`A -- "Label" --> B\`
     - INCORRECT: \`A -- Label --> B\`
  4. **NO SPECIAL CHARS**: Do not use parentheses, brackets, or braces INSIDE labels unless the entire label is quoted.
     - CORRECT: \`C["Init (List/Range)"]\`
     - INCORRECT: \`C[Init (List/Range)]\`

====================================================================
## 5. RESPONSE STYLE
====================================================================
- Be concise in audio mode (short, punchy sentences).
- Use emojis in text mode to show emotion.
- Always sound encouraging and positive.
`;

export const ZARA_BUILDER_IDENTITY = `
You are **Zara Architect**, a World-Class Senior Full-Stack Engineer.

**MISSION**: Build high-quality, bug-free, beautiful React applications that run directly in the browser using Babel Standalone.

**RUNTIME ENVIRONMENT (STRICT COMPLIANCE REQUIRED)**:
Your code runs in a specific browser sandbox. You MUST follow these rules to avoid "React is undefined" or "Dispatcher" errors.

1.  **NO IMPORTS / NO EXPORTS**:
    *   ❌ \`import React from 'react';\`
    *   ❌ \`import { useState } from 'react';\`
    *   ❌ \`export default App;\`
    *   ❌ \`import { Camera } from 'lucide-react';\`

2.  **USE GLOBAL VARIABLES**:
    *   React is available as \`React\`.
    *   ReactDOM is available as \`ReactDOM\`.
    *   Lucide Icons are available as \`lucide\`.
    *   Tailwind CSS is pre-loaded.

3.  **DESTRUCTURING RULES**:
    *   At the top of your script, destructure everything you need.
    *   \`const { useState, useEffect, useRef } = React;\`
    *   \`const { createRoot } = ReactDOM;\`
    *   \`const { Camera, Home, User, Settings } = lucide;\` (Assuming lucide contains components)

4.  **ENTRY POINT**:
    *   Define your root component (e.g., \`App\`).
    *   Mount it using \`createRoot\`.
    *   \`const root = createRoot(document.getElementById('root'));\`
    *   \`root.render(<App />);\`

5.  **STYLING**:
    *   Use **Tailwind CSS** classes (\`className\`).
    *   Do not use external CSS files unless generated in the \`styles.css\` block.

**INTERACTION PROTOCOL**:
1.  **ANALYZE FIRST**: If the user says "Hi" or gives a prompt, DO NOT generate code. Ask clarifying questions.
2.  **GENERATE ONLY ON REQUEST**: Only output XML code blocks when the user explicitly asks to build or modify an app.
`;

export const buildSystemInstruction = (personalization?: PersonalizationConfig, activePersona?: Persona): string => {
  const now = new Date();
  const timeContext = `Current System Time: ${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}`;
  
  const memoryContext = memoryService.getContextString();
  const memoryBlock = memoryContext ? `\n\n**USER MEMORY CONTEXT (FACTS YOU KNOW):**\n${memoryContext}\n` : "";

  let instruction = "";

  if (activePersona) {
    instruction = `
    **ROLEPLAY INSTRUCTION:**
    You are playing the role of: ${activePersona.name}.
    ${activePersona.systemPrompt}
    
    **BASE CAPABILITIES:**
    - Detect language & Tanglish.
    - Adapt tone to emotion.
    - Use 'play_media' tool for playback requests.
    - Use 'save_memory' to remember key details.
    ${timeContext}
    ${memoryBlock}
    `;
  } else {
    instruction = `${ZARA_CORE_IDENTITY}\n${timeContext}\n${memoryBlock}`;
  }

  if (personalization) {
    instruction += `\n\n**USER PROFILE:**\n`;
    if (personalization.nickname) instruction += `- Name: ${personalization.nickname}\n`;
    if (personalization.occupation) instruction += `- Work: ${personalization.occupation}\n`;
    if (personalization.aboutYou) instruction += `- Context: ${personalization.aboutYou}\n`;
    if (personalization.customInstructions) instruction += `\n**CUSTOM PREFERENCES:**\n${personalization.customInstructions}\n`;
  }

  return instruction;
};

export const analyzeGithubRepo = async (url: string, mode: 'overview' | 'implementation'): Promise<string> => {
  const ai = getAI();
  const prompt = mode === 'overview'
    ? `Analyze the GitHub repository at ${url}.
       Provide a comprehensive professional overview including:
       1. **PURPOSE**: Explain the project's core mission and problem it solves.
       2. **TECH STACK**: Categorize and list specific technologies:
          - **Frontend**: Frameworks, UI kits, state management.
          - **Backend**: Runtimes, frameworks, API architecture.
          - **Database**: Engines, ORMs, caching layers.
          - **DevOps**: CI/CD, containerization, cloud infrastructure.
       3. **KEY FEATURES**: List the top 5 standout capabilities.
       4. **ARCHITECTURE**: High-level design description (MVC, Microservices, Monolith, etc.).
       5. **VISUAL DIRECTORY STRUCTURE**: Provide a high-quality ASCII tree (\`src/\`, \`components/\`, etc.) using icons like 📂 and 📄. Highlight crucial logic entry points.
       6. **SYSTEM ARCHITECTURE DIAGRAM**: Generate a detailed Mermaid.js flowchart (\`\`\`mermaid flowchart TD ... \`\`\`) illustrating the main system components and their interactions.
          **STRICT MERMAID SYNTAX RULES**:
          - Wrap EVERY node label in double quotes: \`A["Label Name"]\`.
          - Ensure all shapes like \`{}\` or \`[]\` are properly closed with labels inside quotes.
          - Use correct edge syntax: \`A -->|Link Text| B\`.
          - Do not use special characters in node IDs (use simple letters A, B, C).
       Format the response in clean Markdown.`
    : `Based on the GitHub repository at ${url}, provide a detailed Full-Stack Implementation Guide.
       1. **DIRECTORY MAPPING**: Map specific features to file paths.
       2. **CORE LOGIC**: Extract and explain the most critical business logic snippets.
       3. **DATA MODEL**: Provide code examples of schemas or data structures.
       4. **IMPLEMENTATION FLOW**: Explain the end-to-end flow of data through the system.
       Use Mermaid charts if they help explain logic flows, following strict quoting rules for labels.`;

  /* Fix: gemini-3-pro-preview is a complex text task model recommended by guidelines */
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', 
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are Zara Architect, an elite Senior Software Engineer. You excel at reverse-engineering repositories and presenting findings with extreme visual clarity and technical precision. You never output invalid Mermaid syntax."
    }
  });
  /* Fix: Access .text property directly instead of calling it as a function */
  return response.text || "Analysis failed.";
};

export const sendMessageToGeminiStream = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  config: ChatConfig,
  personalization: PersonalizationConfig,
  onUpdate: (text: string) => void,
  activePersona?: Persona
): Promise<{ text: string; sources: Source[] }> => {
  
  const ai = getAI();
  const formattedHistory = formatHistory(history);

  const currentParts: Part[] = [];
  attachments.forEach(att => {
    currentParts.push({
      inlineData: { mimeType: att.mimeType, data: att.base64 }
    });
  });
  
  if (newMessage || currentParts.length === 0) {
      currentParts.push({ text: newMessage || " " });
  }

  const contents: Content[] = [...formattedHistory, { role: Role.USER, parts: currentParts }];

  /* Update default model to gemini-3-flash-preview as recommended for basic text tasks */
  const model = config.model || 'gemini-3-flash-preview';
  
  let requestConfig: any = {
    systemInstruction: buildSystemInstruction(personalization, activePersona),
    safetySettings: SAFETY_SETTINGS,
  };

  if (config.useThinking) {
    const budget = model.includes('pro') ? 32768 : 8192; 
    requestConfig['thinkingConfig'] = { thinkingBudget: budget };
  }

  if (config.useGrounding) {
    requestConfig['tools'] = [{ googleSearch: {} }];
  }
  
  if (!requestConfig['tools']) requestConfig['tools'] = [];
  requestConfig['tools'].push({ functionDeclarations: [MEDIA_PLAYER_TOOL, SAVE_MEMORY_TOOL] });

  try {
    const stream = await ai.models.generateContentStream({
      model: model,
      contents: contents,
      config: requestConfig
    });

    let fullText = '';
    const sources: Source[] = [];

    for await (const chunk of stream) {
      /* Fix: Access .text property directly instead of calling it as a function */
      if (chunk.text) {
        fullText += chunk.text;
        onUpdate(fullText);
      }
      
      const functionCalls = chunk.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === 'save_memory') {
             const args: any = call.args;
             memoryService.addMemory(args.content, args.category, args.tags);
          }
        }
      }

      const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((c: any) => {
          if (c.web) {
            sources.push({ title: c.web.title, uri: c.web.uri });
          }
        });
      }
    }

    if (!fullText) return { text: HELPLINE_MESSAGE, sources: [] };
    return { text: fullText, sources };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    onUpdate("Error: " + (error.message || "Unknown error"));
    throw error;
  }
};

export const sendAppBuilderStream = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  onUpdate: (text: string) => void
): Promise<{ text: string }> => {
  
  const ai = getAI();
  const formattedHistory = formatHistory(history);

  const currentParts: Part[] = [];
  attachments.forEach(att => {
    currentParts.push({
      inlineData: { mimeType: att.mimeType, data: att.base64 }
    });
  });
  
  if (newMessage || currentParts.length === 0) {
      currentParts.push({ text: newMessage || " " });
  }

  const contents: Content[] = [...formattedHistory, { role: Role.USER, parts: currentParts }];

  try {
    const stream = await ai.models.generateContentStream({
      /* Update model to gemini-3-flash-preview as per recommendations */
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: ZARA_BUILDER_IDENTITY,
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 8192 }
      }
    });

    let fullText = '';
    for await (const chunk of stream) {
      /* Fix: Access .text property directly */
      if (chunk.text) {
        fullText += chunk.text;
        onUpdate(fullText);
      }
    }

    if (!fullText) return { text: "Failed to generate app blueprint." };
    return { text: fullText };

  } catch (error: any) {
    console.error("App Builder Error:", error);
    onUpdate("Error: " + (error.message || "Unknown error"));
    throw error;
  }
};

export const generateStudentContent = async (config: StudentConfig): Promise<string> => {
  const ai = getAI();
  let prompt = "";
  let context = "";
  if (config.studyMaterial) {
    context = `\n\n**SOURCE MATERIAL:**\n"${config.studyMaterial}"\n\n**INSTRUCTION:**\nUse the above source material as the primary truth.`;
  }
  switch(config.mode) {
    case 'summary':
      prompt = `Summarize the topic "${config.topic}" into concise, easy-to-read bullet points. Highlight key concepts, formulas, and important dates. ${context}`;
      break;
    case 'mcq':
      prompt = `Generate ${config.mcqConfig?.count || 5} Multiple Choice Questions (MCQs) on "${config.topic}". Difficulty: ${config.mcqConfig?.difficulty}. Format as Markdown list with answer key at the bottom. ${context}`;
      break;
    case '5mark':
      prompt = `Generate 5 short-answer questions (5 marks each) for "${config.topic}" with model answers. ${context}`;
      break;
    case '20mark':
      prompt = `Generate a detailed essay question (20 marks) for "${config.topic}" and provide a structured essay outline as the answer. ${context}`;
      break;
    case 'simple':
      prompt = `Explain the concept "${config.topic}" like I am 10 years old. Use analogies and simple language. ${context}`;
      break;
  }

  const response = await ai.models.generateContent({
    /* Update model to recommended gemini-3-flash-preview */
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { safetySettings: SAFETY_SETTINGS }
  });
  /* Fix: Use .text property instead of method */
  return response.text || "No content generated.";
};

export const generateCodeAssist = async (code: string, task: string, language: string): Promise<string> => {
  const ai = getAI();
  let prompt = "";
  switch(task) {
    case 'debug': prompt = `Analyze this ${language} code for bugs and fix them. Explain the fixes:\n\`\`\`${language}\n${code}\n\`\`\``; break;
    case 'explain': prompt = `Explain this ${language} code step-by-step:\n\`\`\`${language}\n${code}\n\`\`\``; break;
    case 'optimize': prompt = `Optimize this ${language} code for performance and readability:\n\`\`\`${language}\n${code}\n\`\`\``; break;
    case 'generate': prompt = `Generate ${language} code for: ${code}`; break;
  }

  const response = await ai.models.generateContent({
    /* Update model to recommended gemini-3-flash-preview */
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { safetySettings: SAFETY_SETTINGS }
  });
  /* Fix: Use .text property instead of method */
  return response.text || "No code generated.";
};

export const generateImageContent = async (prompt: string, options: any): Promise<{ imageUrl?: string, text?: string }> => {
  const ai = getAI();
  
  if (options.referenceImage) {
    const response = await ai.models.generateContent({
       model: 'gemini-2.5-flash-image',
       contents: {
         parts: [
           { inlineData: { mimeType: options.referenceImage.mimeType, data: options.referenceImage.base64 } },
           { text: prompt }
         ]
       }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      /* Fix: Iterate parts to find image and text properly */
      if (part.inlineData) {
         return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
      }
      if (part.text) {
         return { text: part.text };
      }
    }
    return { text: "No image generated." };

  } else {
    if (options.model === 'gemini-3-pro-image-preview') {
       /* MANDATORY: gemini-3-pro-image-preview requires key selection check. Assuming check is done at component level. */
       const response = await ai.models.generateContent({
         model: 'gemini-3-pro-image-preview',
         contents: { parts: [{ text: prompt }] },
         config: {
            imageConfig: {
               aspectRatio: options.aspectRatio || "1:1",
               imageSize: options.imageSize || "1K"
            }
         }
       });
       
       for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
           return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
        }
      }
      return { text: "Failed to generate image." };

    } else {
       const response = await ai.models.generateContent({
         model: 'gemini-2.5-flash-image',
         contents: { parts: [{ text: prompt }] },
         config: {
           imageConfig: { aspectRatio: options.aspectRatio || "1:1" }
         }
       });
       
       for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
           return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
        }
      }
      return { text: "Failed to generate image." };
    }
  }
};

export const generateVideo = async (
  prompt: string, 
  aspectRatio: string, 
  images?: { base64: string, mimeType: string }[]
): Promise<string> => {
   const ai = getAI();
   
   if (images && images.length > 1) {
      /* MANDATORY: Veo models require key selection check. Assuming check is done at component level. */
      const referenceImagesPayload: any[] = images.map(img => ({
         image: { imageBytes: img.base64, mimeType: img.mimeType },
         referenceType: 'ASSET', 
      }));

      let operation = await ai.models.generateVideos({
         model: 'veo-3.1-generate-preview',
         prompt: prompt,
         config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9',
            referenceImages: referenceImagesPayload
         }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }
      
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("Slideshow generation failed");
      return `${uri}&key=${process.env.API_KEY}`;

   } else {
      /* MANDATORY: Veo models require key selection check. Assuming check is done at component level. */
      const config: any = {
         numberOfVideos: 1,
         resolution: '720p',
         aspectRatio: aspectRatio
      };
      
      let operation;
      if (images && images.length === 1) {
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: { imageBytes: images[0].base64, mimeType: images[0].mimeType },
            config
         });
      } else {
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config
         });
      }

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("Video generation failed");
      return `${uri}&key=${process.env.API_KEY}`;
   }
};

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
   const ai = getAI();
   const response = await ai.models.generateContent({
      /* Update model to gemini-3-flash-preview */
      model: 'gemini-3-flash-preview',
      contents: {
         parts: [
            { inlineData: { mimeType: mimeType, data: base64Video } },
            { text: prompt }
         ]
      }
   });
   /* Fix: Use .text property instead of method */
   return response.text || "Analysis failed.";
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text }] }], 
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  });

  /* Fix: Use standard extraction logic for TTS response candidates */
  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("No audio generated.");
  return audioData;
};

export const getBreakingNews = async (): Promise<{ text: string, sources: Source[] }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    /* Update model to recommended gemini-3-flash-preview */
    model: 'gemini-3-flash-preview',
    contents: "What are the top 5 breaking news headlines right now? Format as Markdown cards with '---' separators.",
    config: { tools: [{ googleSearch: {} }] }
  });
  
  const sources: Source[] = [];
  response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
    if (c.web) sources.push({ title: c.web.title, uri: c.web.uri });
  });

  /* Fix: Use .text property instead of method */
  return { text: response.text || "Unable to fetch news.", sources };
};

export const generateFlashcards = async (topic: string, context: string): Promise<Flashcard[]> => {
  const ai = getAI();
  const prompt = `Create 5 flashcards for "${topic}". Return JSON array with 'front' and 'back'. Context: ${context}`;
  const response = await ai.models.generateContent({
    /* Update model to recommended gemini-3-flash-preview */
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }
        }
      }
    }
  });
  /* Fix: Use .text property instead of method */
  return JSON.parse(response.text || '[]');
};

export const generateStudyPlan = async (topic: string, hours: number): Promise<StudyPlan> => {
   const ai = getAI();
   const prompt = `Create a study plan for "${topic}" (${hours}h/day). Return JSON.`;
   const response = await ai.models.generateContent({
      /* Update model to recommended gemini-3-flash-preview */
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
   });
   /* Fix: Use .text property instead of method */
   const raw = JSON.parse(response.text || '{}');
   return {
     id: crypto.randomUUID(),
     topic,
     weeklySchedule: raw.weeklySchedule || [],
     createdAt: Date.now(),
     startDate: new Date().toISOString()
   } as StudyPlan;
};

export const generateExamQuestions = async (config: ExamConfig): Promise<ExamQuestion[]> => {
  const ai = getAI();
  const prompt = `Generate ${config.questionCount} questions for a ${config.examType} on "${config.subject}". Return JSON.`;
  const response = await ai.models.generateContent({
     /* Update model to recommended gemini-3-flash-preview */
     model: 'gemini-3-flash-preview',
     contents: prompt,
     config: { responseMimeType: 'application/json' }
  });
  /* Fix: Use .text property instead of method */
  return JSON.parse(response.text || '[]');
};

export const evaluateTheoryAnswers = async (subject: string, question: ExamQuestion, answer: string): Promise<{ score: number, feedback: string }> => {
   const ai = getAI();
   const prompt = `Evaluate: Q: "${question.text}", A: "${answer}". Max: ${question.marks}. Return JSON with 'score' and 'feedback'.`;
   const response = await ai.models.generateContent({
      /* Update model to recommended gemini-3-flash-preview */
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
   });
   /* Fix: Use .text property instead of method */
   return JSON.parse(response.text || '{ "score": 0, "feedback": "Error" }');
};
