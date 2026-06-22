import { Controller, Post, Get, Body } from "@nestjs/common";
import { ExolveService } from "./exolve.service";

@Controller("exolve")
export class ExolveController {
  constructor(private readonly exolve: ExolveService) {}

  @Get("test")
  async test() {
    return this.exolve.testConnection();
  }

  @Get("accounts")
  async accounts() {
    return this.exolve.accounts();
  }

  @Post("make-call")
  async makeCall(@Body() body: { phone: string; number: string; user: string; line?: string }) {
    return this.exolve.makeCall(body);
  }

  @Post("webhook")
  async webhook(@Body() body: any) {
    return this.exolve.handleWebhook(body);
  }
}
