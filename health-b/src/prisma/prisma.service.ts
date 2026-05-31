import { Injectable,OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import {Pool} from 'pg';
import {PrismaPg} from '@prisma/adapter-pg';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {

    constructor() {
        
        const conectionString = process.env.DATABASE_URL;
        const pool = new Pool({
            connectionString: conectionString,
        });
        const adapter = new PrismaPg(pool);

        super({adapter});
    }
  async onModuleInit() {
    await this.$connect();
  }
}
