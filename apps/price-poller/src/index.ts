import WebSocket from "ws"
import { createClient } from "redis";
import {ALL_ASSETS} from "@repo/assets";

const publisher = createClient({
    url: "redis://localhost:6379"
});

async function connectRedis(){
    await publisher.connect()
}
connectRedis()

const ws = new WebSocket('wss://ws.backpack.exchange')

const DECIMAL_PRECISION = 4;
interface assetPriceInterface{
    [asset: string]: {
        price: number,
        decimal: number,
        timeStamp: number
    }
}

const currPrices: assetPriceInterface = {
    ...Object.fromEntries(ALL_ASSETS.map((asset) => {
        return [asset, {
            price: 0,
            decimal: DECIMAL_PRECISION,
            timeStamp: (Date.now() * 1000)
        }]
    }))
}

setInterval(() => {
    ALL_ASSETS.forEach((asset) => {
        if (currPrices[asset]?.price === 0) {
            return
        }
        publisher.xAdd(asset, "*", {
            message: JSON.stringify(currPrices[asset])
        })
        console.log(asset, currPrices[asset], "pushed to stream")
    })
}, 100)

ws.onopen = () => {
    ALL_ASSETS.forEach((asset) => {
        const subscription = {
            "method": "SUBSCRIBE",
            "params": [`${asset}`]
        }
    
        ws.send(JSON.stringify(subscription))
    })
}

ws.on("message", async (data) => {
    const res = JSON.parse(data.toString())
    // console.log(res)
    currPrices[res.stream] = {
        price: parseInt((Number(res.data.a) * (10 ** DECIMAL_PRECISION)).toFixed(0)),
        decimal: DECIMAL_PRECISION,
        timeStamp: res.data.T
    }
})
