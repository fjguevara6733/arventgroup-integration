export class DoRequestDto {
  destinationCbu: string;
  amount: string;
  email: string;
  idTransaction: string
}

export interface BindRequestInterface {
  to?: {
    cbu: string;
  };
  value?: {
    currency: string;
    amount: string;
  };
  concept?: string;
  description?: string
  origin_id?: string;
  origin_debit?: {
    cvu: string;
    cuit: string;
  };
  expiration?: number;
}

export interface Client {
  client_id?: number;
  cuit: string;
  name: string;
  currency: string;
}