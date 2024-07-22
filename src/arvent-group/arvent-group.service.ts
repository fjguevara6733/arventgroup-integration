import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DoRequestDto } from 'src/common/dto/create-arvent-group.dto';
import { BindRequestInterface } from 'src/common/dto/create-arvent-group.interface.';
import { CoinsFiat, ConceptBind } from 'src/common/enum';
import { EntityManager } from 'typeorm';
import * as https from 'https';
import axios, { AxiosRequestConfig } from 'axios';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ArventGroupService {
  private urlBind = process.env.URL_BIND;
  private httpsAgent: https.Agent;
  private token: string;
  private timeTokenExpirate: Date;
  private USERNAME_BIND = process.env.USERNAME_BIND ?? 'matiasplano@gmail.com';
  private PASSWORD_BIND = process.env.PASSWORD_BIND ?? '2SoeIRGTVP5fGbV';
  private idBank = process.env.BANK_ID_BIND;
  private accountId = process.env.ACCOUNT_ID_BIND;
  private idView = process.env.VIEW_ID_BIND;
  private datos = [
    {
      email: 'sv@arventgroup.com',
      id: 311,
      cvu: '0000058100000000034579',
    },
    {
      email: 'Hola@finpact.org',
      id: 256,
      cvu: '0000058100000000010919',
    },
    {
      email: 'sebastian.vigliola@gmail.com',
      id: 258,
      cvu: '0000058100000000011264',
    },
  ];

  constructor(
    @InjectEntityManager('chronos')
    private readonly chronosEntityManager: EntityManager,
    @InjectEntityManager('arventGroup')
    private readonly arventGroupEntityManager: EntityManager,
  ) {}
  async balances(email) {
    const emails = this.datos.find(
      (e) => e.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
    );
    console.log(emails);

    if (emails === undefined) return 'Email no asociado a ninguna cuenta';
    const query = `SELECT balance,'ARS' FROM cvu_accounts where cvu=${Number(emails.cvu)}`;
    const result = await this.chronosEntityManager
      .query(query)
      .then((response) => response)
      .catch((error) => error);

    return result;
  }

  async getTransactions(req) {
    const { hasta, desde, email } = req;
    const emails = this.datos.find(
      (e) => e.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
    );

    if (!this.getFormattedDate(hasta, desde))
      return 'Error en el rango de fechas';
    if (emails === undefined) return 'Email no asociado a ninguna cuenta';

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
      a.cvu_account_id=${emails.id} and
      date_format(datetime, '%Y%m%d') between
      '${desde.replace('-', '').replace('-', '')}' and '${hasta.replace('-', '').replace('-', '')}'`;

    const result = await this.chronosEntityManager
      .query(query)
      .then((response) => response)
      .catch((error) => error);

    return result;
  }

  private getFormattedDate(desde, hasta): boolean {
    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);

    // Calcula la diferencia en milisegundos entre las dos fechas
    const diferenciaMilisegundos = Math.abs(
      fechaHasta.getTime() - fechaDesde.getTime(),
    );

    // Calcula la diferencia en días dividiendo por la cantidad de milisegundos en un día (86400000)
    const diferenciaDias = Math.ceil(diferenciaMilisegundos / 86400000);

    return diferenciaDias <= 3;
  }

  async requestLogin() {
    try {
      const data = {
        username: this.USERNAME_BIND,
        password: this.PASSWORD_BIND,
      };

      console.log({ data });

      const config = {
        method: 'post',
        url: process.env.URL_BIND + '/login/jwt',
        data,
      };

      if (process.env.CLIENT_CERTIFICATE && process.env.CLIENT_KEY) {
        this.httpsAgent = new https.Agent({
          cert: readFileSync(process.env.CLIENT_CERTIFICATE),
          key: readFileSync(process.env.CLIENT_KEY),
        });

        config['httpsAgent'] = this.httpsAgent;
      }
      const response = await axios(config);

      const timeExpire = new Date(
        new Date().getTime() + response.data.expires_in * 1000,
      );

      this.timeTokenExpirate = timeExpire;

      this.token = response.data.token;

      return response.data.token;
    } catch (error) {
      console.log(error?.response);
      throw new Error(error?.response?.data?.message);
    }
  }

  async checkTokenAndReconnect(expirationDate: Date) {
    const currentTime = new Date().getTime();
    const expirationTime = expirationDate.getTime();
    const oneMinuteInMillis = 60 * 1000;

    if (expirationTime - currentTime <= oneMinuteInMillis) {
      await this.requestLogin();
    }
  }

  async getToken() {
    if (!this.token) {
      return await this.requestLogin();
    }
    await this.checkTokenAndReconnect(this.timeTokenExpirate);
    return this.token;
  }

  async doTransaction(body: DoRequestDto) {
    try {
      const { destinationCbu, amount, email } = body;
      const emails = this.datos.find(
        (e) => e.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
      );
      console.log(emails);

      const params: BindRequestInterface = {
        origin_id: uuidv4(),
        origin_debit: {
          cvu: emails.cvu,
        },
        value: {
          currency: CoinsFiat.ARS,
          amount: Number(amount).toFixed(2),
        },
        to: {
          cbu: destinationCbu,
        },
        concept: ConceptBind.VAR,
        description: 'Pago Alfred',
      };
      console.log(params);

      const headers = {
        Authorization: `JWT ${await this.getToken()}`,
      };
      console.log('headers', headers);
      const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transaction-request-types/TRANSFER-CVU/transaction-requests`;

      console.log('url', url);
      const config: AxiosRequestConfig = {
        method: 'POST',
        url,
        data: params,
        headers: {},
        httpsAgent: this.httpsAgent,
      };
      console.log('config', config);

      const response = await axios(config);
      const data = response.data;
      const responseSave = await this.arventGroupEntityManager
        .query(
          `INSERT INTO transactions (idTransaction,response, status)
          VALUES ('${params.origin_id}', ${JSON.stringify(data)}, '${data.status}')`,
        )
        .then((response) => response)
        .catch((error) => error);
      console.log('responseSave', responseSave);

      console.log('body', body);

      // return response.data;
      return data;
    } catch (error) {
      console.log('body', body);
      console.log(error.response.data);
      throw new Error(error?.response?.data?.message);
    }
  }
}
