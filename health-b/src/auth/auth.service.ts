import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { CreateUserDto } from './dto';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/enums';
enum UserRole {
    USER = 'PATIENT',
    ADMIN = 'ADMIN',
}
@Injectable()
export class AuthService {
    constructor(private readonly prismaService: PrismaService,private readonly jwtService: JwtService) {}


    async signup(createUserDto: CreateUserDto) {
        try {
            const newUser = await this.prismaService.user.create({
                data: {
                    email: createUserDto.email,
                    firstName: createUserDto.firstName,
                    lastName: createUserDto.lastName,
                    hash: await bcrypt.hash(createUserDto.password, 10),
                    role: UserRole.USER,
                }
            });
            const {hash, ...userWithoutHash} = newUser;
            const token = this.jwtService.sign({ id: newUser.id });
            return { ...userWithoutHash, token };
        } catch (error) {
            if(error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Email already exists');
            }
            throw error;
        }
    }
    async signin(email: string, password: string) {
        const user = await this.prismaService.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new ConflictException('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(password, user.hash);
        if (!isMatch) {
            throw new ConflictException('Invalid credentials');
        }
        const {hash, ...userWithoutHash} = user;
        const token = this.jwtService.sign({ id: user.id });
        return { ...userWithoutHash, token };
    }
}