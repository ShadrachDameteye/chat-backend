const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');
const Message = require('./models/Message');
const rooms = ['general', 'tech', 'finance', 'crypto'];
const cors = require('cors');
const BlackList = require('./models/BlackList');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes);
require('./connection');

const server = require('http').createServer(app);
const PORT = 5001;
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

async function getLastMessagesFromRoom(room) {
  let roomMessages = await Message.aggregate([
    { $match: { to: room } },
    { $group: { _id: '$date', messagesByDate: { $push: '$$ROOT' } } },
  ]);
  return roomMessages;
}

function sortRoomMessagesByDate(messages) {
  return messages.sort(function (a, b) {
    let date1 = a._id.split('/');
    let date2 = b._id.split('/');

    date1 = date1[2] + date1[0] + date1[1];
    date2 = date2[2] + date2[0] + date2[1];

    return date1 < date2 ? -1 : 1;
  });
}

// socket connection

io.on('connection', (socket) => {
  socket.on('new-user', async () => {
    const members = await User.find();
    io.emit('new-user', members);
  });

  socket.on('join-room', async (newRoom, previousRoom) => {
    socket.join(newRoom);
    socket.leave(previousRoom);
    let roomMessages = await getLastMessagesFromRoom(newRoom);
    roomMessages = sortRoomMessagesByDate(roomMessages);
    socket.emit('room-messages', roomMessages);
  });

  socket.on('message-room', async (room, content, sender, time, date) => {
    const newMessage = await Message.create({
      content,
      from: sender,
      time,
      date,
      to: room,
    });
    let roomMessages = await getLastMessagesFromRoom(room);
    roomMessages = sortRoomMessagesByDate(roomMessages);
    // sending message to room
    io.to(room).emit('room-messages', roomMessages);
    socket.broadcast.emit('notifications', room);
  });

  app.delete('/logout', async (req, res) => {
    try {
      const { _id, newMessages } = req.body;
      const user = await User.findById(_id);
      user.status = 'offline';
      user.newMessages = newMessages;
      await user.save();
      const members = await User.find();
      socket.broadcast.emit('new-user', members);
      res.status(200).send();
    } catch (e) {
      console.log(e);
      res.status(400).send();
    }
  });
});

app.get('/rooms', (req, res) => {
  res.json(rooms);
});

app.post('/block', async (req, res) => {
  console.log('user to be blocked :--' + req.body.blocked_id);
  console.log('user who is blocking :--' + req.body.blocker_id);
  try {
    const { blocked_id, blocker_id } = req.body;
    // const block = await BlackList.create({ blocked_id, blocker_id });

    const user = await User.findById(blocker_id);
    // user.blocklist = blocked_id;
    // console.log(user.blockedby);
    console.log(user.blockedby);
    user.blockedby.push(blocker_id);
    await user.save();

    // await block.save();
    console.log('successfully blocked');
    console.log(user);
    res.status(200).json(user);
  } catch (e) {
    console.log('failed to block');
    console.log(e.message);
    res.status(400).json(e.message);
  }
});

app.post('/unblock', async (req, res) => {
  try {
    const { blocked_id, blocker_id } = req.body;
    // const block = await BlackList.deleteOne({ blocked_id, blocker_id });
    const user = await User.findById(blocker_id);
    var arr = user.blockedby;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === 5) {
        arr.splice(i, 1);
      }
    }
    console.log(arr);
    user.blockedby = arr;
    await user.save();
    console.log('successfully unblocked');
    res.status(200).json(user);
  } catch (e) {
    console.log(e);
    res.status(400).json(e.message);
  }
});

app.post('/check_block_status', async (req, res) => {
  try {
    const { blocked_id, blocker_id } = req.body;
    const block = await BlackList.findOne({ blocked_id, blocker_id });
    if (block) {
      // console.log('yes');
    }
    res.status(200).json(block);
  } catch (e) {
    console.log(e);
    res.status(400).json(e.message);
  }
});

server.listen(PORT, () => {
  console.log('listening to port', PORT);
});
