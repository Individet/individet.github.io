import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const isi = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/isi" }),
  schema: z.object({
    created: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    templateVersion: z.string(),
    author: z.string(),
    actorId: z.string(),
    actorName: z.string(),
    actorSlug: z.string(),
    actorType: z.string(),
    actorCountry: z.string(),
    actorAffiliation: z.string(),
    analysisScope: z.string(),
    isiScore: z.number(),
    primarySources: z.array(z.string()).default([]),
    secondarySources: z.array(z.string()).default([]),
    confidenceLevel: z.string(),
    dataGaps: z.string(),
    tags: z.array(z.string()).default([]),
    scores: z.object({
      d1: z.object({
        total: z.number(),
        d1_1: z.number(),
        d1_2: z.number(),
        d1_3: z.number(),
        d1_4: z.number(),
      }),
      d2: z.object({
        total: z.number(),
        d2_1: z.number(),
        d2_2: z.number(),
        d2_3: z.number(),
        d2_4: z.number(),
      }),
      d3: z.object({
        total: z.number(),
        d3_1: z.number(),
        d3_2: z.number(),
        d3_3: z.number(),
        d3_4: z.number(),
        d3_5: z.number(),
        d3_6: z.number(),
      }),
      d4: z.object({
        total: z.number(),
        d4_1: z.number(),
        d4_2: z.number(),
        d4_3: z.number(),
        d4_4: z.number(),
      }),
      d5: z.object({
        total: z.number(),
        d5_1: z.number(),
        d5_2: z.number(),
        d5_3: z.number(),
        d5_4: z.number(),
      }),
      d6: z.object({
        total: z.number(),
        d6_1: z.number(),
        d6_2: z.number(),
        d6_3: z.number(),
        d6_4: z.number(),
      }),
    }),
  }),
});

const isiReports = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/isi/reports" }),
  schema: z.object({
    created: z.coerce.date(),
    lastUpdated: z.coerce.date(),
    author: z.string(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content" }),
  schema: z.object({
    created: z.coerce.date().optional(),
    author: z.string().optional(),
  }),
});

export const collections = { isi, isiReports, pages };
