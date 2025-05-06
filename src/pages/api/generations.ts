import { z } from "zod";
import type { APIRoute } from "astro";
import type { GenerateFlashcardsCommand } from "../../types";
import { GenerationService } from "../../lib/generation.service";
import type { SupabaseClient } from "../../db/supabase.client";

export const prerender = false;

// Validation schema for the request body
const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Text must be at least 1000 characters long")
    .max(10000, "Text must not exceed 10000 characters"),
});

// Validation schema for pagination parameters
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// Validation schema for generation ID parameter
const generationIdSchema = z.coerce.number().positive();

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = (await request.json()) as GenerateFlashcardsCommand;
    const validationResult = generateFlashcardsSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const generationService = new GenerationService(locals.supabase as SupabaseClient, { apiKey: "mock" });
    const result = await generationService.generateFlashcards(validationResult.data.source_text);

    return new Response(JSON.stringify(result), {
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

export const GET: APIRoute = async ({ request, url, locals }) => {
  try {
    const generationService = new GenerationService(locals.supabase, {
      apiKey: import.meta.env.OPENROUTER_API_KEY,
    });

    // Check if we're fetching a specific generation
    const parts = url.pathname.split("/");
    const generationId = parts[parts.length - 1];

    if (generationId && generationId !== "generations") {
      // Get specific generation
      const parsedId = generationIdSchema.safeParse(generationId);

      if (!parsedId.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid generation ID",
          }),
          { status: 400 }
        );
      }

      const generation = await generationService.getById(locals.user.id, parsedId.data);

      if (!generation) {
        return new Response(
          JSON.stringify({
            error: "Generation not found",
          }),
          { status: 404 }
        );
      }

      return new Response(JSON.stringify(generation));
    }

    // List generations with pagination
    const params = Object.fromEntries(url.searchParams.entries());
    const validatedParams = paginationSchema.safeParse(params);

    if (!validatedParams.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid pagination parameters",
          details: validatedParams.error.errors,
        }),
        { status: 400 }
      );
    }

    const { page, limit } = validatedParams.data;
    const result = await generationService.list(locals.user.id, page, limit);

    return new Response(JSON.stringify(result));
  } catch (error) {
    console.error("Error in generations endpoint:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500 }
    );
  }
};
