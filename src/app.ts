import express from 'express'
import cors from 'cors'
import "dotenv/config"; 
import serverRoute from './routes/server.route'
import { globalErrorHandler } from './middleware/err.middleware';

const app = express()

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3030;

app.use("/api/v1", serverRoute)
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})