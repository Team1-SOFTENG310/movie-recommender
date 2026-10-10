import express from "express";
import cors from "cors";
import {fileURLToPath} from "node:url";
import path from "node:path"
import dotenv from "dotenv";
import movieRoutes from "./routes/movies.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({path: path.join(__dirname, "../.env")});

const app = express();
app.disable("x-powered-by");
const PORT = process.env.BACKEND_PORT || 5000;

app.use(cors({ origin: `http://localhost:${process.env.VITE_FRONTEND_PORT}`}));
app.use(express.json());

// Routes
app.use("/api/movies", movieRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
