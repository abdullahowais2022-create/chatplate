import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200)
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Password must contain letters and numbers");

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Used to keep login timing constant when the email does not exist.
let dummyHash: string | null = null;
export async function burnPasswordCheck(plain: string) {
  dummyHash ??= await bcrypt.hash("timing-equaliser", 12);
  await bcrypt.compare(plain, dummyHash);
  return false;
}
