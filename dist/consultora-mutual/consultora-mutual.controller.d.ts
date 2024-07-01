import { HttpStatus } from '@nestjs/common';
import { ConsultoraMutualService } from './consultora-mutual.service';
import { CashOutDto, LoginDto } from 'src/common/dto/create-consultora-mutual.dto';
export declare class ConsultoraMutualController {
    private readonly consultoraMutualService;
    constructor(consultoraMutualService: ConsultoraMutualService);
    login(body: LoginDto): Promise<{
        statusCode: HttpStatus;
        message: string;
        data: any;
    }>;
    cashOut(body: CashOutDto): Promise<{
        statusCode: HttpStatus;
        message: string;
        data: any;
    }>;
    getCustomerByAlias(alias: string): Promise<{
        statusCode: HttpStatus;
        message: string;
        data: any;
    }>;
    getCustomerByCbu(cbu: string): Promise<{
        statusCode: HttpStatus;
        message: string;
        data: any;
    }>;
}
