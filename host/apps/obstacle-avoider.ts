import type { OriginApp } from "originrobot-core";

const app: OriginApp = {
  name: "obstacle-avoider",

  async loop(ctx) {
    const readings = await ctx.read();

    const distance = readings.distance as number;
    if (distance < 10) {
      await ctx.send("moveBkwd");
      await ctx.send("turnRight");
    } else {
      await ctx.send("moveFwd");
    }
  },
};

export default app;
