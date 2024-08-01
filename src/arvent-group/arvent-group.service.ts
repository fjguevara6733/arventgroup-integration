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
        obp_limit: 50,
        obp_offset: 0,
        obp_from_date: '2024-07-30',
        obp_to_date: '2024-07-30',
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
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-4054-1',
    //     counterparty: {
    //       id: '23410529874',
    //       name: 'LOPEZ GILDA MELANI',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100062032173824',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:16Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -30620.96,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225822-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147680306.3,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-4041-1',
    //     counterparty: {
    //       id: '27466965095',
    //       name: 'DELFINO DARLENE IARA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100051074316504',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:13Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15310.48,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225820-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147710927.26,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7195-1',
    //     counterparty: {
    //       id: '27389207433',
    //       name: 'GERSTNER AYELEN MICAELA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000013000032221859129',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:12Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221457-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147726237.74,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-4022-1',
    //     counterparty: {
    //       id: '27233156731',
    //       name: 'OVEJERO MARIA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0140132103505760141514',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:11Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225818-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147734025.54,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7179-1',
    //     counterparty: {
    //       id: '20468353726',
    //       name: 'COEN MITRANI MARCO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100053263933466',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:10Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -8358.9,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221455-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147741680.78,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-4012-1',
    //     counterparty: {
    //       id: '20235543541',
    //       name: 'TOVANI CRISTIAN MIGUEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100035672516490',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:09Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -22965.72,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225821-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147750039.68,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-4009-1',
    //     counterparty: {
    //       id: '27260402698',
    //       name: 'MANSILLA PERLA GABRIELA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000007900272604026982',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:08Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225816-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147773005.4,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7170-1',
    //     counterparty: {
    //       id: '20427620450',
    //       name: 'TWERDOCHLIB LUCAS EZEQUIEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100061122565682',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:08Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221458-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147780660.64,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7164-1',
    //     counterparty: {
    //       id: '20345196898',
    //       name: 'MARTINEZ CARLOS PILAR',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '1430001713017041520013',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:07Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221453-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147788448.44,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-4001-1',
    //     counterparty: {
    //       id: '23427639894',
    //       name: 'BORCHEIDT YESICA BELEN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100045557949268',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:06Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15310.48,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225819-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147796236.24,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7153-1',
    //     counterparty: {
    //       id: '20417143549',
    //       name: 'SILVERO DIAGO CARLOS GABRIEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100008849749342',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:06Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221456-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147811546.72,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-3990-1',
    //     counterparty: {
    //       id: '20467574257',
    //       name: 'ENRIQUEZ ROCHA GUSTAVO GASTON',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100061041757571',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:05Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -12758.73,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225814-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147819334.52,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-26-685741-65-1-20240729-102-10-1223-1',
    //     counterparty: {
    //       id: '27422990920',
    //       name: 'ROBLEDO DANIELA ELIZABETH',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100012019258499',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:04Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15840.71,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228596-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147832093.25,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7139-1',
    //     counterparty: {
    //       id: '27436545261',
    //       name: 'GARCIA CAMILA BELEN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100077044047821',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:04Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221451-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147847933.96,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-3975-1',
    //     counterparty: {
    //       id: '23369022784',
    //       name: 'PARODI VANESA BELEN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100084826646286',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225817-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147855721.76,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-7120-1',
    //     counterparty: {
    //       id: '20306791681',
    //       name: 'BARRIOS LUIS ALBERTO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100045676496946',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:57:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221454-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147863377,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-3076-1',
    //     counterparty: {
    //       id: '23469895939',
    //       name: 'SEVERINO TOBIAS ARIEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100073311833212',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:08Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225812-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147871131.63,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-6118-1',
    //     counterparty: {
    //       id: '27319794218',
    //       name: 'RUGGILO YANINA EDITH',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100093893919067',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:08Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15575.6,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221452-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147878786.87,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-6102-1',
    //     counterparty: {
    //       id: '27406430249',
    //       name: 'NU#EZ DANA CRISTINA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100051837248936',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:06Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221450-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147894362.47,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-6096-1',
    //     counterparty: {
    //       id: '20324407260',
    //       name: 'RODRIGUEZ JONATAN DAVID',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100012813507519',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:05Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221447-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147902150.27,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-26-685741-65-1-20240729-102-10-548-1',
    //     counterparty: {
    //       id: '27349572228',
    //       name: 'STRINA YESSICA ALEJANDRA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100046213148050',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:04Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7887.21,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228595-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147909904.9,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-3056-1',
    //     counterparty: {
    //       id: '20452811473',
    //       name: 'CARDOSO TOMAS AGUSTIN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100016711643159',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225811-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147917792.11,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-6083-1',
    //     counterparty: {
    //       id: '20372528479',
    //       name: 'CALDERON DAVID EMANUEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100071944055557',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:54:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7787.8,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221448-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147925447.35,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5094-1',
    //     counterparty: {
    //       id: '27463925351',
    //       name: 'CASARES LILIANA LUC­A SOLEDAD',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100054638085959',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:14Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221446-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147933235.15,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2069-1',
    //     counterparty: {
    //       id: '27452922547',
    //       name: 'ALVAREZ AZUL JORGELINA AINARA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '4530000800016805107064',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:13Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225810-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147940989.78,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5086-1',
    //     counterparty: {
    //       id: '20217980853',
    //       name: 'MANSILLA JUAN DAUMERIO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000007900202179808539',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:13Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221445-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147948645.02,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2061-1',
    //     counterparty: {
    //       id: '20491198568',
    //       name: 'GAMIETEA THIAGO LIONEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100007999366506',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:12Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -8931.11,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225809-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147956399.65,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2054-1',
    //     counterparty: {
    //       id: '27308744537',
    //       name: 'ESCOBAR ROSANA NOEMI',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0070132330004035587939',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:11Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225808-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147965330.76,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5079-1',
    //     counterparty: {
    //       id: '27294863791',
    //       name: 'NUÑEZ CARLA PAOLA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0140033503502553348619',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:11Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221444-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147972986,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-25-685741-65-1-20240729-102-10-9895-1',
    //     counterparty: {
    //       id: '27335298018',
    //       name: 'RUIZ ADRIANA BELEN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0140147503403351930108',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:10Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15840.71,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228594-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147980740.63,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5070-1',
    //     counterparty: {
    //       id: '27390000389',
    //       name: 'MOLINA MAYRA FLORENCIA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100066886538486',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:10Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221443-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 147996581.34,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2039-1',
    //     counterparty: {
    //       id: '23411964159',
    //       name: 'MIRARCHI LUCAS MARTIN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100018515618401',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:09Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225807-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148004335.97,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2032-1',
    //     counterparty: {
    //       id: '27416712692',
    //       name: 'GOMEZ MICAELA FLORENCIA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0110031030003128321465',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:08Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225806-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148011991.21,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5067-1',
    //     counterparty: {
    //       id: '20084259609',
    //       name: 'AMARILLO ERNESTO LORENZO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100053203202357',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:08Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221442-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148019646.45,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-25-685741-65-1-20240729-102-10-9883-1',
    //     counterparty: {
    //       id: '27134535216',
    //       name: 'GOMEZ MERCEDES DEL CARMEN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100094169072293',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:07Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7920.35,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228592-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148027401.08,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-25-685741-65-1-20240729-102-10-9884-1',
    //     counterparty: {
    //       id: '27455830325',
    //       name: 'CARMONA FIORELLA AGUSTINA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100064977908088',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:07Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -34177.94,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228593-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148035321.43,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5059-1',
    //     counterparty: {
    //       id: '27447370501',
    //       name: 'ESPINDOLA TAMARA SOLEDAD',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100042846453150',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:07Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221441-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148069499.37,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2016-1',
    //     counterparty: {
    //       id: '20344325066',
    //       name: 'SANTANA JOSE LUIS',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100041855884458',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:06Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15310.48,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225805-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148077254,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5048-1',
    //     counterparty: {
    //       id: '20443484125',
    //       name: 'LEWYLLE LEANDRO',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0720205888000043300004',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:06Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221440-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148092564.48,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-2009-1',
    //     counterparty: {
    //       id: '27372555551',
    //       name: 'ESCUDERO CARLA DAIANA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0110050130005015356701',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:05Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225804-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148100319.11,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-25-685741-65-1-20240729-102-10-9859-1',
    //     counterparty: {
    //       id: '27420801934',
    //       name: 'DELGADO MICAELA MARIA BELEN',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100007626910719',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:04Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7920.35,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228591-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148107974.35,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5036-1',
    //     counterparty: {
    //       id: '23368075124',
    //       name: 'CABRAL NADIA NOELIA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0140133803505854274524',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:04Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15509.26,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221439-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148115894.7,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-25-685741-65-1-20240729-102-10-9856-1',
    //     counterparty: {
    //       id: '27294061075',
    //       name: 'COSTA SILVIA ROMINA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100038587174551',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7920.35,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002228590-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148131403.96,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-31-685741-65-1-20240729-101-10-1991-1',
    //     counterparty: {
    //       id: '27234041709',
    //       name: 'CELESTINO NORMA IRIS',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100088625923139',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7655.24,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002225803-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148139324.31,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-5024-1',
    //     counterparty: {
    //       id: '20394164322',
    //       name: 'ORELLANA FEDERICO LEONEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0140133803505859381047',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:51:03Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221438-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148146979.55,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-4130-1',
    //     counterparty: {
    //       id: '27459349923',
    //       name: 'VARGAS RUIZ JOHANA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0200931911000009449480',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:48:22Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221437-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148154734.18,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-4109-1',
    //     counterparty: {
    //       id: '27471017693',
    //       name: 'BARRETO LUDMILA EVANGELINA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100095980679357',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:48:18Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221435-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148162488.81,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-4087-1',
    //     counterparty: {
    //       id: '20434138990',
    //       name: 'WEINZETTEL AGUSTIN ALEJANDRA',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0110638730063831382229',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:48:16Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7754.63,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221433-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148170243.44,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-4083-1',
    //     counterparty: {
    //       id: '20464275828',
    //       name: 'CORDARA SALVADOR',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000003100047562053505',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:48:14Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -15638.5,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221436-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148177998.07,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    //   {
    //     id: 'NSBT-1-900-685741-65-1-20240729-101-10-4076-1',
    //     counterparty: {
    //       id: '20274525291',
    //       name: 'LOBO ALBERTO GABRIEL',
    //       id_type: 'CUIT_CUIL',
    //       bank_routing: {
    //         scheme: 'UNAVAILABLE',
    //         address: '',
    //       },
    //       account_routing: {
    //         scheme: 'CBU',
    //         address: '0140109303504459346481',
    //       },
    //     },
    //     details: {
    //       type: 'TRANSFERENCIAS_ENVIADAS',
    //       description: 'Transferencia Debito',
    //       posted: '2024-07-29T00:00:00Z',
    //       completed: '2024-07-29T23:48:13Z',
    //       value: {
    //         currency: 'ARS',
    //         amount: -7721.52,
    //       },
    //       motive: 'VAR Pago Alfred',
    //       reference_number: '1-30716628600-000000002221431-1',
    //       new_balance: {
    //         currency: 'ARS',
    //         amount: 148193636.57,
    //       },
    //     },
    //     metadata: {
    //       tags: [],
    //     },
    //     this_account: {
    //       id: '20-1-685741-1-5',
    //       kind: '20',
    //       bank_routing: {
    //         scheme: 'NAME',
    //         address: 'BANCO INDUSTRIAL S.A.',
    //         code: '322',
    //       },
    //       account_routing: {
    //         scheme: 'CVU',
    //         address: '0000058100000000034531',
    //       },
    //     },
    //   },
    // ];
    // const accountCredits = [];
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

    // return accountCredits;
  }
}
