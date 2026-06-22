import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

@Injectable()
export class ExolveService {
  private readonly logger = new Logger(ExolveService.name);
  private readonly apiUrl = "https://exolve347062.vats.exolve.ru/sys/crm_api.wcgp";
  private readonly apiKey = "40051c0e-bb1f-4fc5-9d03-340b859bc002";

  constructor(private http: HttpService) {}

  async testConnection(): Promise<any> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(this.apiUrl, 
          new URLSearchParams({ cmd: "accounts", token: this.apiKey }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
      );
      return { status: "ok", data: res.data };
    } catch (e: any) {
      return { status: "error", message: e.message, response: e.response?.data };
    }
  }

  async makeCall(params: {
    phone: string;      // с какого номера звонить (внешний)
    number: string;     // кому звонить (внешний)
    user: string;       // логин сотрудника (name из accounts)
    line?: string;      // номер линии (опционально)
  }): Promise<any> {
    try {
      const formData: Record<string, string> = {
        cmd: "makeCall",
        phone: params.phone,
        number: params.number,
        user: params.user,
        token: this.apiKey,
      };
      if (params.line) formData.line = params.line;

      const res: any = await firstValueFrom(
        this.http.post(this.apiUrl,
          new URLSearchParams(formData).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
      );
      return { status: "ok", data: res.data };
    } catch (e: any) {
      return { status: "error", message: e.message, response: e.response?.data };
    }
  }

  async accounts(): Promise<any> {
    try {
      const res: any = await firstValueFrom(
        this.http.post(this.apiUrl,
          new URLSearchParams({ cmd: "accounts", token: this.apiKey }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
      );
      return { status: "ok", data: res.data };
    } catch (e: any) {
      return { status: "error", message: e.message, response: e.response?.data };
    }
  }

  handleWebhook(body: any) {
    this.logger.log("Exolve webhook received");
    this.logger.log(JSON.stringify(body, null, 2));
    return { received: true };
  }
}
