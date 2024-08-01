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
  };
  expiration?: number;
}
