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

let users = [];
try {
  users = JSON.parse(fs.readFileSync("users.json"));
} catch {
  users = [];
}

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

app.post("/sms", async (req, res) => {
  const phone = req.body.from;
  const message = req.body.text.toUpperCase().trim();
  console.log("Incoming:", phone, message);

  if (message === "TIPS") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "TIPS" });
      saveUsers();
      await sms.send({
        to: [phone],
        message: "Welcome to KenyaHub Betting Tips! You will receive 3 match predictions daily. Cost: KES 20/msg. Text STOP to unsubscribe."
      });
    } else {
      await sms.send({
        to: [phone],
        message: "You are already subscribed to KenyaHub Tips! Text STOP to unsubscribe anytime."
      });
    }
  }

  if (message === "JOBS") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "JOBS" });
      saveUsers();
      await sms.send({
        to: [phone],
        message: "Welcome to KenyaHub Jobs! You will receive 5 job alerts daily. Cost: KES 15/msg. Text STOP to unsubscribe."
      });
    } else {
      await sms.send({
        to: [phone],
        message: "You are already subscribed to KenyaHub Jobs! Text STOP to unsubscribe anytime."
      });
    }
  }

  if (message === "ABROAD") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "ABROAD" });
      saveUsers();
      await sms.send({
        to: [phone],
        message: "Welcome to KenyaHub Jobs Abroad! Get international job alerts daily. Cost: KES 20/msg. Text STOP to unsubscribe."
      });
    } else {
      await sms.send({
        to: [phone],
        message: "You are already subscribed to KenyaHub Abroad! Text STOP to unsubscribe anytime."
      });
    }
  }

  if (message === "LOVE") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "LOVE" });
      saveUsers();
      await sms.send({
        to: [phone],
        message: "Welcome to KenyaHub Love! Daily relationship and marriage wisdom. Cost: KES 15/msg. Text STOP to unsubscribe."
      });
    } else {
      await sms.send({
        to: [phone],
        message: "You are already subscribed to KenyaHub Love! Text STOP to unsubscribe anytime."
      });
    }
  }

  if (message === "STOP") {
    users = users.filter(u => u.phone !== phone);
    saveUsers();
    await sms.send({
      to: [phone],
      message: "You have been unsubscribed from KenyaHub. Text TIPS, JOBS, ABROAD or LOVE to rejoin anytime."
    });
  }

  if (!["TIPS","JOBS","ABROAD","LOVE","STOP"].includes(message)) {
    await sms.send({
      to: [phone],
      message: "Welcome to KenyaHub! Text TIPS for betting, JOBS for local jobs, ABROAD for intl jobs, LOVE for relationship advice."
    });
  }

  res.send("OK");
});

app.get("/send/tips", async (req, res) => {
  const subscribers = users.filter(u => u.service === "TIPS");
  if (subscribers.length === 0) return res.send("No TIPS subscribers yet!");
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB TIPS: 1.Man City vs Arsenal: Over 2.5 2.Liverpool vs Chelsea: Home Win 3.Barcelona vs Real: BTTS. Good luck!"
    });
  }
  res.send(`Tips sent to ${subscribers.length} subscribers!`);
});

app.get("/send/jobs", async (req, res) => {
  const subscribers = users.filter(u => u.service === "JOBS");
  if (subscribers.length === 0) return res.send("No JOBS subscribers yet!");
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB JOBS: 1.Safaricom-Customer Care Nairobi 2.KCB-Teller Kisumu 3.NGO-Field Officer Mombasa. Apply fast!"
    });
  }
  res.send(`Jobs sent to ${subscribers.length} subscribers!`);
});

app.get("/send/abroad", async (req, res) => {
  const subscribers = users.filter(u => u.service === "ABROAD");
  if (subscribers.length === 0) return res.send("No ABROAD subscribers yet!");
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB ABROAD: Germany-50 Nurses EUR 2800/mo. UAE-Drivers KES 45000/mo+housing. Apply: kazimajuu.go.ke"
    });
  }
  res.send(`Abroad jobs sent to ${subscribers.length} subscribers!`);
});

app.get("/send/love", async (req, res) => {
  const subscribers = users.filter(u => u.service === "LOVE");
  if (subscribers.length === 0) return res.send("No LOVE subscribers yet!");
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB LOVE: A partner who truly loves you will never make you feel you are asking too much by wanting basic respect and honesty."
    });
  }
  res.send(`Love advice sent to ${subscribers.length} subscribers!`);
});

app.get("/subscribers", (req, res) => {
  res.json({
    total: users.length,
    TIPS: users.filter(u => u.service === "TIPS").length,
    JOBS: users.filter(u => u.service === "JOBS").length,
    ABROAD: users.filter(u => u.service === "ABROAD").length,
    LOVE: users.filter(u => u.service === "LOVE").length
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    services: ["TIPS", "JOBS", "ABROAD", "LOVE"],
    total_subscribers: users.length,
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KenyaHub SMS Server running on port ${PORT}`);
  console.log(`Total subscribers loaded: ${users.length}`);
});
