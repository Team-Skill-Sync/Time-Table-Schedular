const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const LeaveRequest = require("./models/LeaveRequest");
const ExtraClassRequest = require("./models/ExtraClassRequest");
const Timetable = require("./models/Timetable");

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "eduverse-secret", resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/eduverse", { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    console.log("✅ MongoDB Connected");
    await seedDatabase();
}).catch(err => console.error("❌ MongoDB Error:", err));

// ===== Seed Database =====
async function seedDatabase() {
    if (await LeaveRequest.countDocuments() === 0) {
        await LeaveRequest.insertMany([
            { name: "Teacher A", reason: "Medical" },
            { name: "Teacher B", reason: "Personal" }
        ]);
    }
    if (await ExtraClassRequest.countDocuments() === 0) {
        await ExtraClassRequest.insertMany([
            { name: "Teacher C", subject: "Math" },
            { name: "Teacher D", subject: "Science" }
        ]);
    }
    if (await Timetable.countDocuments() === 0) {
        await Timetable.create({
            classname: "Class 10A",
            subjects: ["Math","Science","English","History","Geography"],
            generated: true
        });
    }
}

// ===== Auth Middleware =====
function checkPrincipal(req,res,next){
    if(req.session.user === "principal") return next();
    res.status(401).json({success:false,message:"Not authorized"});
}

// ===== Routes =====

// Login
app.post("/login", async(req,res)=>{
    const {username,password} = req.body;
    if(username==="principal" && password==="12345"){
        req.session.user="principal";
        return res.json({success:true,role:"principal"});
    }
    res.json({success:false,message:"Invalid credentials"});
});

// Logout
app.get("/logout",(req,res)=>{
    req.session.destroy();
    res.redirect("/index.html");
});

// Leave Requests
app.get("/leaverequests", checkPrincipal, async(req,res)=>{
    const leaves = await LeaveRequest.find();
    res.json(leaves);
});
app.post("/principal/approve-leave/:id/:action", checkPrincipal, async(req,res)=>{
    await LeaveRequest.findByIdAndUpdate(req.params.id,{
        status: req.params.action==="approve" ? "Approved" : "Rejected"
    });
    res.json({success:true});
});

// Extra Class Requests
app.get("/extraclassrequests", checkPrincipal, async(req,res)=>{
    const extras = await ExtraClassRequest.find();
    res.json(extras);
});
app.post("/principal/extra-class/:id/:action", checkPrincipal, async(req,res)=>{
    await ExtraClassRequest.findByIdAndUpdate(req.params.id,{
        status: req.params.action==="approve" ? "Approved" : "Rejected"
    });
    res.json({success:true});
});

// Timetable
app.get("/principal/timetable", checkPrincipal, async(req,res)=>{
    const timetable = await Timetable.findOne();
    res.json(timetable);
});
app.post("/principal/timetable", checkPrincipal, async(req,res)=>{
    const { classname, subjects } = req.body;
    let tt = await Timetable.findOne({classname});
    if(!tt) tt = new Timetable({classname});
    tt.subjects = subjects.split(",");
    tt.generated = true;
    await tt.save();
    res.json({success:true});
});

// Download PDF
app.get("/principal/timetable/pdf", checkPrincipal, async(req,res)=>{
    const timetable = await Timetable.findOne();
    if(!timetable) return res.send("No timetable");
    const doc = new PDFDocument();
    res.setHeader("Content-Disposition","attachment; filename=timetable.pdf");
    res.setHeader("Content-Type","application/pdf");
    doc.pipe(res);
    doc.fontSize(20).text(`Timetable - ${timetable.classname}`,{align:"center"});
    timetable.subjects.forEach((s,i)=>doc.text(`Period ${i+1}: ${s}`));
    doc.end();
});

// Download Excel
app.get("/principal/timetable/excel", checkPrincipal, async(req,res)=>{
    const timetable = await Timetable.findOne();
    if(!timetable) return res.send("No timetable");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Timetable");
    sheet.addRow([`Class: ${timetable.classname}`]);
    sheet.addRow([]);
    sheet.addRow(["Period","Monday","Tuesday","Wednesday","Thursday","Friday"]);
    timetable.subjects.forEach((s,i)=>sheet.addRow([`Period ${i+1}`,s,s,s,s,s]));
    res.setHeader("Content-Disposition","attachment; filename=timetable.xlsx");
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
});

app.listen(PORT,()=>console.log(`Server running at http://localhost:${PORT}`));

