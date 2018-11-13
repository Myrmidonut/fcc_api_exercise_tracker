"use strict";

const express    = require('express')
const bodyParser = require('body-parser')
const cors       = require('cors')
const mongoose   = require('mongoose')

const app = express()

mongoose.connect(process.env.MLAB_URI);

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

// Schema
const userSchema = new mongoose.Schema({
  username: String,
  exercise: [{
    description: String,
    duration: Number,
    date: String
  }]
});

// model
const User = mongoose.model("User", userSchema);

app.post("/api/exercise/new-user", (req, res) => {
  const username = req.body.username;
  
  User.create({username: username}, (err, data) => {
    if (err) console.log(err);
    else {
      User.findOne({username: username}).select("username _id").exec((err, data) => {
        if (err) console.log(err);
        else {
          res.json(data);
        }
      });
    }
  });
});

app.post("/api/exercise/add", (req, res) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = "";
  
  if (req.body.date) date = req.body.date;
  else {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    date = currentDate.getFullYear() + "-" + month + "-" + currentDate.getDate();
  }
  
  const newData = {
    description: description,
    duration: duration,
    date: date
  };
  
  User.findByIdAndUpdate(userId, {$push: {exercise: newData}}, {new: true}, (err, data) => {
    if (err) console.log(err);
    else {
      res.json({
        "_id": data.id,
        "username": data.username,
        "description": data.exercise[data.exercise.length - 1].description,
        "duration": data.exercise[data.exercise.length - 1].duration,
        "date": data.exercise[data.exercise.length - 1].date
      })
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find().select("username _id").exec((err, data) => {
    if (err) console.log(err);
    else {
      res.json(data);
    }
  })
})

app.get("/api/exercise/log", (req, res) => {
  const id = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  let exercisesFromTo = undefined;
  let exercisesFromToLimit = undefined;
  
  if (from === "") from = undefined;
  if (to  === "") to = undefined;
  if (limit === "") limit = undefined;
  
  User.findById(id, (err, data) => {
    if (err) console.log(err);
    else {
      let exerciseCount = data.exercise.length;
      exercisesFromTo = data.exercise;
      
      if (from !== undefined && to !== undefined) {
        exercisesFromTo = data.exercise.filter(e => e.date >= from && e.date <= to);
      } else if (from !== undefined && to === undefined) {
        exercisesFromTo = data.exercise.filter(e => e.date >= from);
      } else if (from === undefined && to !== undefined) {
        exercisesFromTo = data.exercise.filter(e => e.date <= to);
      }
      
      if (limit !== undefined) {
        exercisesFromToLimit = exercisesFromTo.slice(0, limit);
        exerciseCount = limit;
      } else {
        exercisesFromToLimit = exercisesFromTo;
      }
      
      res.json({
        "_id": data.id,
        "username": data.username,
        "log": exercisesFromToLimit,
        "count": exerciseCount
      });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})