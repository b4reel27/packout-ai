import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`PackOut AI API running on port ${PORT}`);
});
