import type { APIRoute } from "astro";
import { z } from "zod";
import { GenerationService } from "../../../lib/generation.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";

export const prerender = false; //prerender

const generationIdSchema = z.coerce.number().positive();

export const GET: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  const parsedId = generationIdSchema.safeParse(id);

  if (!parsedId.success) {
    return new Response(JSON.stringify({ error: "Invalid generation ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: Pobierz user.id z locals lub sesji
  //   const userId = locals.user?.id;
  const userId = DEFAULT_USER_ID;

  //   if (!userId) {
  //     return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  //   }

  const generationService = new GenerationService(locals.supabase, {
    apiKey: import.meta.env.OPENROUTER_API_KEY,
  });

  const generation = await generationService.getById(userId, parsedId.data);

  if (!generation) {
    return new Response(JSON.stringify({ error: "Generation not found" }), { status: 404 });
  }

  return new Response(JSON.stringify(generation), {
    headers: { "Content-Type": "application/json" },
  });
};
