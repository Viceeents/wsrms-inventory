import { HttpError } from "./errorMiddleware.js";
export default function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return next(
        new HttpError(
          400,
          result.error.issues
            .map((i) => `${i.path.join(".") || "Request"}: ${i.message}`)
            .join("; "),
        ),
      );
    req.body = result.data;
    next();
  };
}
