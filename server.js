require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
    let p = String(phone).replace(/\s/g, '');
    if (!p.startsWith('+')) p = '+' + p;
    await db.collection("subscribers").updateOne(
      { phone: p },
      { $set: { phone: p, service, date: new Date() } },
      { upsert: true }
    );
    console.log(`✅ Saved: ${p} → ${service}`);
  } catch(e) {
    console.log("❌ Save error:", e.message);
  }
}

async function removeSubscriber(phone) {
  try {
    let p = String(phone).replace(/\s/g, '');
    if (!p.startsWith('+')) p = '+' + p;
    await db.collection("subscribers").deleteOne({ phone: p });
    console.log(`🔴 Removed: ${p}`);
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

// ── PREMIUM SMS ─────────────────────────────────────────────────────────────
async function sendPremiumSMS(numbers, message, keyword) {
  try {
    console.log(`🚀 Sending Premium SMS to ${numbers.length} number(s)...`);
    console.log(`📱 Numbers: ${numbers.join(", ")}`);

    const body = new URLSearchParams({
      username: process.env.AT_USERNAME,
      to:       numbers.join(","),
      from:     "40024",
      keyword:  keyword,
      message:  message,
      enqueue:  "0"
    });

    console.log(`📦 BODY SENT: ${body.toString()}`);

    const response = await fetch(
      "https://content.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Accept":       "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey":       process.env.AT_API_KEY
        },
        body: body.toString()
      }
    );

    const data = await response.json();
    console.log(`📤 RAW RESPONSE: ${JSON.stringify(data)}`);

    if (data.SMSMessageData) {
      const recipients = data.SMSMessageData.Recipients || [];
      recipients.forEach(r => {
        console.log(`📱 ${r.number} | ${r.status} | code: ${r.statusCode} | ${r.cost}`);
      });
      return data.SMSMessageData.Message;
    }
    return JSON.stringify(data);
  } catch(e) {
    console.log("❌ Premium SMS error:", e.message);
    throw e;
  }
}

// ── WELCOME / REPLY SMS (also via Premium endpoint) ──────────────────────────
async function sendReply(phone, message) {
  try {
    const body = new URLSearchParams({
      username: process.env.AT_USERNAME,
      to:       phone,
      from:     "40024",
      message:  message,
      enqueue:  "0"
    });

    const response = await fetch(
      "https://content.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Accept":       "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "apiKey":       process.env.AT_API_KEY
        },
        body: body.toString()
      }
    );

    const data = await response.json();
    console.log(`📤 Reply response: ${JSON.stringify(data)}`);
  } catch(e) {
    console.log("❌ Reply SMS error:", e.message);
  }
}

// ── INCOMING SMS ─────────────────────────────────────────────────────────────
app.post("/sms", async (req, res) => {
  console.log("📩 SMS received:", JSON.stringify(req.body));
  const phone   = req.body.from || req.body.phoneNumber || "";
  const message = (req.body.text || req.body.keyword || "").toUpperCase().trim();
  console.log(`From: ${phone} | Message: ${message}`);

  if (message === "JOBS") {
    await saveSubscriber(phone, "JOBS");
    await sendReply(phone, "Welcome to KenyaHub Jobs! You will receive 5 job alerts daily. Cost: KSH 10/msg. Text STOP to unsubscribe.");
  }
  else if (message === "TIPS") {
    await saveSubscriber(phone, "TIPS");
    await sendReply(phone, "Welcome to KenyaHub Tips! 3 match predictions daily. Cost: KSH 10/msg. Text STOP to unsubscribe.");
  }
  else if (message === "ABROAD") {
    await saveSubscriber(phone, "ABROAD");
    await sendReply(phone, "Welcome to KenyaHub Abroad! International job alerts daily. Cost: KSH 10/msg. Text STOP to unsubscribe.");
  }
  else if (message === "LOVE") {
    await saveSubscriber(phone, "LOVE");
    await sendReply(phone, "Welcome to KenyaHub Love! Daily relationship wisdom. Cost: KSH 10/msg. Text STOP to unsubscribe.");
  }
  else if (message === "STOP") {
    await removeSubscriber(phone);
    await sendReply(phone, "You have been unsubscribed from KenyaHub. Text JOBS, TIPS, ABROAD or LOVE to rejoin anytime.");
  }
  else {
    await sendReply(phone, "Welcome to KenyaHub! Text JOBS for local jobs, TIPS for betting tips, ABROAD for intl jobs, LOVE for daily advice.");
  }

  res.status(200).send("OK");
});

