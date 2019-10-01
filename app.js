"use strict";

// load modules
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const auth = require("basic-auth");
const db = require("./db/index.js");
const { Users, Courses } = db.models;

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === "true";

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan("dev"));
// make app use bodyparser for parsing application/json
app.use(bodyParser.json()); 
// make app use bodyparser for parsing application/xwww-
app.use(bodyParser.urlencoded({ extended: true })); 

// setup authentication middleware
const authenticateUser = async (req, res, next) => {
  // get credentials from request using basic-auth
  const credentials = auth(req);
  // check if credentials exists
  if (credentials) {
    // get email from credentials object and assign it to the variable email
    const email = credentials.name;
    // get password from credentials object and assign it to the variable password
    const password = credentials.pass;
    // wrapping the code in a try catch block to handle errors
    try {
      // find user by email
      const user = await Users.findOne({
        where : {
          emailAddress: email
        }
      });
      // check if a matching user was found
      if (user) {
        // check provided password against the hash stored in the database using bcrypt
        if (bcrypt.compareSync(password, user.password)) {
          // set user on request
          req.user = user;
          // call next function
          next();
         } else {
          // send status 401 
          res.sendStatus(401);
         }
      } else {
        // construct a new error
        const err = new Error(`No user found with the email ${email}`);
        // set status to 403
        res.status(403);
        // call global error handler
        next(err);
      }
    } catch(err) {
      // call global error handler
      next(err)
    }
  } else {
    // send status 401 as no credentials were provided
    res.sendStatus(401);
  }
};

// setup a friendly greeting for the root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the REST API project!",
  });
});

//GET /api/users 200 - Returns the currently authenticated user
app.get("/api/users", authenticateUser, (req, res) => {
  // create a new user object and omit password, createdAt, and updatedAt properties
  const user = {
    "id": req.user.id,
    "firstName": req.user.firstName,
    "lastName": req.user.lastName,
    "emailAddress": req.user.emailAddress
  };
  // set status to 200 and send the user object
  res.status(200).json(user);
});

//POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
app.post("/api/users", async (req, res, next) => {
  // get firstName, lastName, emailAddress, and password from request body
  const { firstName, lastName, emailAddress, password } = req.body;
  // check if values are provided, if not call global error handler with an error
  if (firstName && lastName && emailAddress && password) {
    // try getting a user with the provided email address from the database
    const user = await Users.findOne({ where: { emailAddress: emailAddress } });
    // check if a user was found, if so return an error, else proceed with creating a new user
    if (user) {
      // construct a new error
      const err = new Error(`User with email ${emailAddress} already exists!`);
      // set status to 409
      res.status(409);
      // call global error handler
      next(err);
    } else {
      // hash the password using bcrypt
      const hash = bcrypt.hashSync(password, 10);
      // create a temporary user object and assign it to the variable temp
      const temp = {
        firstName: firstName,
        lastName: lastName,
        emailAddress: emailAddress,
        password: hash
      };
      // wrapping the code in a try catch block to handle errors
      try {
        // create a user in the Users schema
        await Users.create(temp);
        // set location header to "/"
        res.location("/");
        // send status 201
        res.sendStatus(201);
      } catch (err) {
        // set status code to 400
        res.status(400);
        // call the global error handler
        next(err);
      }
    }
  } else {
    const err = new Error("Invalid input");
    res.status(400);
    next(err);
  }
});

//GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
app.get("/api/courses", async (req, res, next) => {
  // wrapping the code in a try catch block to handle errors
  try {
    // create a variable for courses
    const courses = await Courses.findAll({
      attributes: [ "id", "title", "description", "estimatedTime", "materialsNeeded", "userId" ],
      include: [
        {
          model: Users,
          attributes: [ "id", "firstName", "lastName", "emailAddress" ]
        },
      ]
    });
    // set response status to 200 and send courses as json
    res.status(200).json(courses);
  } catch(err) {
    // call global error handler
    next(err)
  }
});

//GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
app.get("/api/courses/:id", async (req, res, next) => {
  // wrapping the code in a try catch block to handle errors
  try {
    // find course by private key (id provided by request)
    const course = await Courses.findByPk(req.params.id, {
      attributes: [ "id", "title", "description", "estimatedTime", "materialsNeeded", "userId" ],
      include: [
        {
          model: Users,
          attributes: [ "id", "firstName", "lastName", "emailAddress" ]
        },
      ]
    });
    // check if a matching course was found
    if (course) {
      // set response status to 200 and send course as json
      res.status(200).json(course);
    } else {
      // construct a new error
      const err = new Error(`No course found with the id ${req.params.id}`);
      // set status to 404
      res.status(404);
      // call global error handler
      next(err);
    }
  } catch(err) {
    // call global error handler
    next(err)
  }
});

//POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
app.post("/api/courses", authenticateUser, async (req, res, next) => {
  // get title and description from request body
  const { title, description, estimatedTime, materialsNeeded } = req.body;
  // check if values are provided, if not call global error handler with an error
  if (title && description) {
    // create a temporary course object and assign it to the variable temp
    const temp = {
      userId: req.user.id,
      title: title,
      description: description,
      estimatedTime: estimatedTime,
      materialsNeeded: materialsNeeded
    };
    try {
      // create a course in the Courses schema
      const course = await Courses.create(temp);
      // set location header to the URI of the course
      res.location(`/api/courses/${course.id}`);
      // send a 201 status
      res.sendStatus(201);
    } catch (err) {
      // set status code to 400
      res.status(400);
      // call global error handler
      next(err);
    }
  } else {
    // construct new error
    const err = new Error("Invalid input");
    // set status to 400
    res.status(400);
    // call global error handler
    next(err);
  }
});

//PUT /api/courses/:id 204 - Updates a course and returns no content
app.put("/api/courses/:id", authenticateUser, async (req, res, next) => {
  // get title and description from request body
  const { title, description, estimatedTime, materialsNeeded  } = req.body;
  // check if values are provided, if not call global error handler with an error
  if (title && description) {
    // construct a temporary course object and assign it to the variable temp
    const temp = {
      userId: req.user.id,
      title: title,
      description: description,
      estimatedTime: estimatedTime,
      materialsNeeded: materialsNeeded
    };
    // wrapping the code in a try catch block to handle errors
    try {
      // get course by provided id
      const course = await Courses.findByPk(req.params.id);
      // check if course belongs to authenticated user, if so delete the course otherwise return a 403 status
      if (course.userId === req.user.id) {
        // wrapping the code in a try catch block to handle errors
        try {
          // call Courses.update with the new values and use the supplied course id to find the record in the database
          await Courses.update(
            temp,
            { where: { id: req.params.id }}
          );
          // send a status 204
          res.status(204).end();
        } catch (err) {
          // set status code to 400
          res.status(400);
          // call the global error handler
          next(err);
        }
      } else {
        // send a 403 status
        res.sendStatus(403);
      }
    } catch (err) {
      // call the global error handler
      next(err);
    }
  } else {
    // construct a new error
    const err = new Error("Invalid input");
    // set the status to 400
    res.status(400);
    // call global error handler
    next(err);
  }
});

//DELETE /api/courses/:id 204 - Deletes a course and returns no content
app.delete("/api/courses/:id", authenticateUser, async (req, res, next) => {
  // wrapping the code in a try catch block to handle errors
  try {
    // get course by provided id
    const course = await Courses.findByPk(req.params.id);
    // check if course belongs to authenticated user, if so delete the course otherwise return a 403 status
    if (course.userId === req.user.id) {
      // wrapping the code in a try catch block to handle errors
      try {
        // delete the course with the id matching req.params.id
        await Courses.destroy({ where: { id: req.params.id }});
        // send the status 204
        res.status(204).end();
      } catch (error) {
        // call global error handler
        next(error);
      }
    } else {
      // send a 403 status
      res.sendStatus(403);
    }
  } catch (err) {
    // call the global error handler
    next(err);
  }
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: "Route Not Found",
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  // log the error to the console if enableGlobalErrorLogging is true
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }
  // check if the status is 200, if so set it to 500
  if (res.statusCode === 200 || res.statusCode === 201) {
    res.status(500);
  }
  // send the error message and the error as json
  res.json({
    message: err.message,
    error: { err },
  });
});

// sync db instance
(async () => {
  db.sequelize.sync()
    .then(() => console.log("Successfully synced with database"))
    .catch(error => console.log(error));
})();

// set our port
app.set("port", process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get("port"), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
