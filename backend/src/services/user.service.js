const userModel = require("../models/user.model");

exports.list = () => userModel.list();
exports.getById = (id) => userModel.getById(id);

