import { DataSource } from "typeorm"

export const myDataSource = new DataSource({
    type: "mongodb",
    url: process.env.MONGO_URI,
    useNewUrlParser: true,
    entities: ["src/entity/*.js"],
    logging: true,
    synchronize: true
})