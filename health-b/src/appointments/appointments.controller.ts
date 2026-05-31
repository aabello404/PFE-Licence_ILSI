import { Controller, Post, Body, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Public } from '../auth/constans';
import { AuthGuard } from '../auth/auth.guard';


@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) {}

    @Public()
    @Post("checkallslots")
    async checkAllSlotsAvailability(@Body() body: { doctorId: number, date: string }) {
        const { doctorId, date } = body;
        return this.appointmentsService.checkAllSlotsAvailability(doctorId, date);
    }

    @Post("create")
    async createAppointment(@Body() body: { date: string, time: string, reason: string }, @Request() req: any) {
        const patientId = req.user.id;
        const doctorId = 1;
        
        return this.appointmentsService.createAppointment(patientId, doctorId, body.date, body.time, body.reason);
    }

    @Post("new-appointment")
    async createNewAppointment(@Body() body: { date: string, time: string, reason: string }, @Request() req: any) {
        const patientId = req.user.id;
        const doctorId = 1;
        return this.appointmentsService.createAppointment(patientId, doctorId, body.date, body.time, body.reason);
    }

    @Get("my")
    async getMyAppointments(@Request() req: any) {
        const patientId = req.user.id;
        return this.appointmentsService.getAppointmentsForPatient(patientId);
    }

    @Get("doctor/:doctorId")
    async getDoctorAppointments(@Param("doctorId") doctorId: string) {
        return this.appointmentsService.getAllDoctorAppointments(parseInt(doctorId));
    }

    @Get("all")
    async getAllAppointments() {
        return this.appointmentsService.getAllAppointments();
    }

    @Patch(":id/cancel")
    async cancelAppointment(
        @Param("id") appointmentId: string,
        @Body() body: { reason?: string }
    ) {
        return this.appointmentsService.cancelAppointment(parseInt(appointmentId), body.reason);
    }

    @Patch(":id/confirm")
    async confirmAppointment(
        @Param("id") appointmentId: string,
        @Body() body: { reason?: string }
    ) {
        return this.appointmentsService.confirmAppointment(parseInt(appointmentId), body.reason);
    }
}
