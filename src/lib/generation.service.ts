import crypto from "crypto";
import type {
  FlashcardProposalDto,
  GenerationCreateResponseDto,
  GenerationsListResponseDto,
  GenerationDetailDto,
} from "../types";
import type { SupabaseClient } from "../db/supabase.client";
import { DEFAULT_USER_ID } from "../db/supabase.client";
import { OpenRouterService } from "./openrouter.service";

// Replace with the actual default user ID

export class GenerationService {
  private readonly openRouter: OpenRouterService;
  private readonly model = "openai/gpt-4o-mini";

  constructor(
    private readonly supabase: SupabaseClient,
    openRouterConfig?: { apiKey: string }
  ) {
    if (!openRouterConfig?.apiKey) {
      throw new Error("OpenRouter API key is required");
    }
    this.openRouter = new OpenRouterService({
      apiKey: openRouterConfig.apiKey,
      timeout: 60000, // 60 seconds timeout for longer generations
    });

    // Configure OpenRouter
    this.openRouter.setModel(this.model, {
      temperature: 0.7,
      top_p: 1,
    });

    this.openRouter
      .setSystemMessage(`You are an AI assistant specialized in creating high-quality flashcards from provided text.
Generate concise, clear, and effective flashcards that capture key concepts and knowledge.
Each flashcard should have a front (question/prompt) and back (answer/explanation).
Focus on important facts, definitions, concepts, and relationships.`);

    this.openRouter.setResponseFormat({
      name: "flashcards",
      schema: {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["flashcards"],
      },
    });
  }

  async generateFlashcards(sourceText: string): Promise<GenerationCreateResponseDto> {
    try {
      // 1. Calculate metadata
      const startTime = Date.now();
      const sourceTextHash = await this.calculateHash(sourceText);

      // 2. Call AI service through OpenRouter
      const proposals = await this.callAIService(sourceText);

      // 3. Save generation metadata
      const generationId = await this.saveGenerationMetadata({
        sourceTextHash,
        sourceTextLength: sourceText.length,
        generatedCount: proposals.length,
        durationMs: Date.now() - startTime,
      });

      return {
        generation_id: generationId,
        flashcards_proposals: proposals,
        generated_count: proposals.length,
      };
    } catch (error) {
      // Log error and save to generation_error_logs
      await this.logGenerationError(error, {
        sourceTextHash: await this.calculateHash(sourceText),
        sourceTextLength: sourceText.length,
      });
      throw error;
    }
  }

  private async calculateHash(text: string): Promise<string> {
    return crypto.createHash("md5").update(text).digest("hex");
  }

  // Zamockowana metoda AI – zwraca przykładowe fiszki niezależnie od wejścia
  async callAIService(_text: string): Promise<FlashcardProposalDto[]> {
    return [
      {
        front: "What is the capital of France?",
        back: "Paris",
        source: "ai-full",
      },
      {
        front: "Who wrote 'Romeo and Juliet'?",
        back: "William Shakespeare",
        source: "ai-full",
      },
    ];
  }

  private async saveGenerationMetadata(data: {
    sourceTextHash: string;
    sourceTextLength: number;
    generatedCount: number;
    durationMs: number;
  }): Promise<number> {
    const { data: generation, error } = await this.supabase
      .from("generations")
      .insert({
        source_text_hash: data.sourceTextHash,
        source_text_length: data.sourceTextLength,
        generated_count: data.generatedCount,
        generation_duration: data.durationMs,
        model: this.model,
        user_id: DEFAULT_USER_ID, // Replace with authenticated user ID when auth is implemented
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to save generation metadata: ${error.message}`);
    }

    return generation.id;
  }

  private async logGenerationError(
    error: unknown,
    data: {
      sourceTextHash: string;
      sourceTextLength: number;
    }
  ): Promise<void> {
    await this.supabase.from("generation_error_logs").insert({
      user_id: DEFAULT_USER_ID,
      error_code: error instanceof Error ? error.name : "UNKNOWN",
      error_message: error instanceof Error ? error.message : String(error),
      model: this.model,
      source_text_hash: data.sourceTextHash,
      source_text_length: data.sourceTextLength,
    });
  }

  async list(userId: string, page: number, limit: number): Promise<GenerationsListResponseDto> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get total count for pagination
    const { count, error: countError } = await this.supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new Error(`Failed to get generations count: ${countError.message}`);
    }

    // Get paginated generations
    const { data: generations, error } = await this.supabase
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list generations: ${error.message}`);
    }

    return {
      data: generations,
      pagination: {
        page,
        limit,
        total: count || 0,
      },
    };
  }

  async getById(userId: string, id: number): Promise<GenerationDetailDto | null> {
    // Get generation with its flashcards, filtered by user_id for security
    const { data: generation, error } = await this.supabase
      .from("generations")
      .select(
        `
        *,
        flashcards (
          id, front, back, source, generation_id, created_at, updated_at
        )
      `
      )
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Record not found
      }
      throw new Error(`Failed to get generation: ${error.message}`);
    }

    return generation;
  }
}
