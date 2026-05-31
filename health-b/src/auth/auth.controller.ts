import { Body, Controller,Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, SignInDto } from './dto';
import { Public } from './constans';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}
    @Public()
    @Post('signup')
    async signup(@Body() createUserDto: CreateUserDto) {
        return this.authService.signup(createUserDto);
    }
    @Public()
    @Post('signin')
    async signin(@Body() signInDto: SignInDto) {
        return this.authService.signin(signInDto.email, signInDto.password);
    }   
}
