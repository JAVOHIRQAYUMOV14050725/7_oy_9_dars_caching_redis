import { NextFunction, Request, Response } from "express";

const checkJsonFormat = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    if (req.headers['content-type'] !== 'application/json') {
      return res.status(400).json({ error: "Content-Type 'application/json' bo'lishi kerak." });
    }

    try {
      JSON.parse(JSON.stringify(req.body));
    } catch (error) {
      return res.status(400).json({ error: "Yuborilgan JSON noto'g'ri formatlangan." });
    }
  }
  next();
};

export { checkJsonFormat };
