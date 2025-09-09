import { z } from "zod";

export const objectIdZodSchema = (value: string) =>
    z.string({ required_error: `${value}` }).refine((val) => /^[a-fA-F0-9]{24}$/.test(val), {
        message: `Invalid ${value} format`,
    });