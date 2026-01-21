
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
import { Message, Role, Attachment, Source, ChatConfig, PersonalizationConfig, Persona, StudentConfig, ExamConfig, VFS } from "../types";
import { memoryService } from "./memoryService";

export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      let status = err?.status || err?.response?.status || 0;
      let message = (err?.message || "").toLowerCase();
      
      const isQuota = status === 429 || 
                     message.includes("quota") || 
                     message.includes("resource_exhausted") ||
                     message.includes("limit") ||
                     message.includes("exceeded");

      if (isQuota || status >= 500) {
        const backoff = Math.pow(2, i + 1) * 3000;
        console.warn(`[Zara AI] Quota Hit. Retrying in ${backoff}ms... (${i + 1}/${maxRetries})`);
        await sleep(backoff + Math.random() * 500);
        continue;
      }
      throw err; 
    }
  }
  throw lastError;
}

export const ZARA_CORE_IDENTITY = `
**IDENTITY: Zara AI — Developed by Mohammed Majeed**
You are a highly advanced, empathetic, and professional AI companion.

**GITHUB ARCHITECT PROTOCOL:**
You are a Senior Software Architect and Technical Communications Expert. Your goal is to analyze the provided GitHub repository codebase and generate three distinct, high-quality outputs.

### OUTPUT 1: TECHNICAL DOCUMENTATION (Markdown)
Create a comprehensive 'Developer Guide' that includes:
- Project Overview: High-level purpose of the repository.
- Tech Stack: List of languages, frameworks, and libraries used.
- Core Logic: Explanation of the primary functions and business logic.
- File Structure: A tree-view of the project with descriptions for key directories.
- Installation & Usage: Clear steps to get the project running.

### OUTPUT 2: ARCHITECTURE FLOWCHART (Mermaid.js)
Generate a Mermaid.js 'graph TD' (Top Down) diagram that visualizes:
- The data flow between components.
- Main entry points.
- Integration with external APIs or databases.
Note: Ensure the output is a valid Mermaid code block.

### OUTPUT 3: AUDIO OVERVIEW SCRIPT (Podcast Format)
Write a 3-minute conversational script between two AI personas, "Alex" (the curious host) and "Sam" (the technical expert). 
- The tone should be engaging, like a 'Deep Dive' podcast.
- They should discuss: What problem does this code solve? How does it handle its most complex part? Why would a developer find this useful?
- Format the script clearly with Alex: and Sam: prefixes.
`;

// Added MEDIA_PLAYER_TOOL definition for function calling in Live API
export const MEDIA_PLAYER_TOOL: FunctionDeclaration = {
  name: 'play_media',
  parameters: {
    type: Type.OBJECT,
    description: 'Search and play music or videos on platforms like Spotify or YouTube.',
    properties: {
      title: {
        type: Type.STRING,
        description: 'The title of the song or video.',
      },
      artist: {
        type: Type.STRING,
        description: 'The artist or creator (optional).',
      },
      platform: {
        type: Type.STRING,
        description: 'The platform to play on: "spotify" or "youtube".',
      },
      query: {
        type: Type.STRING,
        description: 'The search query string for the platform.',
      },
    },
    required: ['title', 'platform', 'query'],
  },
};

export const buildSystemInstruction = (personalization?: PersonalizationConfig, activePersona?: Persona, isEmotionalMode?: boolean): string => {
  const memoryContext = memoryService.getContextString(5);
  const now = new Date();
  
  const realTimeContext = `
**REAL-TIME SYSTEM CLOCK:**
- **Current Date**: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- **Current Time**: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
- **Timezone**: Indian Standard Time (IST)`;

  let instruction = ZARA_CORE_IDENTITY;
  if (activePersona) instruction += `\nROLEPLAY: ${activePersona.name}. ${activePersona.systemPrompt}`;
  instruction += `\n\n${realTimeContext}`;
  if (isEmotionalMode) instruction += `\n\nEMOTIONAL ENGINE: Prioritize extreme empathy.`;
  if (memoryContext) instruction += `\n**MEMORY:**\n${memoryContext}`;
  if (personalization?.nickname) instruction += `\n**USER:** ${personalization.nickname}.`;
  
  return instruction;
};

