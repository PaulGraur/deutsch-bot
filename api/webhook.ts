import express, { Request, Response } from "express";
import { bot } from "../src/bot.js";

const app = express();
app.use(express.json());

app.post("/webhook", async (req: Request, res: Response) => {
  await bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.listen(3000);
