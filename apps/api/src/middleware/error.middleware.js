export function errorMiddleware(err, _req, res, _next) {
  console.error(err);

  return res.status(500).json({
    success: false,
    error: err.message || "Server error",
  });
}