export const sendMessageToGeminiStream = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  config: ChatConfig,
  personalization: PersonalizationConfig,
  onUpdate: (text: string) => void,
  activePersona?: Persona,
  onIdentityAction?: (action: 'verify' | 'logout', data?: string) => Promise<string>
): Promise<{ text: string; sources: Source[] }> => {
  const ai = getAI();
  const currentParts: Part[] = attachments.map(att => ({ inlineData: { mimeType: att.mimeType, data: att.base64 } }));
  currentParts.push({ text: newMessage || " " });
  
  const contents: Content[] = [...history.slice(-8).map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: Role.USER, parts: currentParts }];
  
  try {
    const stream = await withRetry(() => ai.models.generateContentStream({ 
      model: config.model || 'gemini-3-flash-preview', 
      contents, 
      config: { systemInstruction: buildSystemInstruction(personalization, activePersona, config.isEmotionalMode), safetySettings: SAFETY_SETTINGS } 
    })) as AsyncIterable<GenerateContentResponse>;

    let fullText = '';
    const sources: Source[] = [];
    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) { fullText += c.text; onUpdate(fullText); }
      c.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((gc: any) => {
        if (gc.web) sources.push({ title: gc.web.title, uri: gc.web.uri });
      });
    }
    return { text: fullText, sources };
  } catch (error: any) {
    throw error;
  }
};

export const analyzeGithubRepo = async (url: string, mode: string, manifest?: string) => {
  const ai = getAI();
  const prompt = `Analyze this GitHub Repository: ${url}\n\nRepository Structure/Manifest Provided:\n${manifest || "Not available (Infer from URL/Knowledge base)"}\n\nPlease follow the GITHUB ARCHITECT PROTOCOL to generate Output 1 (Docs), Output 2 (Mermaid), and Output 3 (Podcast Script).`;

  const response = await withRetry(() => ai.models.generateContent({ 
    model: 'gemini-3-pro-preview', 
    contents: prompt,
    config: { 
      systemInstruction: ZARA_CORE_IDENTITY,
      thinkingConfig: { thinkingBudget: 4096 }
    }
  })) as GenerateContentResponse;
  return response.text || "";
};

export const sendGithubChatStream = async (
  repoUrl: string,
  manifest: string,
  history: Message[],
  newMessage: string,
  onUpdate: (text: string) => void
): Promise<{ text: string }> => {
  const ai = getAI();
  const systemInstruction = `You are the GitHub Architect Assistant. You have just analyzed the repository at ${repoUrl}.
  
  **REPOSITORY CONTEXT (MANIFEST):**
  ${manifest}
  
  Your goal is to answer developer doubts and clarify details about the files and architecture of this specific project. Be precise, technical, and helpful. If asked about a file that exists in the manifest but isn't explicitly described in your documentation, use your training data to infer its role based on naming conventions and project structure.`;

  const contents: Content[] = [
    ...history.slice(-10).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: Role.USER, parts: [{ text: newMessage }] }
  ];

  const stream = await withRetry(() => ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents,
    config: { systemInstruction, thinkingConfig: { thinkingBudget: 0 } }
  })) as AsyncIterable<GenerateContentResponse>;

  let fullText = '';
  for await (const chunk of stream) {
    const c = chunk as GenerateContentResponse;
    if (c.text) {
      fullText += c.text;
      onUpdate(fullText);
    }
  }
  return { text: fullText };
};

