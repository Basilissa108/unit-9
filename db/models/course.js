// define exports with the course model and appropriate data types
module.exports = (sequelize, Sequelize) => {
    return sequelize.define("Courses", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title:  {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        description:  {
            type: Sequelize.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        estimatedTime:  {
            type: Sequelize.STRING,
            allowNull: true
        },
        materialsNeeded:  {
            type: Sequelize.STRING,
            allowNull: true
        }
    });
};