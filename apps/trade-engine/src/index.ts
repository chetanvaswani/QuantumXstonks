import { createClient } from "redis";
import { ALL_ASSETS } from "@repo/assets";

const redisClient = createClient({
    url: "redis://localhost:6379"
});

async function connectRedisClient(){
    await redisClient.connect();
}
connectRedisClient();

const currPrices = {
    ...Object.fromEntries(ALL_ASSETS.map((asset) => {
        return [asset, {
            offSet: "$",
            price: 0,
            decimal: 4,
            timeStamp: Date.now()
        }]
    }))
}

async function getCurrPrice(asset: string){
    const response = await redisClient.xRead({
        key: asset,
        id: currPrices[asset]!.offSet
    }, {
        BLOCK: 0,
        COUNT: 1
    })
    if (response === null) return
    // @ts-ignore
    const {name, messages} = response[0];
    // console.log(name, messages)
    const id = messages[0].id;
    const message = JSON.parse(messages[0].message.message)
    currPrices[name] = {
        offSet: id,
        price: message.price,
        timeStamp: message.timeStamp,
        decimal: message.decimal
    }
}

setInterval(() => {
    ALL_ASSETS.map((asset) => {
        getCurrPrice(asset)
    })
    console.log(currPrices)
}, 100)