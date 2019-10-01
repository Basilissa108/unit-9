// import sequelize and assign it to the variable Sequelize
const Sequelize = require("sequelize");

// instantiate sequelize
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "fsjstd-restapi.db"
});
// create new object with sequelize (db instance), Sequelize (dependency), and an emmpty models object and assign it to variable db
const db = {
  sequelize,
  Sequelize,
  models: {},
};
// require User model from user.js file and add it to the models object of the db object
db.models.Users = require("./models/user.js")(sequelize, Sequelize);
// require Courses model from course.js file and add it to the models object of the db object
db.models.Courses = require("./models/course.js")(sequelize, Sequelize);
// declare relationship between Courses and Users
db.models.Courses.belongsTo(db.models.Users, { foreignKey: "userId" });
// declare relationship between Users and Courses
db.models.Users.hasMany(db.models.Courses, { foreignKey: "userId" });

// define exports
module.exports = db;