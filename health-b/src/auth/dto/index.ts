export type CreateUserDto = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}
export type SignInDto = {
    email: string;
    password: string;
}