// ── SUBSCRIPTION CALLBACK ────────────────────────────────────────────────────
app.post("/subscription", async (req, res) => {
  console.log("🔔 Subscription event:", JSON.stringify(req.body));
  const phone      = req.body.phoneNumber || req.body.from || "";
  const keyword    = (req.body.keyword || "").toUpperCase().trim();
  const updateType = req.body.updateType || "addition";
  if (updateType === "addition" && keyword) {
    await saveSubscriber(phone, keyword);
  } else if (updateType === "deletion") {
    await removeSubscriber(phone);
  }
  res.status(200).send("OK");
});

// ── DELIVERY REPORT ──────────────────────────────────────────────────────────
app.post("/delivery", (req, res) => {
  console.log("📬 Delivery report:", JSON.stringify(req.body));
  const phone         = req.body.phoneNumber || req.body.to || "unknown";
  const status        = req.body.status || "unknown";
  const failureReason = req.body.failureReason || "none";
  console.log(`📬 ${phone} | ${status} | reason: ${failureReason}`);
  res.status(200).send("OK");
});

// ── SEND ROUTES ──────────────────────────────────────────────────────────────
app.get("/send/jobs", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB JOBS: 1.Safaricom-Customer Care Nairobi 2.KCB-Teller Kisumu 3.NGO-Field Officer Mombasa. Apply fast!";
  const subscribers = await getSubscribers("JOBS");
  if (subscribers.length === 0) return res.send("No JOBS subscribers yet!");
  const numbers = subscribers.map(s => s.phone).filter(Boolean);
  try {
    const result = await sendPremiumSMS(numbers, msg, "JOBS");
    res.send(`✅ ${result}`);
  } catch(e) {
    res.send("❌ Error: " + e.message);
  }
});

app.get("/send/tips", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB TIPS: 1.Man City vs Arsenal: Over 2.5 2.Liverpool vs Chelsea: Home Win 3.Barcelona vs Real: BTTS. Good luck!";
  const subscribers = await getSubscribers("TIPS");
  if (subscribers.length === 0) return res.send("No TIPS subscribers yet!");
  const numbers = subscribers.map(s => s.phone).filter(Boolean);
  try {
    const result = await sendPremiumSMS(numbers, msg, "TIPS");
    res.send(`✅ ${result}`);
  } catch(e) {
    res.send("❌ Error: " + e.message);
  }
});

app.get("/send/abroad", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB ABROAD: Germany-50 Nurses EUR 2800/mo. UAE-Drivers KES 45000+housing. Apply: kazimajuu.go.ke";
  const subscribers = await getSubscribers("ABROAD");
  if (subscribers.length === 0) return res.send("No ABROAD subscribers yet!");
  const numbers = subscribers.map(s => s.phone).filter(Boolean);
  try {
    const result = await sendPremiumSMS(numbers, msg, "ABROAD");
    res.send(`✅ ${result}`);
  } catch(e) {
    res.send("❌ Error: " + e.message);
  }
});

app.get("/send/love", async (req, res) => {
  const msg = req.query.msg ||
    "KENYAHUB LOVE: A partner who truly loves you will never make you feel you are asking too much by wanting basic respect.";
  const subscribers = await getSubscribers("LOVE");
  if (subscribers.length === 0) return res.send("No LOVE subscribers yet!");
  const numbers = subscribers.map(s => s.phone).filter(Boolean);
  try {
    const result = await sendPremiumSMS(numbers, msg, "LOVE");
    res.send(`✅ ${result}`);
  } catch(e) {
    res.send("❌ Error: " + e.message);
  }
});

// ── SUBSCRIBERS COUNT ────────────────────────────────────────────────────────
app.get("/subscribers", async (req, res) => {
  const jobs   = await getSubscribers("JOBS");
  const tips   = await getSubscribers("TIPS");
  const abroad = await getSubscribers("ABROAD");
  const love   = await getSubscribers("LOVE");
  res.json({
    status: "KenyaHub SMS Service is LIVE",
    total:  jobs.length + tips.length + abroad.length + love.length,
    JOBS:   jobs.length,
    TIPS:   tips.length,
    ABROAD: abroad.length,
    LOVE:   love.length,
    time:   new Date().toISOString()
  });
});

// ── ADD SUBSCRIBER MANUALLY ──────────────────────────────────────────────────
app.get("/add", async (req, res) => {
  const { phone, service } = req.query;
  if (!phone || !service) return res.send("Usage: /add?phone=254712092263&service=JOBS");
  await saveSubscriber(phone, service.toUpperCase());
  res.send(`✅ Added ${phone} to ${service.toUpperCase()}!`);
});

// ── HOME ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status:   "KenyaHub SMS Service is LIVE",
    services: ["JOBS", "TIPS", "ABROAD", "LOVE"],
    time:     new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 KenyaHub SMS Server running on port ${PORT}`);
});
