
const express = require("express");
const path = require("path")
const session = require("express-session");
const cookieParser = require("cookie-parser");
const uuid = require("uuid");
const nocache = require("nocache");
const mongoose = require("mongoose");
const dotEnv = require("dotenv");


dotEnv.config();

const app = express();
const Port = process.env.PORT 
const mongoUrl = process.env.MONGO_URL

//Conneted to mongoDB
mongoose.connect(mongoUrl);

mongoose.connection.on("connected", () => {
    console.log("Connected to MongoDb");
});
mongoose.connection.on("error", (err) => {
    console.log(`Error connection to MongoDb ${err}`);
});
mongoose.connection.on("disconnected", () => {
    console.log("Disconnected from MongoDb");
})


//Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(nocache());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public1")));


app.use(session({
    secret: uuid.v4(),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1200000 }

}));


const passport = require('./helpers/passport')
app.use(passport.initialize());
app.use(passport.session());


// routes
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute")


app.use("/admin", adminRoute);
app.use("/", userRoute);


app.listen(Port, () => {
    console.log(`server runnig on http://localhost:${Port}`);
})
