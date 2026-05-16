// In-memory mock model (replace with DB later)
const USERS = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

exports.list = () => USERS;
exports.getById = (id) => USERS.find((u) => Number(u.id) === Number(id));

