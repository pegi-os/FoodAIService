const userService = require("../services/user.service");

exports.list = (req, res) => {
  const users = userService.list();
  res.json({ data: users });
};

exports.getById = (req, res) => {
  const id = Number(req.params.id);
  const user = userService.getById(id);
  if (!user) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ data: user });
};

