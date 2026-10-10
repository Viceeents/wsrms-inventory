import { z } from "zod";
export const id = z.coerce.number().int().positive();
export const parcelSchema = z.object({
  tracking_number: z.string().trim().max(100).optional().default(""),
  description: z.string().trim().min(3).max(250),
  category_id: id,
  size: z.enum(["Small", "Medium", "Large"]).default("Small"),
  length_cm: z.coerce.number().positive().max(10000),
  width_cm: z.coerce.number().positive().max(10000),
  height_cm: z.coerce.number().positive().max(10000),
  weight: z.coerce.number().positive().max(10000),
  quantity: z.coerce.number().int().positive().max(10000),
});
export const checkInSchema = parcelSchema.extend({
  location_id: id,
});
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
  active: z.coerce.number().int().min(0).max(1).default(1),
});
export const userSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(200)
    .transform((s) => s.toLowerCase()),
  role: z.enum(["staff", "manager", "admin"]),
  active: z.coerce.number().int().min(0).max(1).default(1),
  suspended: z.boolean().default(false),
  password: z.string().min(10).max(128),
});
export const userUpdateSchema = userSchema.extend({
  password: z.union([z.literal(""), z.string().min(10).max(128)]).optional(),
});
export const layoutSchema = z.object({
  revision: id,
  name: z.string().trim().min(2).max(80),
  cells: z
    .array(
      z.object({
        id: z.string(),
        row: z.number().int().min(0),
        col: z.number().int().min(0),
        type: z.enum([
          "walkway",
          "rack",
          "door",
          "floor_storage",
          "wall",
          "blocked",
        ]),
        walkable: z.boolean(),
        active: z.boolean(),
        can_store: z.boolean(),
        availability: z.enum(["Available", "Blocked"]),
        movement_cost: z.number().positive().max(100),
        door_usage: z.enum(["receiving", "dispatch", "both"]).nullable(),
        directions: z
          .array(z.enum(["north", "south", "east", "west"]))
          .max(4)
          .refine(
            (v) => new Set(v).size === v.length,
            "Directions must be unique",
          ),
      }),
    )
    .max(1600),
  locations: z
    .array(
      z.object({
        id: id.optional(),
        cell_id: z.string(),
        code: z
          .string()
          .trim()
          .min(2)
          .max(20)
          .regex(/^[A-Za-z0-9-]+$/),
        capacity: z.coerce.number().int().min(1).max(10000),
        unit_capacity: z.coerce.number().int().min(1).max(40000),
        storage_type: z.enum(["rack", "floor_storage", "walkway"]),
        width_cm: z.coerce.number().positive().max(10000).default(120),
        depth_cm: z.coerce.number().positive().max(10000).default(80),
        height_cm: z.coerce.number().positive().max(10000).default(180),
        max_weight: z.coerce.number().positive().max(100000),
        max_size: z.enum(["Small", "Medium", "Large"]),
        category_id: id.nullable(),
        status: z.enum(["Available", "Reserved", "Blocked"]),
      }),
    )
    .max(500),
});
