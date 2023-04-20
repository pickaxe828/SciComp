import express from "express"
import { Deta } from "deta"
import nocache from "nocache"
import axios from "axios"
import fs from "fs"

const creds = JSON.parse(fs.readFileSync('creds.json', 'utf8'))

const app = express()

const PORT = 8080

const deta = Deta(creds["deta_key"])
const counter = deta.Base("counter")
const store = deta.Base("water_level")

app.use(nocache());
app.use(express.json());
app.set('etag', false);

app.get("/", (req, res) => {
    res.send({"message": "Hello Microbit!"})
})

app.get("/water_level", async (req, res) => {
    let obj = {}
    let count = (await counter.get("counter"))?.value as number
    if (count === undefined) { obj = { "message": "OK", "value": null } }
    else {
        obj = (await store.get(count.toString()))?.value as Object || res.send({ "message": "OK", "value": null })
    }
    if (obj === null) { obj = { "message": "OK", "value": null } }
    res.send(obj)
})

app.post("/water_level", async (req, res) => {
    let inp = req.body
    let count: number = (await counter.get("counter"))?.value as number || 0
    let date = new Date()
    count++
    counter.put({ "value": count }, "counter")
    // { "value": inp["value"], "timestamp": Date.now() }
    store.put(
        { "num_key": count, "value1": inp["value1"], "value2": inp["value2"], "timestamp": Date.now() }, 
        count.toString(), 
        { "expireAt": date.setDate(date.getDate() + 1) }
    )
    
    // Check if notification should be sent
    if (inp["value1"] < 500 || inp["value2"] < 500) {}
    if (count === undefined) { return res.sendStatus(200) }
    let obj = (await store.get(count.toString()))?.value as Object
    if (obj === null) { return res.sendStatus(200) }
    // Send notification

    // use axios to send POST request to IFTTT
    await axios.post(
        "https://maker.ifttt.com/trigger/push_notification/with/key/" + creds["ifttt_wh_key"],
        {
            "value1": "Water level alert ⚠️",
            "value2": `💧 Water level is low \"${obj['value1']}\". Please add water to the drain. ⚠️`,
            "value3": "https://upload.wikimedia.org/wikipedia/commons/7/79/Water_Drop_Icon_Vector.png"
        }
    )
    res.send({ "message": "OK" })
})

app.post('/__space/v0/actions', async (req, res) => {
    const event = req.body.event
    if (event.id === "check_notification") {
        
        // TODO
    }

    res.sendStatus(200)
})


app.listen(PORT, () => {
    console.log(`Water level backend listening on port ${PORT}`)
})