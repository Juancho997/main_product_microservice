import * as dotenv from 'dotenv';
dotenv.config();

import * as express from 'express';
import { Request, Response } from 'express';
import * as cors from 'cors';
import * as amqp from 'amqplib/callback_api';


import { myDataSource } from './app-data-source';
import { Product } from './entity/product';
import { ObjectId } from 'mongodb';


myDataSource
    .initialize()
    .then(() => {
        console.log("Data Source has been initialized!");

        const productRepository = myDataSource.getMongoRepository(Product);

        amqp.connect(process.env.AMQP_URL, (error0, connection) => {
            if (error0) {
                throw error0;
            }

            connection.createChannel((error1, channel) => {
                if (error1) {
                    throw error0;
                }

                channel.assertQueue('product_created', { durable: false })
                channel.assertQueue('product_updated', { durable: false })
                channel.assertQueue('product_deleted', { durable: false })

                const app = express();
                app.use(cors({
                    origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:4200']
                }));
                app.use(express.json());

                channel.consume('product_created', async (msg) => {
                    try {
                        const eventProduct = JSON.parse(msg.content.toString());
                        const product = new Product();

                        product.admin_id = parseInt(eventProduct.id);
                        product.title = eventProduct.title;
                        product.image = eventProduct.image;
                        product.likes = eventProduct.likes;

                        await productRepository.save(product);
                        console.log(`Product with admin_id : ${eventProduct.id} created`);
                    } catch (err) {
                        console.log(err)
                    }
                }, { noAck: true });

                channel.consume('product_updated', async (msg) => {
                    try {
                        const eventProduct = JSON.parse(msg.content.toString());
                        const product = await productRepository.findOneBy({ admin_id: parseInt(eventProduct.id) });

                        if (!product) return console.log(`Product not found with admin_id : ${eventProduct.id}`)

                        productRepository.merge(product, {
                            title: eventProduct.title,
                            image: eventProduct.image,
                            likes: eventProduct.likes
                        });

                        await productRepository.save(product);
                        console.log(`Product with admin_id : ${eventProduct.id} updated`);
                    } catch (err) {
                        console.log(err)
                    }
                }, { noAck: true });

                channel.consume('product_deleted', async (msg) => {
                    try {
                        const admin_id = parseInt(msg.content.toString());
                        await productRepository.deleteOne({ admin_id });
                        console.log(`Product with admin_id : ${admin_id} deleted`);
                    } catch (err) {
                        console.log(err)
                    }
                }, { noAck: true });


                app.get('/api/products', async (req: Request, res: Response) => {
                    try {
                        const products = await productRepository.find();
                        return res.send(products)
                    } catch (err) {
                        console.log(err)
                    }
                });

                app.post('/api/products/:id/like', async (req: Request, res: Response) => {
                    try {

                        const product = await productRepository.findOne({
                            _id: new ObjectId(req.params.id)
                        } as any);

                        product.likes++;
                        await productRepository.save(product);

                        return res.send(product);
                    } catch (err) {
                        console.log(err)
                    }
                })



                app.listen(process.env.PORT, () => {
                    console.log(`Main listenting on port ${process.env.PORT}`)
                });



                process.on('beforeExit', () => {
                    console.log('closing Main Rabbit connection...');
                    connection.close();
                })

            })

        })

    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    });




