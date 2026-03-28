const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Load users
let users = [];

try {
  users = JSON.parse(fs.readFileSync("users.json"));
} catch {
  users = [];
}

// Save users
function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

// SMS Callback
app.post("/sms", (req, res) => {
  const phone = req.body.from;
  const message = req.body.text.toUpperCase();

  console.log("Incoming:", phone, message);

  if (message === "JOIN") {
    if (!users.includes(phone)) {
      users.push(phone);
      saveUsers();
      console.log("Subscribed:", phone);
    }
  }

  if (message === "STOP") {
    users = users.filter(u => u !== phone);
    saveUsers();
    console.log("Unsubscribed:", phone);
  }

  res.send("OK");
});

// Send SMS manually (test)
app.get("/send", (req, res) => {
  console.log("Users:", users);
  res.send(users);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});