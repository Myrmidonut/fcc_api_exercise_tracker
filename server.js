const express    = require('express')
const bodyParser = require('body-parser')
const cors       = require('cors')
const mongoose   = require('mongoose')

const app = express()

//mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
mongoose.connect("mongodb://fred:fred1234@ds227481.mlab.com:27481/fcc_exercise_tracker");

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/*
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})
*/

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
  exercise: [
    {
      description: String,
      duration: Number,
      date: String
    }
  ]
});

// model
const User = mongoose.model("User", userSchema);

// DONE
// POST username 
// to /api/exercise/new-user
// return object with username and _id
app.post("/api/exercise/new-user", function(req, res) {
  let username = req.body.username;
  
  User.create({username: username}, function(err, data) {
  //   User.create({username: username, exercise: [{description: null, duration: null, date: null}] }, function(err, data) {
    if (err) console.log(err);
    else {
      User.findOne({username: username}).select("username _id").exec(function(err, data) {
        if (err) console.log(err);
        else 
          res.json(data);
      });
    }
  });
});

// DONE
// POST exercise with: userId(_id), description, duration, and optionally date
// empty date is replaced with current date
// to /api/exercise/add
// return object with all user data and only the added exercise data
app.post("/api/exercise/add", function(req, res) {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = "";
  
  if (req.body.date) date = req.body.date;
  else {
    let currentDate = new Date();
    let month = currentDate.getMonth() + 1;
    date = currentDate.getFullYear() + "-" + month + "-" + currentDate.getDate();
  }
  
  let newData = {description: description, duration: duration, date: date};
  
  User.findByIdAndUpdate(userId, {$push: {exercise: newData}}, {new: true}, function(err, data) {
    if (err) console.log(err);
    else res.json({"_id": data.id, "username": data.username, "exercise": newData});
  });
});

// DONE
// GET
// to /api/exercise/users
// return array of all users with objects with username and _id
app.get("/api/exercise/users", function(req, res) {
  User.find().select("username _id").exec(function(err, data) {
    if (err) console.log(err);
    else res.json(data);
  })
})

// DONE
// GET
// to /api/exercise/log
// /api/exercise/log?{userId}[&from][&to][&limit]
// return object with all data and exercise counter
// return exercises from ... to ... and limit to ... (Date format yyyy-mm-dd, limit = int)
// "/api/exercise/log?:id(&:from)?(&:to)?(&:limit)?"
// https://fcc-exercise-tracker-fred.glitch.me/api/exercise/log?userId=5b40f6de02d0e61805ff146c&from=2014-1-1&to=2018-12-12&limit=100
app.get("/api/exercise/log", function(req, res) {
  let id = req.query.userId;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  let exercisesFromTo = undefined;
  let exercisesFromToLimit = undefined;

  User.findById(id, function(err, data) {
    if (err) console.log(err);
    else {
      let exerciseCount = data.exercise.length;
      exercisesFromTo = data.exercise;
      
      if (from && to) {
        exercisesFromTo = data.exercise.filter(function(e) {
          return (e.date >= from && e.date <= to);
        });
      } else if (from && !to) {
        exercisesFromTo = data.exercise.filter(function(e) {
          return e.date >= from;
        });
      } else if (!from && to) {
        exercisesFromTo = data.exercise.filter(function(e) {
          return e.date <= to;
        });
      }
      
      if (limit) {
        exercisesFromToLimit = exercisesFromTo.slice(0, limit);
      } else {
        exercisesFromToLimit = exercisesFromTo;
      }

      res.json({"_id": data.id, "username": data.username, "exercises": exercisesFromToLimit, "Total Exercises": exerciseCount});
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})