import express from "express";
import dotenv from "dotenv";
import { bisect } from "./utils/bisect.js";

import { readFile, writeFile } from "fs/promises";
dotenv.config();

const app = express();
const port = 3000;

let dataArray = [];
let nodeMCUSetting = {};
const raw = await readFile("./data.json", "utf8");
dataArray = JSON.parse(raw);
const rawSetting = await readFile("./setting.json", "utf8");
nodeMCUSetting = JSON.parse(rawSetting);

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
        if (data.dust == 0) {
            return;
        }
        dataArray.push(data);
        await writeFile("./data.json", JSON.stringify(dataArray));
    } catch (e) {
        console.log(e);
    }
});

app.get("/nodemcu", async (req, res) => {
    const now = dataArray.at(-1);
    let result = true;
    for (const key in nodeMCUSetting) {
        result &&= now[key] >= nodeMCUSetting[key].min && now[key] <= nodeMCUSetting[key].max;
    }
    res.send(result ? "1" : "0");
});

app.get("/today", async (req, res) => {
    try {
        const SECOND_IN_DAY = 24 * 60 * 60;
        const last = Date.now() - SECOND_IN_DAY * 1000;

        const index = bisect(dataArray, last, "time");
        const data = dataArray.slice(index);
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
        const index = bisect(dataArray, last, "time");
        const data = dataArray.slice(index).map((x) => {
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
        const data = dataArray.at(-1);
        res.send(data);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get("/setting", async (req, res) => {
    res.send(nodeMCUSetting);
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
        nodeMCUSetting = data;
        await writeFile("./setting.json", JSON.stringify(nodeMCUSetting));
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

app.listen(port, async () => {
    console.log(`App listening on port ${port}`);
});