export const sendAppBuilderStream = async (history: Message[], newMessage: string, attachments: Attachment[], onUpdate: (text: string) => void): Promise<{ text: string }> => {
  const ai = getAI();
  const currentParts: Part[] = attachments.map(att => ({ inlineData: { mimeType: att.mimeType, data: att.base64 } }));
  currentParts.push({ text: newMessage || " " });
  const stream = await withRetry(() => ai.models.generateContentStream({ 
    model: 'gemini-3-pro-preview', 
    contents: [...history.slice(-5).map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: Role.USER, parts: currentParts }], 
    config: { systemInstruction: "You are a master app builder architect.", thinkingConfig: { thinkingBudget: 4096 } } 
  })) as AsyncIterable<GenerateContentResponse>;
  let fullText = '';
  for await (const chunk of stream) { 
    const c = chunk as GenerateContentResponse;
    if (c.text) { fullText += c.text; onUpdate(fullText); } 
  }
  return { text: fullText };
};

export const generateAppReliabilityReport = async (vfs: VFS) => {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Audit reliability for app:\n${JSON.stringify(vfs)}` })) as GenerateContentResponse;
  return response.text || "";
};

export const generateStudentContent = async (config: StudentConfig) => {
  const ai = getAI();
  let prompt = `Role: Expert Tutor. Task: ${config.mode}. Topic: ${config.topic}.`;
  const response = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt })) as GenerateContentResponse;
  return response.text || "";
};

export const generateCodeAssist = async (code: string, task: string, lang: string) => {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Task: ${task} for ${lang} code:\n${code}` })) as GenerateContentResponse;
  return response.text || "";
};

export const generateImageContent = async (prompt: string, options: any) => {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({ model: options.model || 'gemini-2.5-flash-image', contents: prompt, config: { imageConfig: { aspectRatio: options.aspectRatio || '1:1' } } })) as GenerateContentResponse;
  let imageUrl: string | undefined; let text: string | undefined;
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      else if (part.text) text = part.text;
    }
  }
  return { imageUrl, text };
};

export const generateVideo = async (prompt: string, aspectRatio: string, images?: any[]) => {
  const ai = getAI();
  let operation = await withRetry(() => ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, config: { numberOfVideos: 1, aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9' } })) as any;
  while (!operation.done) { await sleep(8000); operation = await ai.operations.getVideosOperation({ operation: operation }) as any; }
  return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
};

export const analyzeVideo = async (base64: string, mimeType: string, prompt: string) => {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] } })) as GenerateContentResponse;
  return response.text || "";
};

export const generateSpeech = async (text: string, voice: string) => {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text }] }], config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } })) as GenerateContentResponse;
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateExamQuestions = async (config: ExamConfig) => {
  const ai = getAI();
  const resp = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Generate ${config.questionCount} questions for ${config.subject}.`, config: { responseMimeType: "application/json" } })) as GenerateContentResponse;
  return JSON.parse(resp.text || "[]");
};

export const evaluateTheoryAnswers = async (sub: string, q: any, ans: string) => {
  const ai = getAI();
  const resp = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Grade: ${ans} for ${q.text} in ${sub}`, config: { responseMimeType: "application/json" } })) as GenerateContentResponse;
  return JSON.parse(resp.text || "{}");
};

export const generateFlashcards = async (topic: string, notes: string) => {
  const ai = getAI();
  const resp = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Cards for: ${topic}\n${notes}`, config: { responseMimeType: "application/json" } })) as GenerateContentResponse;
  return JSON.parse(resp.text || "[]");
};

export const generateStudyPlan = async (topic: string, hours: number) => {
  const ai = getAI();
  const resp = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `7 day plan for ${topic}, ${hours} hrs/day`, config: { responseMimeType: "application/json" } })) as GenerateContentResponse;
  return JSON.parse(resp.text || "{}");
};

export const getBreakingNews = async () => {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: "Latest breaking news global.", config: { tools: [{ googleSearch: {} }] } })) as GenerateContentResponse;
  const sources: Source[] = [];
  response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => { if (c.web) sources.push({ title: c.web.title, uri: c.web.uri }); });
  return { text: response.text || "", sources };
};
