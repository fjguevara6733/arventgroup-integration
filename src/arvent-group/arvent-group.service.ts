import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

@Injectable()
export class ArventGroupService {
  private url = process.env.URL_GENERAL;
  constructor(
    @InjectEntityManager('chronos')
    private readonly chronosEntityManager: EntityManager,
  ) {}
  async balances(cvu) {
    const query = `SELECT balance,'ARS' FROM cvu_accounts where cvu=${cvu}`;
    const result = await this.chronosEntityManager.query(query);

    return result;
  }

  async cashOut() {
    const query = `SELECT b.datetime,
      c.transaction_id_2,c.counterparty_id,c.counterparty_account_address,
      c.counterparty_name,c.origin_debit_cvu,
      c.origin_debit_cuit,  b.transaction_type,
      c.transaction_status,c.transaction_amount
      FROM cvu_account_transactions a, transactions b, 
      bind_cvu_accounts_transactions c
      where
      b.account_transaction_id=a.cvu_account_transaction_id
      and a.bind_transaction_id=c.id  and
      a.cvu_account_id=312 and
      date_format(datetime, '%Y%m%d') between '20240625' and '20240626'`;
    const result = await this.chronosEntityManager.query(query);

    return result;
  }
}
