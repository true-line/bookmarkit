// #224: The AI SDK surface bookmarkit uses, behind one module edge.
//
// Static imports keep the SDK tree-shaken — this module only ever exposes the
// six functions below, so the barrel's unused surface (streaming UI, tools,
// speech, telemetry) does not reach the bundle. `llm/index.js` loads this
// module dynamically on the first generation call, so the vendor chunk costs
// nothing at startup and still ships in its shaken form.

import { generateText, Output, jsonSchema } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const vendor = {
  generateText,
  Output,
  jsonSchema,
  createGoogleGenerativeAI,
  createOpenAI,
  createOpenAICompatible,
};
