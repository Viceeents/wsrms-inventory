import sharp from "sharp";
import { HttpError } from "../middleware/errorMiddleware.js";
export async function validateImage(image) {
  const match =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match) throw new HttpError(400, "Choose a JPEG, PNG, or WEBP image.");
  const b = Buffer.from(match[2], "base64");
  if (!b.length || b.length > 500000 || b.toString("base64") !== match[2])
    throw new HttpError(400, "Image must be valid and no larger than 500 KB.");
  try {
    const image = sharp(b, {
        limitInputPixels: 4096 * 4096,
        failOn: "warning",
      }),
      meta = await image.metadata();
    if (
      meta.format !== match[1] ||
      meta.width > 4096 ||
      meta.height > 4096 ||
      (meta.pages || 1) > 1
    )
      throw new Error("Unsupported image");
    const clean = await image
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
    return `data:image/webp;base64,${clean.toString("base64")}`;
  } catch {
    throw new HttpError(
      400,
      "Invalid image. Use a static JPEG, PNG, or WEBP up to 4096 x 4096 pixels.",
    );
  }
}
