import dotenv from 'dotenv';
import { app } from './app.js';

// Load environment variables
dotenv.config({
  path: './.env',
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`⚙️  Server is running at port : ${PORT}`);
});
