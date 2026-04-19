require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const Africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

const sms = Africastalking.SMS;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("kenyahub");
    console.log("✅ Database connected!");
  } catch(e) {
    console.log("❌ Database error:", e);
  }
}

connectDB();

// Save subscriber to database
async function saveSubscriber(phone, service) {
  try {
    const subscribers = db.collection("subscribers");
    await subscribers.updateOne(
      { phone },
      { $set: { phone, service, date: new Date() } },
      { upsert: true }
    );
    console.log(`Saved subscriber: ${phone} → ${service}`);
  } catch(e) {
    console.log("Save error:", e);
  }
}

// Remove subscriber from database
async function removeSubscriber(phone) {
  try {
    const subscribers = db.collection("subscribers");
    await subscribers.deleteOne({ phone });
    console.log(`Removed subscriber: ${phone}`);
  } catch(e) {
    console.log("Remove error:", e);
  }
}

// Get all subscribers for a service
async function getSubscribers(service) {
  try {
    const subscribers = db.collection("subscribers");
    return await subscribers.find({ service }).toArray();
  } catch(e) {
    console.log("Get error:", e);
    return [];
  }
}

// INCOMING SMS HANDLER
app.post("/sms", async (req, res) => {
  const phone = req.body.from;
  const message = (req.body.text || "").toUpperCase().trim();
  console.log("Incoming:", phone, message);

  if (message === "JOBS") {
    await saveSubscriber(phone, "JOBS");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Jobs! You will receive 5 job alerts daily. Cost: KSH 10/msg. Text STOP to unsubscribe anytime."
    });
  }

  if (message === "TIPS") {
    await saveSubscriber(phone, "TIPS");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Tips! You will receive 3 match predictions daily. Cost: KSH 10/msg. Text STOP to unsubscribe anytime."
    });
  }

  if (message === "ABROAD") {
    await saveSubscriber(phone, "ABROAD");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Jobs Abroad! Get international job alerts daily. Cost: KSH 10/msg. Text STOP to unsubscribe anytime."
    });
  }

  if (message === "LOVE") {
    await saveSubscriber(phone, "LOVE");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Love! Daily relationship wisdom. Cost: KSH 10/msg. Text STOP to unsubscribe anytime."
    });
  }

  if (message === "STOP") {
    await removeSubscriber(phone);
    await sms.send({
      to: [phone],
      from: "40024",
      message: "You have been unsubscribed from KenyaHub. Text JOBS, TIPS, ABROAD or LOVE to rejoin anytime. Thank you!"
    });
  }

  res.send("OK");
});

// SEND DAILY JOBS
app.get("/send/jobs", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB JOBS: 1.Safaricom-Customer Care Nairobi 2.KCB-Teller Kisumu 3.NGO-Field Officer Mombasa. Apply fast!";
  const subscribers = await getSubscribers("JOBS");
  if (subscribers.length === 0) {
    return res.send("No JOBS subscribers yet!");
  }
  const numbers = subscribers.map(s => s.phone);
  await sms.send({
    to: numbers,
    from: "40024",
    message: msg
  });
  console.log(`Jobs sent to ${numbers.length} subscribers`);
  res.send(`✅ Jobs sent to ${numbers.length} subscribers!`);
});

// SEND DAILY TIPS
app.get("/send/tips", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB TIPS: 1.Man City vs Arsenal: Over 2.5 2.Liverpool vs Chelsea: Home Win 3.Barcelona vs Real: BTTS. Good luck!";
  const subscribers = await getSubscribers("TIPS");
  if (subscribers.length === 0) {
    return res.send("No TIPS subscribers yet!");
  }
  const numbers = subscribers.map(s => s.phone);
  await sms.send({
    to: numbers,
    from: "40024",
    message: msg
  });
  res.send(`✅ Tips sent to ${numbers.length} subscribers!`);
});

// SEND DAILY ABROAD
app.get("/send/abroad", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB ABROAD: Germany-50 Nurses EUR 2800/mo. UAE-Drivers KES 45000+housing. Apply: kazimajuu.go.ke";
  const subscribers = await getSubscribers("ABROAD");
  if (subscribers.length === 0) {
    return res.send("No ABROAD subscribers yet!");
  }
  const numbers = subscribers.map(s => s.phone);
  await sms.send({
    to: numbers,
    from: "40024",
    message: msg
  });
  res.send(`✅ Abroad sent to ${numbers.length} subscribers!`);
});

// SEND DAILY LOVE
app.get("/send/love", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB LOVE: A partner who truly loves you will never make you feel you are asking too much by wanting basic respect.";
  const subscribers = await getSubscribers("LOVE");
  if (subscribers.length === 0) {
    return res.send("No LOVE subscribers yet!");
  }
  const numbers = subscribers.map(s => s.phone);
  await sms.send({
    to: numbers,
    from: "40024",
    message: msg
  });
  res.send(`✅ Love sent to ${numbers.length} subscribers!`);
});

// SEE ALL SUBSCRIBERS
app.get("/subscribers", async (req, res) => {
  const jobs = await getSubscribers("JOBS");
  const tips = await getSubscribers("TIPS");
  const abroad = await getSubscribers("ABROAD");
  const love = await getSubscribers("LOVE");
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    services: ["TIPS", "JOBS", "ABROAD", "LOVE"],
    total_subscribers: jobs.length + tips.length + abroad.length + love.length,
    JOBS: jobs.length,
    TIPS: tips.length,
    ABROAD: abroad.length,
    LOVE: love.length,
    time: new Date().toISOString()
  });
});

// ADD SUBSCRIBER MANUALLY
app.get("/add/:phone/:service", async (req, res) => {
  const { phone, service } = req.params;
  await saveSubscriber(phone, service.toUpperCase());
  res.send(`✅ Added ${phone} to ${service}!`);
});

// HOME
app.get("/", (req, res) => {
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    services: ["TIPS", "JOBS", "ABROAD", "LOVE"],
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KenyaHub SMS Server running on port ${PORT}`);
});
