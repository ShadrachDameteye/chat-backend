const mongoose = require('mongoose');
require('dotenv').config();
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@cluster0.h7wyn.mongodb.net/zibrachat?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true,
    }
  )
  .then(() => console.log('Database connected!'))
  .catch((err) => console.log(err));
