import { CashOutDto, LoginDto } from '../common/dto/create-consultora-mutual.dto';
export declare class ConsultoraMutualService {
    private url;
    login(body: LoginDto): Promise<any>;
    cashOut(body: CashOutDto): Promise<any>;
    getCustomerByAlias(alias: string): Promise<any>;
    getCustomerByCbu(cbu: string): Promise<any>;
}
