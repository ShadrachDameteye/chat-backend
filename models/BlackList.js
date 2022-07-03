const mongoose = require('mongoose');

const BlackListSchema = new mongoose.Schema({
  blocked_id: String,
  blocker_id: String,
  time: String,
  date: String,
});

const BlackList = mongoose.model('BlackList', BlackListSchema);

module.exports = BlackList;
