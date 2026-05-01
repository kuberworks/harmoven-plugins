// src/types.ts
// Local loose type stubs replacing harmoven's @/ imports.
// At runtime these types are erased — the actual harmoven objects satisfy these shapes.

export interface LlmProfileConfig {
  id:                        string
  provider:                  string
  model_string:              string
  tier:                      string
  context_window:            number
  cost_per_1m_input_tokens:  number
  cost_per_1m_output_tokens: number
  jurisdiction:              string
  trust_tier:                number
  task_type_affinity:        string[]
  // Allow extra fields from harmoven's actual type
  [key: string]: unknown
}

export interface ChatMessage {
  role:    'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  maxTokens?:     number
  temperature?:   number
  signal?:        AbortSignal
  correlationId?: string
  // Allow extra fields
  [key: string]: unknown
}

export interface ChatResult {
  content:   string
  tokensIn:  number
  tokensOut: number
  costUsd:   number
  model:     string
}
