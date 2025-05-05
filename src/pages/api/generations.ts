import { z } from "zod";
import type { APIRoute } from "astro";
import type { FlashcardProposalDto, GenerateFlashcardsCommand, GenerationCreateResponseDto } from "../../types";
import { GenerationService } from "../../lib/generation.service";
import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";

export const prerender = false;

// Validation schema for the request body
const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Text must be at least 1000 characters long")
    .max(10000, "Text must not exceed 10000 characters"),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse and validate request body
    const body = (await request.json()) as GenerateFlashcardsCommand;
    const validationResult = generateFlashcardsSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Użyj GenerationService i mockowanej metody callAIService
    const generationService = new GenerationService(supabaseClient, { apiKey: "mock" });
    const mockFlashcards = await generationService.callAIService(validationResult.data.source_text);

    const mockResult: GenerationCreateResponseDto = {
      generation_id: 1,
      flashcards_proposals: mockFlashcards,
      generated_count: mockFlashcards.length,
    };

    return new Response(JSON.stringify(mockResult), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing generation request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
