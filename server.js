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

// MongoDB
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("kenyahub");
    console.log("✅ Database connected!");
  } catch(e) {
    console.log("❌ Database error:", e.message);
  }
}
connectDB();

async function saveSubscriber(phone, service) {
  try {
    await db.collection("subscribers").updateOne(
      { phone },
      { $set: { phone, service, date: new Date() } },
      { upsert: true }
    );
    console.log(`✅ Saved: ${phone} → ${service}`);
  } catch(e) {
    console.log("❌ Save error:", e.message);
  }
}

async function removeSubscriber(phone) {
  try {
    await db.collection("subscribers").deleteOne({ phone });
    console.log(`🔴 Removed: ${phone}`);
  } catch(e) {
    console.log("❌ Remove error:", e.message);
  }
}

async function getSubscribers(service) {
  try {
    return await db.collection("subscribers").find({ service }).toArray();
  } catch(e) {
    return [];
  }
}

// ============================================
// ROUTE 1 — INCOMING SMS
// Called when someone texts your shortcode
// ============================================
app.post("/sms", async (req, res) => {
  console.log("📩 SMS received:", JSON.stringify(req.body));
  
  const phone = req.body.from || req.body.phoneNumber || "";
  const message = (req.body.text || req.body.keyword || "").toUpperCase().trim();
  
  console.log(`From: ${phone} | Message: ${message}`);

  if (message === "JOBS") {
    await saveSubscriber(phone, "JOBS");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Jobs! You will receive 5 job alerts daily. Cost: KSH 10/msg. Text STOP to unsubscribe."
    });
  }
  else if (message === "TIPS") {
    await saveSubscriber(phone, "TIPS");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Tips! 3 match predictions daily. Cost: KSH 10/msg. Text STOP to unsubscribe."
    });
  }
  else if (message === "ABROAD") {
    await saveSubscriber(phone, "ABROAD");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Abroad! International job alerts daily. Cost: KSH 10/msg. Text STOP to unsubscribe."
    });
  }
  else if (message === "LOVE") {
    await saveSubscriber(phone, "LOVE");
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub Love! Daily relationship wisdom. Cost: KSH 10/msg. Text STOP to unsubscribe."
    });
  }
  else if (message === "STOP") {
    await removeSubscriber(phone);
    await sms.send({
      to: [phone],
      from: "40024",
      message: "You have been unsubscribed from KenyaHub. Text JOBS, TIPS, ABROAD or LOVE to rejoin anytime."
    });
  }
  else {
    await sms.send({
      to: [phone],
      from: "40024",
      message: "Welcome to KenyaHub! Text JOBS for local jobs, TIPS for betting tips, ABROAD for intl jobs, LOVE for relationship advice."
    });
  }

  res.send("OK");
});

// ============================================
// ROUTE 2 — SUBSCRIPTION NOTIFICATION
// Called by AT when someone subscribes
// via Premium SMS subscription event
// ============================================
app.post("/subscription", async (req, res) => {
  console.log("🔔 Subscription event:", JSON.stringify(req.body));

  const phone = req.body.phoneNumber || req.body.from || "";
  const keyword = (req.body.keyword || "").toUpperCase().trim();
  const updateType = req.body.updateType || "";

  console.log(`Phone: ${phone} | Keyword: ${keyword} | Type: ${updateType}`);

  if (updateType === "addition" || updateType === "") {
    if (keyword) {
      await saveSubscriber(phone, keyword);
      console.log(`✅ Auto-subscribed: ${phone} to ${keyword}`);
    }
  } else if (updateType === "deletion") {
    await removeSubscriber(phone);
    console.log(`🔴 Auto-unsubscribed: ${phone}`);
  }

  res.sendStatus(200);
});

// ============================================
// ROUTE 3 — DELIVERY REPORT
// ============================================
app.post("/delivery", (req, res) => {
  console.log("📬 Delivery:", req.body.status, req.body.phoneNumber);
  res.sendStatus(200);
});

// ============================================
// SEND DAILY MESSAGES
// ============================================
app.get("/send/jobs", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB JOBS: 1.Safaricom-Customer Care Nairobi 2.KCB-Teller Kisumu 3.NGO-Field Officer Mombasa. Apply fast!";
  const subscribers = await getSubscribers("JOBS");
  if (subscribers.length === 0) return res.send("No JOBS subscribers yet!");
  const numbers = subscribers.map(s => s.phone);
  await sms.send({ to: numbers, from: "40024", message: msg });
  console.log(`📤 Jobs sent to ${numbers.length} subscribers`);
  res.send(`✅ Jobs sent to ${numbers.length} subscribers!`);
});

app.get("/send/tips", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB TIPS: 1.Man City vs Arsenal: Over 2.5 2.Liverpool vs Chelsea: Home Win 3.Barcelona vs Real: BTTS. Good luck!";
  const subscribers = await getSubscribers("TIPS");
  if (subscribers.length === 0) return res.send("No TIPS subscribers yet!");
  const numbers = subscribers.map(s => s.phone);
  await sms.send({ to: numbers, from: "40024", message: msg });
  res.send(`✅ Tips sent to ${numbers.length} subscribers!`);
});

app.get("/send/abroad", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB ABROAD: Germany-50 Nurses EUR 2800/mo. UAE-Drivers KES 45000+housing. Apply: kazimajuu.go.ke";
  const subscribers = await getSubscribers("ABROAD");
  if (subscribers.length === 0) return res.send("No ABROAD subscribers yet!");
  const numbers = subscribers.map(s => s.phone);
  await sms.send({ to: numbers, from: "40024", message: msg });
  res.send(`✅ Abroad sent to ${numbers.length} subscribers!`);
});

app.get("/send/love", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB LOVE: A partner who truly loves you will never make you feel you are asking too much by wanting basic respect.";
  const subscribers = await getSubscribers("LOVE");
  if (subscribers.length === 0) return res.send("No LOVE subscribers yet!");
  const numbers = subscribers.map(s => s.phone);
  await sms.send({ to: numbers, from: "40024", message: msg });
  res.send(`✅ Love sent to ${numbers.length} subscribers!`);
});

// ============================================
// VIEW SUBSCRIBERS
// ============================================
app.get("/subscribers", async (req, res) => {
  const jobs = await getSubscribers("JOBS");
  const tips = await getSubscribers("TIPS");
  const abroad = await getSubscribers("ABROAD");
  const love = await getSubscribers("LOVE");
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    total: jobs.length + tips.length + abroad.length + love.length,
    JOBS: jobs.length,
    TIPS: tips.length,
    ABROAD: abroad.length,
    LOVE: love.length,
    time: new Date().toISOString()
  });
});

// ADD MANUALLY (backup)
app.get("/add", async (req, res) => {
  const { phone, service } = req.query;
  if (!phone || !service) {
    return res.send("Usage: /add?phone=+254712092263&service=JOBS");
  }
  await saveSubscriber(phone, service.toUpperCase());
  res.send(`✅ Added ${phone} to ${service.toUpperCase()}!`);
});

// HOME
app.get("/", (req, res) => {
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    services: ["JOBS", "TIPS", "ABROAD", "LOVE"],
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 KenyaHub SMS Server running on port ${PORT}`);
});
