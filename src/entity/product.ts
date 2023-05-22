import { Column, Entity, ObjectIdColumn } from "typeorm";
import { ObjectId } from 'bson'; 

@Entity()
export class Product {

    @ObjectIdColumn()
    id: ObjectId;

    @Column({ unique: true })
    admin_id: number;

    @Column()
    title: string;

    @Column()
    image: string;

    @Column({ default: 0 })
    likes: number;
}