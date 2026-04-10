import { createOpencode, createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { FREE_MODELS, type LlmStatus, PROBLEM_JSON_SCHEMA } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class OpenCodeService {
  private client: any = null;
  private server: any = null;
  private sessionId: string | null = null;
  private contextLoaded = false;
  private currentModel = 'opencode/gpt-5-nano';

  async init() {
    try {
      console.log('[OpenCode] Starting...');
      const opencode = await createOpencode();
      this.client = opencode.client;
      this.server = opencode.server;
      console.log('[OpenCode] Started at', this.server.url);
    } catch (e: any) {
      console.log('[OpenCode] Failed to start:', e.message);
      console.log('[OpenCode] Trying to connect to existing server on 4096...');
      this.client = createOpencodeClient({ baseUrl: 'http://127.0.0.1:4096' });
    }
    
    try {
      await this.loadContext();
      console.log('[OpenCode] Ready');
    } catch (e: any) {
      console.log('[OpenCode] Load context failed:', e.message);
    }
  }

  private getInstructions() {
    const instructionsDir = path.resolve(__dirname, '../../../llm/instructions');
    const files = readdirSync(instructionsDir).filter(f => f.endsWith('.md'));
    
    const instructions = files.map(file => {
      const content = readFileSync(path.join(instructionsDir, file), 'utf-8');
      return content;
    });
    
    return instructions.join('\n\n---\n\n');
  }

  private async loadContext() {
    if (this.contextLoaded) return;
    
    const instructions = this.getInstructions();
    const initPrompt = `You are an expert technical interview question generator and evaluator. Read and understand these instructions thoroughly. After this, I will send you specific parameters and you will generate problems or evaluate solutions based on these instructions.

${instructions}

Reply with "UNDERSTOOD" if you have read and understood all instructions.`;

    console.log('[OpenCode] Loading context...');
    await this.prompt(initPrompt);
    this.contextLoaded = true;
    console.log('[OpenCode] Context loaded');
  }

  private async createSession() {
    if (!this.client) throw new Error('OpenCode not initialized');
    
    const result = await this.client.session.create({
      body: { title: 'Whiteboard Practice Session' }
    });
    this.sessionId = result.data?.id;
    console.log('[OpenCode] Session created:', this.sessionId);
    return this.sessionId;
  }

  async prompt(prompt: string, format: any = null): Promise<{ response?: string; error?: string }> {
    if (!this.client) {
      return { error: 'OpenCode not initialized' };
    }

    if (!this.sessionId) {
      await this.createSession();
    }

    console.log('[OpenCode] Prompt using model:', this.currentModel);

    const requestBody: any = { 
      parts: [{ type: 'text', text: prompt }],
    };
    if (format) {
      requestBody.format = format;
    }

    try {
      console.log('[OpenCode] Sending prompt, session:', this.sessionId);
      const result: any = await this.client.session.prompt({
        path: { id: this.sessionId! },
        body: requestBody
      });

      console.log('[OpenCode] Result keys:', Object.keys(result));
      console.log('[OpenCode] Result:', JSON.stringify(result).substring(0, 1000));

      if (result.error) {
        console.log('[OpenCode] Error response:', result.error);
        return { error: JSON.stringify(result.error) };
      }

      if (!result.data) {
        return { error: 'No response from LLM' };
      }

      // If structured output is requested, try to extract JSON
      if (format) {
        if (result.data.info?.structured) {
          const structured = result.data.info.structured;
          // Handle array response
          if (structured.items) {
            return { response: JSON.stringify(structured.items) };
          }
          return { response: JSON.stringify(structured) };
        }

        // Fallback: extract from markdown code blocks
        const parts = result.data.info?.parts || result.data?.parts || [];
        const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('');
        
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          console.log('[OpenCode] Found JSON in code block');
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            // Handle array wrapped in object
            if (parsed.items) {
              return { response: JSON.stringify(parsed.items) };
            }
            return { response: JSON.stringify(parsed) };
          } catch {
            console.log('[OpenCode] Failed to parse JSON from code block');
            return { error: 'Failed to parse JSON from response' };
          }
        }

        // Try to find any JSON array in the response
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed)) {
              console.log('[OpenCode] Found JSON array in response');
              return { response: JSON.stringify(parsed) };
            }
          } catch {}
        }

        console.log('[OpenCode] No structured output or JSON found. Raw response:', text.substring(0, 500));
        return { error: 'No structured output from LLM' };
      }

      // Plain text response
      const parts = result.data.info?.parts || result.data?.parts || [];
      const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('');
      return { response: text };
    } catch (error: any) {
      console.log('[OpenCode] Error:', error.message);
      return { error: error.message };
    }
  }

  async generateProblem(prompt: string): Promise<{ response?: string; error?: string }> {
    await this.loadContext();
    return this.prompt(prompt, { type: 'json_schema', schema: PROBLEM_JSON_SCHEMA });
  }

  async generateProblems(prompt: string, count: number): Promise<{ response?: string; error?: string }> {
    await this.loadContext();
    const batchSchema = {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array' as const,
          items: PROBLEM_JSON_SCHEMA,
        },
      },
      required: ['items'],
    };
    return this.prompt(prompt, { type: 'json_schema', schema: batchSchema });
  }

  async evaluate(prompt: string): Promise<{ response?: string; error?: string }> {
    await this.loadContext();
    return this.prompt(prompt);
  }

  getStatus(): LlmStatus {
    return {
      connected: !!this.client,
      currentModel: this.currentModel,
      availableModels: FREE_MODELS,
      serverUrl: this.server?.url || null,
    };
  }

  async setModel(modelId: string): Promise<LlmStatus> {
    console.log('[OpenCode] Switching to model:', modelId);
    
    const oldModel = this.currentModel;
    this.currentModel = modelId;
    this.sessionId = null;
    this.contextLoaded = false;
    
    console.log('[OpenCode] Model changed from', oldModel, 'to', modelId);
    console.log('[OpenCode] Note: To use new model, a new session will be created on next prompt');
    
    return this.getStatus();
  }
}

export const opencodeService = new OpenCodeService();