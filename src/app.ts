import express from 'express'
import cors from 'cors'
import "dotenv/config"; 

const app = express()

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3030;

app.get("/ping", (req, res) => {
  try {
    res.send("pong");
  } catch (err) {
    console.error("Ping error:", err);
    res.status(500).send("Server error");
  }
});

// Global error handler (add at the end, before app.listen)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error:", err);
  if (!res.headersSent) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})