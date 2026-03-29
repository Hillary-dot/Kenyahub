require("dotenv").config();

const express = require("express");
const fs = require("fs");

const Africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

const sms = Africastalking.SMS;

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
app.post("/sms", async (req, res) => {
  const phone = req.body.from;
  const message = req.body.text.toUpperCase();

  console.log("Incoming:", phone, message);

  if (message === "JOIN") {
    if (!users.includes(phone)) {
      users.push(phone);
      saveUsers();

      console.log("Subscribed:", phone);

      // SEND CONFIRMATION SMS
      await sms.send({
        to: phone,
        message: "✅ You are subscribed! You will receive daily tips."
      });
    }
  }

  if (message === "STOP") {
    users = users.filter(u => u !== phone);
    saveUsers();

    console.log("Unsubscribed:", phone);

    await sms.send({
      to: phone,
      message: "❌ You have unsubscribed."
    });
  }

  res.send("OK");
});

// Send SMS to all users
app.get("/send", async (req, res) => {
  for (let phone of users) {
    await sms.send({
      to: phone,
      message: "🔥 Today's tip: Always stay consistent."
    });
  }

  res.send("Messages sent!");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});