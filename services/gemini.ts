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
import { Message, Role, Attachment, Source, ChatConfig, PersonalizationConfig, Persona, StudentConfig, ExamConfig, ExamQuestion, Flashcard, StudyPlan, VFS } from "../types";
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

**CONVERSATIONAL MIRRORING PROTOCOL (PERSONALIZATION):**
1. **Linguistic Mirroring**: Detect and respond in the EXACT language or dialect the user uses (English, Tamil, Hindi, or Tanglish). 
2. **Formality & Greeting Matching**: Mirror the user's greeting style and level of familiarity perfectly.
3. **Aesthetic Emoji Usage**: Use emojis that match the emotional tone and cultural context.
4. **Natural Conciseness**: Keep responses human-like, brief, and engaging.

**CREATOR VERIFICATION PROTOCOL (SECURITY GATEKEEPER):**
1. **Challenge Trigger**: If a user claims to be your creator, developer, or owner, you MUST respond with exactly one question: "What is the nickname of my creator?"
2. **Action Phase**: When the user provides a nickname, you MUST call 'verify_creator_identity'.
`;

export const FLOWCHART_DESIGNER_PROTOCOL = `
**FLOWCHART DESIGNER PROTOCOL:**
You are an expert flowchart designer and visualization specialist.
1. **Explicit White Background**: When generating flowcharts (Mermaid), you MUST explicitly set the background to white for a professional look.
2. **Mermaid Initialization**: Start your Mermaid code blocks with this specific configuration header:
   \`\`\`mermaid
   %%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryColor': '#f8fafc', 'primaryTextColor': '#0f172a', 'primaryBorderColor': '#cbd5e1', 'lineColor': '#64748b', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#ffffff' }}}%%
   graph TD
   ...
   \`\`\`
3. **Visual Clarity**: Ensure high contrast (dark text/lines on white). Use standard symbols (rectangles for processes, diamonds for decisions, ovals for start/end).
`;

export const VERIFY_IDENTITY_TOOL: FunctionDeclaration = {
  name: 'verify_creator_identity',
  description: 'Validates the secret nickname provided by a user claiming to be the developer/creator.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      nickname: { type: Type.STRING, description: 'The nickname provided by the user in response to the identity challenge.' }
    },
    required: ['nickname']
  }
};

export const LOGOUT_TOOL: FunctionDeclaration = {
  name: 'logout_creator_session',
  description: 'Deactivates all creator and architect permissions immediately.',
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

export const MEDIA_PLAYER_TOOL: FunctionDeclaration = {
  name: 'play_media',
  description: 'Plays music or videos on Spotify or YouTube based on user request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      media_type: { type: Type.STRING, description: 'Type of media: music, song, video, etc.' },
      title: { type: Type.STRING, description: 'Name of the track or video' },
      artist: { type: Type.STRING, description: 'Artist name if available' },
      platform: { type: Type.STRING, enum: ['spotify', 'youtube'], description: 'Target platform' },
      query: { type: Type.STRING, description: 'Optimized search query string' }
    },
    required: ['media_type', 'title', 'platform', 'query']
  }
};

