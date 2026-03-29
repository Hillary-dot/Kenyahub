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

// ============================================
// LOAD AND SAVE USERS
// ============================================
let users = [];
try {
  users = JSON.parse(fs.readFileSync("users.json"));
} catch {
  users = [];
}

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
}

// ============================================
// INCOMING SMS HANDLER
// Runs when someone texts your shortcode
// ============================================
app.post("/sms", async (req, res) => {
  const phone = req.body.from;
  const message = req.body.text.toUpperCase().trim();
  console.log("Incoming:", phone, message);

  // SUBSCRIBE TO TIPS
  if (message === "TIPS") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "TIPS" });
      saveUsers();
      console.log("Subscribed to TIPS:", phone);
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

  // SUBSCRIBE TO LOCAL JOBS
  if (message === "JOBS") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "JOBS" });
      saveUsers();
      console.log("Subscribed to JOBS:", phone);
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

  // SUBSCRIBE TO JOBS ABROAD
  if (message === "ABROAD") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "ABROAD" });
      saveUsers();
      console.log("Subscribed to ABROAD:", phone);
      await sms.send({
        to: [phone],
        message: "Welcome to KenyaHub Jobs Abroad! Get international job alerts daily. Cost: KES 20/msg. Text STOP to unsubscribe."
      });
    } else {
      await sms.send({
        to: [phone],
        message: "You are already subscribed to KenyaHub Jobs Abroad! Text STOP to unsubscribe anytime."
      });
    }
  }

  // SUBSCRIBE TO LOVE ADVICE
  if (message === "LOVE") {
    if (!users.find(u => u.phone === phone)) {
      users.push({ phone, service: "LOVE" });
      saveUsers();
      console.log("Subscribed to LOVE:", phone);
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

  // UNSUBSCRIBE
  if (message === "STOP") {
    const wasSubscribed = users.find(u => u.phone === phone);
    users = users.filter(u => u.phone !== phone);
    saveUsers();
    console.log("Unsubscribed:", phone);
    await sms.send({
      to: [phone],
      message: "You have been unsubscribed from KenyaHub. No more messages. Text TIPS, JOBS, ABROAD or LOVE to rejoin anytime."
    });
  }

  // UNKNOWN KEYWORD
  if (!["TIPS","JOBS","ABROAD","LOVE","STOP"].includes(message)) {
    await sms.send({
      to: [phone],
      message: "Welcome to KenyaHub! Text: TIPS for betting tips, JOBS for local jobs, ABROAD for international jobs, LOVE for relationship advice."
    });
  }

  res.send("OK");
});

// ============================================
// SEND DAILY BETTING TIPS TO ALL SUBSCRIBERS
// Visit: https://kenyahub.onrender.com/send/tips
// ============================================
app.get("/send/tips", async (req, res) => {
  const subscribers = users.filter(u => u.service === "TIPS");
  if (subscribers.length === 0) {
    return res.send("No TIPS subscribers yet!");
  }
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB TIPS: 1.Man City vs Arsenal: Over 2.5 Goals 2.Liverpool vs Chelsea: Home Win 3.Barcelona vs Real: BTTS. Good luck today!"
    });
  }
  console.log(`Tips sent to ${subscribers.length} subscribers`);
  res.send(`✅ Tips sent to ${subscribers.length} subscribers!`);
});

// ============================================
// SEND DAILY LOCAL JOBS TO ALL SUBSCRIBERS
// Visit: https://kenyahub.onrender.com/send/jobs
// ============================================
app.get("/send/jobs", async (req, res) => {
  const subscribers = users.filter(u => u.service === "JOBS");
  if (subscribers.length === 0) {
    return res.send("No JOBS subscribers yet!");
  }
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB JOBS: 1.Safaricom-Customer Care Nairobi 2.KCB-Teller Kisumu 3.NGO-Field Officer Mombasa. Deadline this week. Apply fast!"
    });
  }
  console.log(`Jobs sent to ${subscribers.length} subscribers`);
  res.send(`✅ Jobs sent to ${subscribers.length} subscribers!`);
});

// ============================================
// SEND INTERNATIONAL JOBS TO ALL SUBSCRIBERS
// Visit: https://kenyahub.onrender.com/send/abroad
// ============================================
app.get("/send/abroad", async (req, res) => {
  const subscribers = users.filter(u => u.service === "ABROAD");
  if (subscribers.length === 0) {
    return res.send("No ABROAD subscribers yet!");
  }
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB ABROAD: Germany-50 Nurses needed. Salary EUR 2800/mo. UAE-Drivers wanted. Salary KES 45000/mo+housing. Apply: kazimajuu.go.ke"
    });
  }
  console.log(`Abroad jobs sent to ${subscribers.length} subscribers`);
  res.send(`✅ Abroad jobs sent to ${subscribers.length} subscribers!`);
});

// ============================================
// SEND LOVE ADVICE TO ALL SUBSCRIBERS
// Visit: https://kenyahub.onrender.com/send/love
// ============================================
app.get("/send/love", async (req, res) => {
  const subscribers = users.filter(u => u.service === "LOVE");
  if (subscribers.length === 0) {
    return res.send("No LOVE subscribers yet!");
  }
  for (let user of subscribers) {
    await sms.send({
      to: [user.phone],
      message: "KENYAHUB LOVE: A partner who truly loves you will never make you feel like you are asking too much by wanting basic respect and honesty."
    });
  }
  console.log(`Love advice sent to ${subscribers.length} subscribers`);
  res.send(`✅ Love advice sent to ${subscribers.length} subscribers!`);
});

// ============================================
// SEE ALL YOUR SUBSCRIBERS
// Visit: https://kenyahub.onrender.com/subscribers
// ============================================
app.get("/subscribers", (req, res) => {
  const summary = {
    total: users.length,
    TIPS: users.filter(u => u.service === "TIPS").length,
    JOBS: users.filter(u => u.service === "JOBS").length,
    ABROAD: users.filter(u => u.service === "ABROAD").length,
    LOVE: users.filter(u => u.service === "LOVE").length,
    all_subscribers: users
  };
  res.json(summary);
});

// ============================================
// HEALTH CHECK
// Visit: https://kenyahub.onrender.com
// ============================================
app.get("/", (req, res) => {
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    services: ["TIPS", "JOBS", "ABROAD", "LOVE"],
    total_subscribers: users.length,
    time: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KenyaHub SMS Server running on port ${PORT}`);
  console.log(`Total subscribers loaded: ${users.length}`);
});
```

---

## 🎯 YOUR DAILY SENDING URLS

Once live, every morning just open these links in your browser:

| Service | URL to Visit |
|---|---|
| **Betting Tips** | https://kenyahub.onrender.com/send/tips |
| **Local Jobs** | https://kenyahub.onrender.com/send/jobs |
| **Jobs Abroad** | https://kenyahub.onrender.com/send/abroad |
| **Love Advice** | https://kenyahub.onrender.com/send/love |
| **See Subscribers** | https://kenyahub.onrender.com/subscribers |

---

## ✅ NEXT STEPS AFTER PASTING CODE
```
1. Paste code into GitHub server.js
2. Commit changes
3. Go to Render → Environment → Add:
   AT_API_KEY = [your key from AT]
   AT_USERNAME = sandbox
4. Create users.json file with just: []
5. Watch Render redeploy successfully
6. Test with simulator!