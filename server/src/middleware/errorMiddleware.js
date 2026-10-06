export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export default function errorMiddleware(error, req, res, next) {
  if (error.status)
    return res.status(error.status).json({
      message: error.message,
    });
  if (["23505", "23503", "23514"].includes(error.code))
    return res.status(409).json({
      message: "This record already exists or conflicts with another record.",
    });
  if (["22P02", "22003"].includes(error.code))
    return res
      .status(400)
      .json({ message: "Invalid record identifier or numeric value." });
  if (error.type === "entity.parse.failed")
    return res.status(400).json({
      message: "Invalid JSON request.",
    });
  console.error(error);
  res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
}
