export function notFoundMiddleware(_req, res) {
  return res.status(404).json({
    success: false,
    error: "Route not found",
  });
}