export const buildSystemInstruction = (personalization?: PersonalizationConfig, activePersona?: Persona, isEmotionalMode?: boolean): string => {
  const memoryContext = memoryService.getContextString(5);
  const now = new Date();
  
  // Real-time Date and Time Context Generation
  const realTimeContext = `
**REAL-TIME SYSTEM CLOCK:**
- **Current Date**: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- **Current Time**: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
- **Timezone**: Indian Standard Time (IST)
- **Status**: Live / Active. 
*Always use this timestamp when the user asks for the current date or time.*`;

  let instruction = "";
  if (activePersona) {
    instruction += `ROLEPLAY: ${activePersona.name}. ${activePersona.systemPrompt}`;
  } else {
    instruction += ZARA_CORE_IDENTITY;
    instruction += `\n\n${FLOWCHART_DESIGNER_PROTOCOL}`;
  }

  instruction += `\n\n${realTimeContext}`;

  if (personalization?.isVerifiedCreator) {
    instruction += `\n\n**SECURITY CONTEXT: CREATOR_VERIFIED = TRUE**
Identity confirmed as Mohammed Majeed (Afzal). Full architectural access granted.`;
  }

  if (isEmotionalMode) instruction += `\n\nEMOTIONAL ENGINE: Prioritize extreme empathy and attentive listening.`;
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
  
  const truncatedHistory = history.slice(-8);
  const contents: Content[] = [...truncatedHistory.map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: Role.USER, parts: currentParts }];
  
  // System Instruction is rebuilt on every message to ensure the clock is fresh
  const requestConfig: any = {
    systemInstruction: buildSystemInstruction(personalization, activePersona, config.isEmotionalMode),
    safetySettings: SAFETY_SETTINGS,
    tools: config.useGrounding ? [{ googleSearch: {} }] : [{ functionDeclarations: [MEDIA_PLAYER_TOOL, VERIFY_IDENTITY_TOOL, LOGOUT_TOOL] }]
  };

  try {
    const stream = await withRetry<AsyncIterable<GenerateContentResponse>>(() => ai.models.generateContentStream({ 
      model: config.model || 'gemini-3-flash-preview', 
      contents, 
      config: requestConfig 
    }));

    let fullText = '';
    const sources: Source[] = [];
    
    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;

      if (c.functionCalls && c.functionCalls.length > 0 && onIdentityAction) {
        for (const call of c.functionCalls) {
          if (call.name === 'verify_creator_identity') {
            const resultMessage = await onIdentityAction('verify', (call.args as any).nickname);
            const feedbackHistory = [...history, { id: crypto.randomUUID(), role: Role.USER, text: newMessage, timestamp: Date.now() }];
            return sendMessageToGeminiStream(feedbackHistory, `[SYSTEM: ${resultMessage}]`, [], config, personalization, onUpdate, activePersona, onIdentityAction);
          }
          if (call.name === 'logout_creator_session') {
            const resultMessage = await onIdentityAction('logout');
            const feedbackHistory = [...history, { id: crypto.randomUUID(), role: Role.USER, text: newMessage, timestamp: Date.now() }];
            return sendMessageToGeminiStream(feedbackHistory, `[SYSTEM: ${resultMessage}]`, [], config, personalization, onUpdate, activePersona, onIdentityAction);
          }
        }
      }

      if (c.text) {
        fullText += c.text;
        onUpdate(fullText);
      }
      
      c.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((gc: any) => {
        if (gc.web) sources.push({ title: gc.web.title, uri: gc.web.uri });
      });
    }

    return { text: fullText, sources };
  } catch (error: any) {
    let msg = (error?.message || "").toLowerCase();
    if (msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("exceeded")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
};

export const sendAppBuilderStream = async (history: Message[], newMessage: string, attachments: Attachment[], onUpdate: (text: string) => void): Promise<{ text: string }> => {
  const ai = getAI();
  const currentParts: Part[] = attachments.map(att => ({ inlineData: { mimeType: att.mimeType, data: att.base64 } }));
  currentParts.push({ text: newMessage || " " });
  
  const stream = await withRetry<AsyncIterable<GenerateContentResponse>>(() => ai.models.generateContentStream({ 
    model: 'gemini-3-flash-preview', 
    contents: [...history.slice(-5).map(m => ({ role: m.role, parts: [{ text: m.text }] })), { role: Role.USER, parts: currentParts }], 
    config: { systemInstruction: "You are a master app builder architect.", thinkingConfig: { thinkingBudget: 4096 } } 
  }));
  
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

export const generateStudentContent = async (config: StudentConfig) => {
  const ai = getAI();
  let prompt = `Role: Expert Tutor. Task: ${config.mode}. Topic: ${config.topic}.`;
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt }));
  return response.text || "";
};

export const generateCodeAssist = async (code: string, task: string, lang: string) => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Task: ${task} for ${lang} code:\n${code}` }));
  return response.text || "";
};

export const generateImageContent = async (prompt: string, options: any) => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: options.model || 'gemini-2.5-flash-image', 
    contents: prompt, 
    config: { imageConfig: { aspectRatio: options.aspectRatio || '1:1' } } 
  }));
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
  let operation = await withRetry<any>(() => ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9' }
  }));
  while (!operation.done) {
    await sleep(8000);
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
};

export const analyzeVideo = async (base64: string, mimeType: string, prompt: string) => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] } 
  }));
  return response.text || "";
};

export const generateSpeech = async (text: string, voice: string) => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: "gemini-2.5-flash-preview-tts", 
    contents: [{ parts: [{ text }] }], 
    config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } 
  }));
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const getBreakingNews = async () => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: "Latest breaking news global.", 
    config: { tools: [{ googleSearch: {} }] } 
  }));
  const sources: Source[] = [];
  response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => { if (c.web) sources.push({ title: c.web.title, uri: c.web.uri }); });
  return { text: response.text || "", sources };
};

export const generateExamQuestions = async (config: ExamConfig) => {
  const ai = getAI();
  const resp = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `Generate ${config.questionCount} questions for ${config.subject}.`, 
    config: { responseMimeType: "application/json" } 
  }));
  return JSON.parse(resp.text || "[]");
};

export const evaluateTheoryAnswers = async (sub: string, q: any, ans: string) => {
  const ai = getAI();
  const resp = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `Grade: ${ans} for ${q.text} in ${sub}`, 
    config: { responseMimeType: "application/json" } 
  }));
  return JSON.parse(resp.text || "{}");
};

export const generateFlashcards = async (topic: string, notes: string) => {
  const ai = getAI();
  const resp = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `Cards for: ${topic}\n${notes}`, 
    config: { responseMimeType: "application/json" } 
  }));
  return JSON.parse(resp.text || "[]");
};

export const generateStudyPlan = async (topic: string, hours: number) => {
  const ai = getAI();
  const resp = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `7 day plan for ${topic}, ${hours} hrs/day`, 
    config: { responseMimeType: "application/json" } 
  }));
  return JSON.parse(resp.text || "{}");
};

export const analyzeGithubRepo = async (url: string, mode: string, manifest?: string) => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `Analyze ${url}`, 
    config: { tools: [{ googleSearch: {} }] } 
  }));
  return response.text || "";
};

export const generateAppReliabilityReport = async (vfs: VFS) => {
  const ai = getAI();
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: `Audit reliability for app:\n${JSON.stringify(vfs)}` 
  }));
  return response.text || "";
};