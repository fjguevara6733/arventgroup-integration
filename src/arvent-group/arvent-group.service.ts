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
  private urlBind =
    process.env.environment === 'dev'
      ? process.env.URL_BIND
      : process.env.URL_BIND_PROD;
  private httpsAgent: https.Agent;
  private token: string;
  private timeTokenExpirate: Date;
  private USERNAME_BIND =
    process.env.environment === 'dev'
      ? process.env.USERNAME_BIND
      : process.env.USERNAME_BIND_PROD;
  private PASSWORD_BIND =
    process.env.environment === 'dev'
      ? process.env.PASSWORD_BIND
      : process.env.PASSWORD_BIND_PROD;
  private idBank = process.env.BANK_ID_BIND;
  private accountId =
    process.env.environment === 'dev'
      ? process.env.ACCOUNT_ID_BIND
      : process.env.ACCOUNT_ID_BIND_PROD;
  private idView = process.env.VIEW_ID_BIND;
  private clientCertificate = process.env.CLIENT_CERTIFICATE;
  private clientKey = process.env.CLIENT_KEY;
  private datos = [
    {
      email: 'sv@arventgroup.com',
      id: 311,
      cvu: '0000058100000000034579',
    },
    {
      email: 'hola@finpact.org',
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

      const config = {
        method: 'post',
        url: this.urlBind + '/login/jwt',
        data,
      };

      if (this.clientCertificate && this.clientKey) {
        this.httpsAgent = new https.Agent({
          cert: readFileSync(this.clientCertificate),
          key: readFileSync(this.clientKey),
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
      const params: BindRequestInterface = {
        origin_id: uuidv4().substring(0, 14).replace(/-/g, '0'),
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

      const headers = {
        Authorization: `JWT ${await this.getToken()}`,
      };
      const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transaction-request-types/TRANSFER-CVU/transaction-requests`;
      const config: AxiosRequestConfig = {
        method: 'POST',
        url,
        data: params,
        headers,
        httpsAgent: this.httpsAgent,
      };

      const response = await axios(config);
      const data = response.data;

      const dataString = JSON.stringify(data);
      await this.arventGroupEntityManager
        .query(
          `INSERT INTO transactions (idTransaction,response, status, email)
          VALUES ('${params.origin_id}', '${dataString}', '${data.status}', '${body.email}')`,
        )
        .then((response) => response)
        .catch((error) => error);

      return data;
    } catch (error) {
      console.log(error.response.data);
      throw new Error(error?.response?.data?.message);
    }
  }

  async transactionReport() {
    const data = await this.arventGroupEntityManager.query(
      'SELECT * FROM transactions',
    );
    const response = data.map((e) => {
      return {
        id: e.idTransaction,
        status: e.status,
        emailOriginDebit: e.email,
        responseBank: JSON.parse(e.response),
      };
    });
    return response;
  }

  async updateStatusTransactions() {
    const data = await this.arventGroupEntityManager.query(
      'SELECT * FROM transactions WHERE status = "IN_PROGRESS"',
    );

    for (const transaction of data) {
      const response = JSON.parse(transaction.response);
      const { transaction_ids } = response;
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: `https://api.chronospay.io/alfred-wallet/v1/transaction/get-transaction/${transaction_ids[0]}`,
        httpsAgent: this.httpsAgent,
      };
      const responseAxios = await axios(config);
      const data = responseAxios.data;
      const dataResponse = data.data;
      await this.arventGroupEntityManager
        .query(
          `UPDATE transactions SET status = '${dataResponse.status}', response = '${JSON.stringify(dataResponse)}' WHERE id = ${transaction.id}`,
        )
        .then((response) => response)
        .catch((error) => error);
    }
    return true;
  }

  async creditTransactions() {
    try {
      const headers = {
        Authorization: `JWT ${await this.getToken()}`,
        // obp_status: "",
        obp_limit: 10,
        obp_offset: 0,
        obp_from_date: '2024-07-29',
        obp_to_date: '2024-07-29',
        obp_origin: 'TRANSFERENCIAS_RECIBIDAS',
      };
      const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transactions`;
      const config: AxiosRequestConfig = {
        method: 'GET',
        url,
        headers,
        httpsAgent: this.httpsAgent,
      };

      const response = await axios(config);
      console.log('response', response);
      const data = response.data;
      console.log('data', data);
      return data
    } catch (error) {
      console.log(error);
    }
    // const data = [
    //   {
    //     id: 'NSBT-1-62-685741-65-1-20240729-10-10-558-1',
    //     type: 'TRANSFER',
    //     from: {
    //       bank_id: '322',
    //       account_id: '20-1-685741-1-5',
    //     },
    //     counterparty: {
    //       id: '23447081164',
    //       name: 'MACHUCA MELANY ROCIO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_RECIBIDAS',
    //       origin_credit: {
    //         cvu: '0000058100000000034579',
    //         cuit: '30717616657',
    //       },
    //       origin_debit: {
    //         cvu: '0000013000032111172523',
    //         cuit: '23447081164',
    //       },
    //     },
    //     transaction_ids: [
    //       '7L8GYKNXR7PK14QWNMPRZ5',
    //       'NSBT-1-62-685741-65-1-20240729-10-10-558-1',
    //     ],
    //     status: 'COMPLETED',
    //     start_date: '2024-07-29T22:21:05.000Z',
    //     end_date: '2024-07-29T03:00:00.000Z',
    //     charge: {
    //       summary: 'VAR',
    //       value: {
    //         currency: 'ARS',
    //         amount: 15575.6,
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-3-685741-65-1-20240729-13-10-4363-1',
    //     type: 'TRANSFER',
    //     from: {
    //       bank_id: '322',
    //       account_id: '20-1-685741-1-5',
    //     },
    //     counterparty: {
    //       id: '30716788543',
    //       name: '',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_RECIBIDAS',
    //       origin_credit: {
    //         cvu: '0000058100000000034579',
    //         cuit: '30717616657',
    //       },
    //       origin_debit: {
    //         cvu: '3220001805006856990051',
    //         cuit: '30716788543',
    //       },
    //     },
    //     transaction_ids: [
    //       '46YGOW9MJ741LZ0Y9EXD8J',
    //       'NSBT-1-3-685741-65-1-20240729-13-10-4363-1',
    //     ],
    //     status: 'COMPLETED',
    //     start_date: '2024-07-29T16:10:35.000Z',
    //     end_date: '2024-07-29T03:00:00.000Z',
    //     charge: {
    //       summary: 'VAR',
    //       value: {
    //         currency: 'ARS',
    //         amount: 8814.35,
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-62-685741-65-1-20240729-10-10-558-1',
    //     type: 'TRANSFER',
    //     from: {
    //       bank_id: '322',
    //       account_id: '20-1-685741-1-5',
    //     },
    //     counterparty: {
    //       id: '23447081164',
    //       name: 'MACHUCA MELANY ROCIO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_RECIBIDAS',
    //       origin_credit: {
    //         cvu: '0000058100000000010919',
    //         cuit: '30717616657',
    //       },
    //       origin_debit: {
    //         cvu: '0000013000032111172523',
    //         cuit: '23447081164',
    //       },
    //     },
    //     transaction_ids: [
    //       '7L8GYKNXR7PK14QWNMPRZ5',
    //       'NSBT-1-62-685741-65-1-20240729-10-10-558-1',
    //     ],
    //     status: 'COMPLETED',
    //     start_date: '2024-07-29T22:21:05.000Z',
    //     end_date: '2024-07-29T03:00:00.000Z',
    //     charge: {
    //       summary: 'VAR',
    //       value: {
    //         currency: 'ARS',
    //         amount: 15575.6,
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-3-685741-65-1-20240729-13-10-4363-1',
    //     type: 'TRANSFER',
    //     from: {
    //       bank_id: '322',
    //       account_id: '20-1-685741-1-5',
    //     },
    //     counterparty: {
    //       id: '30716788543',
    //       name: '',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_RECIBIDAS',
    //       origin_credit: {
    //         cvu: '0000058100000000010919',
    //         cuit: '30717616657',
    //       },
    //       origin_debit: {
    //         cvu: '3220001805006856990051',
    //         cuit: '30716788543',
    //       },
    //     },
    //     transaction_ids: [
    //       '46YGOW9MJ741LZ0Y9EXD8J',
    //       'NSBT-1-3-685741-65-1-20240729-13-10-4363-1',
    //     ],
    //     status: 'COMPLETED',
    //     start_date: '2024-07-29T16:10:35.000Z',
    //     end_date: '2024-07-29T03:00:00.000Z',
    //     charge: {
    //       summary: 'VAR',
    //       value: {
    //         currency: 'ARS',
    //         amount: 8814.35,
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-62-685741-65-1-20240729-10-10-558-1',
    //     type: 'TRANSFER',
    //     from: {
    //       bank_id: '322',
    //       account_id: '20-1-685741-1-5',
    //     },
    //     counterparty: {
    //       id: '23447081164',
    //       name: 'MACHUCA MELANY ROCIO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_RECIBIDAS',
    //       origin_credit: {
    //         cvu: '0000058100000000034579',
    //         cuit: '30717616657',
    //       },
    //       origin_debit: {
    //         cvu: '0000013000032111172523',
    //         cuit: '23447081164',
    //       },
    //     },
    //     transaction_ids: [
    //       '7L8GYKNXR7PK14QWNMPRZ5',
    //       'NSBT-1-62-685741-65-1-20240729-10-10-558-1',
    //     ],
    //     status: 'COMPLETED',
    //     start_date: '2024-07-29T22:21:05.000Z',
    //     end_date: '2024-07-29T03:00:00.000Z',
    //     charge: {
    //       summary: 'VAR',
    //       value: {
    //         currency: 'ARS',
    //         amount: 15575.6,
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-3-685741-65-1-20240729-13-10-4363-1',
    //     type: 'TRANSFER',
    //     from: {
    //       bank_id: '322',
    //       account_id: '20-1-685741-1-5',
    //     },
    //     counterparty: {
    //       id: '30716788543',
    //       name: '',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_RECIBIDAS',
    //       origin_credit: {
    //         cvu: '0000058100000000034579',
    //         cuit: '30717616657',
    //       },
    //       origin_debit: {
    //         cvu: '3220001805006856990051',
    //         cuit: '30716788543',
    //       },
    //     },
    //     transaction_ids: [
    //       '46YGOW9MJ741LZ0Y9EXD8J',
    //       'NSBT-1-3-685741-65-1-20240729-13-10-4363-1',
    //     ],
    //     status: 'COMPLETED',
    //     start_date: '2024-07-29T16:10:35.000Z',
    //     end_date: '2024-07-29T03:00:00.000Z',
    //     charge: {
    //       summary: 'VAR',
    //       value: {
    //         currency: 'ARS',
    //         amount: 8814.35,
    //       },
    //     },
    //   },
    // ];
    const accountCredits = [];
    // for (const transaction of data) {
    //   const { details, charge } = transaction;
    //   const { origin_credit } = details;
    //   const { value } = charge;
    //   const index = accountCredits.findIndex(
    //     (e) => e.cvu === origin_credit.cvu,
    //   );
    //   if (index === -1) {
    //     accountCredits.push({
    //       cvu: origin_credit.cvu,
    //       amount: value.amount,
    //       count: 1
    //     });
    //   } else {
    //     accountCredits[index].amount =
    //       Number(accountCredits[index].amount) + Number(value.amount);
    //       accountCredits[index].count =
    //         Number(accountCredits[index].count) + 1;
    //   }
    // }

    return accountCredits;
  }
}
