import { createChatHandler } from "glove-next";

export const POST = createChatHandler({
  provider: "openrouter",
  model: "z-ai/glm-5-turbo",
});
