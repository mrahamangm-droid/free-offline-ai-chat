export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  model?: string | null;
  created_at: number;
  edited: number;
}

export interface Conversation {
  id: string;
  title: string;
  persona: string;
  model: string | null;
  system_prompt: string | null;
  created_at: number;
  updated_at: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface DocumentRecord {
  id: string;
  filename: string;
  mime: string | null;
  size: number;
  created_at: number;
  chunk_count: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}
