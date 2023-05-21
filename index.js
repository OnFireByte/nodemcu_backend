import express from "express";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    orderBy,
    limit,
    doc,
    setDoc,
    where,
} from "firebase/firestore";

dotenv.config();

const app = express();
const port = 3000;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    next();
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post("/nodemcu", express.urlencoded({ extended: true }), async (req, res) => {
    const data = req.body;
    for (const key in data) {
        data[key] = parseInt(data[key]);
    }
    data.time = Date.now();
    res.send(JSON.stringify(data));
    try {
        await addDoc(collection(db, "rawdata"), data);
    } catch (e) {
        console.log(e);
    }
});

app.get("/nodemcu", async (req, res) => {
    const setting = await getDoc(doc(db, "setting", "setting"));
    const now = (
        await getDocs(query(collection(db, "rawdata"), orderBy("time", "desc"), limit(1)))
    ).docs[0].data();
    let result = true;
    for (const key in setting) {
        result &&= now[key] >= setting[key].min && now[key] <= setting[key].max;
    }
    res.send(result ? "1" : "0");
});

app.get("/today", async (req, res) => {
    try {
        const SECOND_IN_DAY = 24 * 60 * 60;
        const last = Date.now() - SECOND_IN_DAY * 1000;

        const data = (
            await getDocs(
                query(collection(db, "rawdata"), orderBy("time", "desc")),
                where("time", ">=", last)
            )
        ).docs.map((x) => x.data());
        res.send(data);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get("/today/:name", async (req, res) => {
    const list = ["temp", "humid", "light", "dust"];
    const name = req.params.name;
    if (!list.includes(name)) {
        res.send({
            status: "error",
            message: "invalid parameter name (must be temp, humid, light, dust)",
        });
        return;
    }
    try {
        const SECOND_IN_DAY = 24 * 60 * 60;
        const last = Date.now() - SECOND_IN_DAY * 1000;
        const DATA_IN_DAY = SECOND_IN_DAY / 30;
        const data = (
            await getDocs(
                query(collection(db, "rawdata"), orderBy("time", "desc")),
                where("time", ">=", last)
            )
        ).docs
            .map((x) => x.data())
            .filter((x) => x.time > last)
            .map((x) => {
                return {
                    time: x.time,
                    value: x[name],
                };
            });
        res.send(data);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get("/now", async (req, res) => {
    try {
        const q = query(collection(db, "rawdata"), orderBy("time", "desc"), limit(1));
        const raw = await getDocs(q);
        const data = raw.docs[0].data();
        res.send(data);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.post("/setting", express.json(), async (req, res) => {
    const data = req.body;
    const list = ["temp", "humid", "light", "dust"];
    for (const name of list) {
        if (data[name]?.min === undefined || data[name]?.max === undefined) {
            res.send({
                status: "error",
                message: "invalid parameter (missing)",
            });
            return;
        }
        if (data[name].min > data[name].max) {
            res.send({
                status: "error",
                message: "invalid parameter (min > max)",
            });
            return;
        }
    }

    try {
        await setDoc(doc(db, "setting", "setting"), data);
        res.send({
            status: "success",
        });
    } catch (error) {
        res.send({
            status: "error",
            message: error,
        });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
