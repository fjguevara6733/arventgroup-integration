import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  arventGetTransactions,
  changeAliasByCvu,
  createClientCvu,
  createClientCvuBind,
  DoRequestDto,
  DoRequestDtoDebin,
  updateNameBind,
} from 'src/common/dto/create-arvent-group.dto';
import {
  BindRequestInterface,
  Client,
} from 'src/common/dto/create-arvent-group.interface.';
import {
  CoinsFiat,
  ConceptBind,
  KycDocTypes,
  normalResponse,
  TypeTransactions,
} from 'src/common/enum';
import { EntityManager } from 'typeorm';
import * as https from 'https';
import axios, { AxiosRequestConfig } from 'axios';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PersonDTO, UserCompanyDTO } from 'src/common/dto/user.dto';
import { UploadedDocDto } from 'src/common/dto/upload-file.dto';

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
    {
      email: 'marint',
      id: 1,
      cvu: '0000058100000000034531',
    },
    {
      email: 'chronospay@integraciones.com',
      id: 1,
      cvu: '0000058105193400884642',
    },
    {
      email: 'pablo@payexsrl.com',
      id: 1,
      cvu: '0000058104351016263797',
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
      console.log('error', error?.response);
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

  /**
   * @method doTransaction
   * Servicio para generar el pay-out
   * @param body
   * @returns
   */
  async doTransaction(body: DoRequestDto) {
    const { destinationCbu, amount, email } = body;
    const emails = this.datos.find(
      (e) => e.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
    );
    if (emails === undefined) return 'Email no asociado a ninguna cuenta';
    const balances = await this.stateBalance(`WHERE cvu=${emails.cvu}`).then(
      (response) => response[0],
    );

    if (Number(balances.amount) < Number(amount)) throw 'Fondos insuficientes';

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

    const response = await axios(config)
      .then((response) => response)
      .catch((error) => {
        console.log(error.response.data);
        throw error?.response?.data?.message;
      });
    const data = response.data;

    const dataString = JSON.stringify(data);
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction)
          VALUES ('${params.origin_id}', '${dataString}', '${data.status}', '${body.email}', '${this.convertDate()}')`,
      )
      .then((response) => response)
      .catch((error) => error);

    await this.arventGroupEntityManager
      .query(
        `INSERT INTO payments (idTransaction,response, status, email, dateTransaction)
          VALUES ('${params.origin_id}', '${dataString}', '${data.status}', '${body.email}', '${this.convertDate()}')`,
      )
      .then((response) => response)
      .catch((error) => error);

    const newBalance = Number(balances.amount) - Number(body.amount);
    await this.arventGroupEntityManager
      .query(
        ` UPDATE balance SET amount = '${newBalance}' WHERE id = ${balances.id}`,
      )
      .then((response) => response)
      .catch((error) => error);

    return dataString;
  }

  /**
   * @method transactionReport
   * Servicio para listar las transacciones
   * @returns
   */
  async transactionReport(body: arventGetTransactions) {
    if (!this.validateEnum(TypeTransactions, body.type))
      throw 'Tipo de transacción no válida';

    const emails = await this.getEmail(body.accountEmail);
    if (emails === undefined) return 'Email no asociado a ninguna cuenta';

    if (body.limit === 0) body.limit = 10;

    const typeTransaction =
      body.type === 'all' ? '' : `AND type = '${body.type}'`;
    const data = await this.arventGroupEntityManager.query(
      `SELECT * FROM transactions
      WHERE email = '${body.accountEmail}' ${typeTransaction}
      LIMIT ${body.limit} OFFSET ${body.offset}; `,
    );

    const response = data.map((e) => {
      return {
        id: e.idTransaction,
        status: e.status,
        dateTransaction: e.dateTransaction,
        type: e.type,
        emailOriginDebit: e.email,
        responseBank:
          typeof e.response === 'string' ? JSON.parse(e.response) : e.response,
      };
    });

    return response;
  }

  /**
   * @method updateStatusTransactions
   * Servicio para actualizar los estados de las transacciones realizadas
   * @returns
   */
  async updateStatusTransactions() {
    const data = await this.arventGroupEntityManager.query(
      'SELECT * FROM payments WHERE status = "IN_PROGRESS"',
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
          `UPDATE payments SET status = '${dataResponse.status}', response = '${JSON.stringify(dataResponse)}' WHERE id = ${transaction.id}`,
        )
        .then((response) => response)
        .catch((error) => error);
      await this.arventGroupEntityManager
        .query(
          `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction, type)
          VALUES ('${transaction.idTransaction}', '${JSON.stringify(response)}', '${response.status}', '${transaction.email}','${response.start_date.replace('T', ' ').replace('Z', '')}', "debit")`,
        )
        .then((response) => response)
        .catch((error) => error);
    }
    return true;
  }

  //tentiva de su uso completo
  async creditTransactions() {
    const accountCredits = [];
    const values = [];
    const webhooks = await this.arventGroupEntityManager
      .createQueryBuilder()
      .select('*')
      .from('webhook', 'w')
      .where('w.status = :status', { status: 'active' })
      .execute();

    const transactions = webhooks.map((webhook) => {
      const dataJson = JSON.parse(webhook.response);
      return {
        id: webhook.id,
        data: dataJson,
        type:
          dataJson.type === 'transfer.cvu.received' ||
          dataJson.type === undefined
            ? 'credit'
            : 'debin',
        date: webhook.date,
      };
    });

    for (const transaction of transactions) {
      const { type } = transaction;

      if (type === 'credit') {
        await this.processCreditTransaction(
          transaction,
          accountCredits,
          values,
        );
      } else if (type === 'debin') {
        await this.processDebinTransaction(transaction, accountCredits, values);
      }
    }

    if (values.length > 0) {
      await this.insertTransactions(values);
    }

    await this.updateBalances(accountCredits);

    return accountCredits;
  }

  private async processCreditTransaction(transaction, accountCredits, values) {
    const cleanData = transaction.data?.data || transaction.data;
    const { details, this_account } = cleanData;
    const value = details.value || cleanData.charge.value;
    const accountrouting = this_account
      ? this_account.account_routing.address
      : details.origin_credit.cvu;

    this.updateAccountCredits(accountCredits, accountrouting, value.amount);

    const searchCVU = this.datos.find((e) => e.cvu === accountrouting);

    if (searchCVU) {
      const dataString = JSON.stringify(transaction.data);
      values.push(
        `('${transaction.data.id}', '${dataString}', 'COMPLETED', '${searchCVU.email}', '${(details.completed || cleanData.business_date).replace('T', ' ').replace('Z', '')}', 'credit')`,
      );
      await this.markWebhookAsInactive(transaction.id);
    }
  }

  private async processDebinTransaction(transaction, accountCredits, values) {
    const { details, charge, end_date } = transaction.data;
    const { buyerAccountCBU, origin_id } = details;

    const transactionData = await this.arventGroupEntityManager.query(
      `SELECT * FROM transactions WHERE idTransaction = '${origin_id}' AND type = 'debit' AND status = 'PENDING'`,
    );

    this.updateAccountCredits(
      accountCredits,
      buyerAccountCBU,
      -charge.value.amount,
    );

    if (transactionData.length > 0) {
      const searchCVU = this.datos.find(
        (e) => e.email === transactionData[0].email,
      );
      if (searchCVU) {
        const dataString = JSON.stringify(transaction.data);
        values.push(
          `('${details.origin_id}', '${dataString}', 'COMPLETED', '${searchCVU.email}', '${end_date.replace('T', ' ').replace('Z', '')}', 'debit')`,
        );
        await this.markWebhookAsInactive(transaction.id);
      }
    }
  }

  private updateAccountCredits(accountCredits, cvu, amount) {
    const index = accountCredits.findIndex((e) => e.cvu === cvu);
    if (index === -1) {
      accountCredits.push({ cvu, amount, count: 1 });
    } else {
      accountCredits[index].amount += parseFloat(amount);
      accountCredits[index].count += 1;
    }
  }

  private async markWebhookAsInactive(id) {
    await this.arventGroupEntityManager
      .createQueryBuilder()
      .update('webhook')
      .set({ status: 'inactive' })
      .where('id = :id', { id })
      .execute();
  }

  private async insertTransactions(values) {
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO transactions (idTransaction, response, status, email, dateTransaction, type) VALUES ${values.join(',')}`,
      )
      .catch((error) => {
        console.error('Error inserting transactions:', error);
      });
  }

  private async updateBalances(accountCredits) {
    const balances = await this.stateBalance('');
    for (const account of accountCredits) {
      const dataBalance = balances.find((e) => e.cvu === account.cvu);
      if (dataBalance) {
        const total = Number(dataBalance.amount) + account.amount;
        await this.arventGroupEntityManager
          .query(
            `UPDATE balance SET amount = '${total}' WHERE id = ${dataBalance.id}`,
          )
          .catch((error) => {
            console.error('Error updating balance:', error);
          });
      }
    }
  }

  /**
   * @method stateBalance
   * Servicio para obtener los balances
   * @param where
   * @param isCalled
   * @returns
   */
  async stateBalance(where = '', isCalled = false) {
    if (isCalled) {
      const emails = await this.getEmail(where);
      console.log('error emails', emails);

      where = `WHERE accountId = ${emails.id}`;
    }
    return await this.arventGroupEntityManager
      .query(`SELECT * FROM balance ${where}`)
      .catch((error) => {
        console.error('Error fetching balances:', error);
      });
  }

  /**
   * @method createDeposit
   * Servicio para crear peticion de DEBIN (credito)
   * @param body
   * @returns
   */
  async createDeposit(body: DoRequestDtoDebin) {
    const { originCbu, amount, email } = body;
    const emails = await this.getEmail(email);

    if (emails === undefined) return 'Email no asociado a ninguna cuenta';

    const params: BindRequestInterface = {
      origin_id: uuidv4().substring(0, 14).replace(/-/g, '0'),
      value: {
        currency: CoinsFiat.ARS,
        amount: Number(amount).toFixed(2),
      },
      to: {
        cbu: originCbu,
      },
      concept: ConceptBind.VAR,
      expiration: 20,
    };

    const headers = {
      Authorization: `JWT ${await this.getToken()}`,
    };
    const url: string = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transaction-request-types/DEBIN/transaction-requests`;
    const config: AxiosRequestConfig = {
      method: 'POST',
      url,
      data: params,
      headers,
      httpsAgent: this.httpsAgent,
    };

    const response = await axios(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error?.response?.data?.message;
      });

    const { start_date } = response;
    const dateClean = start_date
      .replace('T', ' ')
      .replace('Z', '')
      .split('.')[0];
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction, type)
          VALUES ('${params.origin_id}', '${JSON.stringify(response)}', '${response.status}', '${emails.email}','${dateClean}', 'credit')`,
      )
      .then((response) => response)
      .catch((error) => {
        return error;
      });

    return response;
  }

  /**
   * @method updateStatusTransactions
   * Servicio para actualizar los estados de las transacciones realizadas
   * @returns
   */
  async updateStatusTransactionsCredit() {
    let newBalance = 0;
    const data = await this.arventGroupEntityManager.query(
      `SELECT t1.* FROM transactions t1
       WHERE t1.status IN("PENDING", "AWAITING_CONFIRMATION") 
       AND t1.type = "credit" 
       AND t1.dateTransaction = (
       SELECT MAX(t2.dateTransaction) 
       FROM transactions t2 
       WHERE t2.idTransaction = t1.idTransaction
       )
       GROUP BY idTransaction`,
    );
    const balances = await this.stateBalance().then((response) => response);

    for (const transaction of data) {
      const responseTransaction = JSON.parse(transaction.response);
      const { transaction_ids } = responseTransaction;
      const emails = this.datos.find(
        (e) =>
          e.email.toLocaleLowerCase() === transaction.email.toLocaleLowerCase(),
      );
      const balanceAccount = balances.find((e) => e.cvu === emails.cvu);
      const headers = {
        Authorization: `JWT ${await this.getToken()}`,
      };
      const url: string = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transaction-request-types/DEBIN/${transaction_ids[0]}`;
      const config: AxiosRequestConfig = {
        method: 'GET',
        url,
        headers,
        httpsAgent: this.httpsAgent,
      };

      const response = await axios(config)
        .then((response) => response.data)
        .catch((error) => {
          console.log(error.response.data);
          throw error?.response?.data?.message;
        });
      const existingTransaction = await this.arventGroupEntityManager.query(
        `SELECT * FROM transactions WHERE idTransaction = '${transaction.idTransaction}' AND status = '${response.status}'`,
      );

      if (existingTransaction.length === 0) {
        await this.arventGroupEntityManager
          .query(
            `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction, type)
        VALUES ('${transaction.idTransaction}', '${JSON.stringify(response)}', '${response.status}', '${transaction.email}','${response.start_date.replace('T', ' ').replace('Z', '')}', "credit")`,
          )
          .then((response) => response)
          .catch((error) => error);

        const { charge } = response;
        newBalance =
          Number(balanceAccount.amount) + Number(charge.value.amount);
        await this.arventGroupEntityManager
          .query(
            `UPDATE balance SET amount = '${newBalance}' WHERE id = ${balanceAccount.id}`,
          )
          .then((response) => response)
          .catch((error) => error);
      }
    }
    return true;
  }

  /**
   * @method transactionReportDebit
   * Servicio para listar los retiros
   * @returns
   */
  async transactionReportDebit(body: arventGetTransactions) {
    const emails = await this.getEmail(body.accountEmail);
    if (emails === undefined) return 'Email no asociado a ninguna cuenta';

    if (body.limit === 0) body.limit = 10;

    const data = await this.arventGroupEntityManager.query(
      `SELECT * FROM payments 
      WHERE email = '${body.accountEmail}' 
      LIMIT ${body.limit} OFFSET ${body.offset}; `,
    );

    const response = data.map((e) => {
      return {
        id: e.idTransaction,
        status: e.status,
        dateTransaction: e.dateTransaction,
        emailOriginDebit: e.email,
        responseBank: JSON.parse(e.response),
      };
    });
    return response;
  }

  /**
   * @method createNaturalPerson
   * Servicio para crear una persona natural
   * @param body
   * @returns
   */
  async createNaturalPerson(body: PersonDTO, key: string = '') {
    if (!this.validateEnum(normalResponse, body.regulatedEntity20))
      throw 'El campo entidad regulada solo permite los valores de Si o No';

    if (!this.validateEnum(normalResponse, body.politicPerson))
      throw 'El campo persona política solo permite los valores de Si o No';

    if (this.validarNumeroArgentina(body.phone) === false)
      throw 'El campo telefono solo admite telefonos de Argentina';

    const user = await this.arventGroupEntityManager.query(
      `SELECT * FROM \`user\` WHERE cuitCuil = '${body.cuitCuil}' or email = '${body.email}'`,
    );
    if (user[0]) throw 'Ya existe un cliente con este CUIT/CUIL o email.';
    const account = key
      ? await this.chronosEntityManager
          .query(`SELECT * FROM accounts WHERE \`key\` = '${key}'`)
          .then((response) => response[0])
      : 0;
    const uuid = uuidv4();
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO \`user\` (regulatedEntity20, politicPerson, phone, occupation, name, locality, lastName, fiscalSituation, cuitCuil, postalCode, country, address, uuid, email, "accountId")
       VALUES ('${body.regulatedEntity20}', '${body.politicPerson}', '${body.phone}', '${body.occupation}', '${body.name}', '${body.locality}', '${body.lastName}', '${body.fiscalSituation}', '${body.cuitCuil}', ${body.postalCode}, '${body.country}', '${body.address}', '${uuid}', '${body.email}', ${account.id})`,
      )
      .catch((error) => {
        console.log('error', error);

        return error.driverError;
      })
      .then((result) => result);

    return { customerId: uuid, ...body };
  }

  /**
   * @method createJuridicPerson
   * Servicio para crear una persona juridica
   * @param body
   * @returns
   */
  async createJuridicPerson(body: UserCompanyDTO) {
    if (!this.validateEnum(normalResponse, body.regulatedEntity20))
      throw 'El campo entidad regulada solo permite los valores de Si o No';

    if (!this.validateEnum(normalResponse, body.politicPerson))
      throw 'El campo persona política solo permite los valores de Si o No';

    if (this.validarNumeroArgentina(body.headquartersPhone) === false)
      throw 'El campo telefono solo admite telefonos de Argentina';

    const user = await this.arventGroupEntityManager.query(
      `SELECT * FROM user_companies WHERE cuit_cdi_cie = ${body.cuitCDICIE} OR email = '${body.email}'`,
    );
    if (user[0]) throw 'Ya existe un cliente con este CUIT/CUIL o Email.';

    const uuid = uuidv4();
    await this.arventGroupEntityManager
      .query(
        ` INSERT INTO user_companies (business_name, cuit_cdi_cie, address, postal_code, city, country, 
      registration_date, main_activity, headquarters_phone, email, subject_to_article_20, politic_person, regulated_entity_20, 
      participation_percentage, name, last_name, uuid)
      VALUES ('${body.businessName}', '${body.cuitCDICIE}', '${body.address}', '${body.postalCode}', '${body.city}', 
      '${body.country}', '${body.registrationDate}', '${body.mainActivity}', '${body.headquartersPhone}', '${body.email}',
       '${body.subjectToArticle20}', '${body.politicPerson}', '${body.regulatedEntity20}', '${body.participationPercentage}', '${body.name}', '${body.lastName}', '${uuid}')`,
      )
      .then((result) => result)
      .catch((error) => error);

    return { customerId: uuid, ...body };
  }

  /**
   * @method createClientCvu
   * Servicio para crear una cvu en bind
   * @param body
   * @returns
   */
  async createClientCvu(body: createClientCvu) {
    const user = await this.validateUser(body.customerId);
    const emails = await this.getEmail(user.email);
    const cuit = user.isNatural ? user.cuitCuil : user.cuit_cdi_cie;
    const files = await this.arventGroupEntityManager
      .query(`SELECT * FROM files WHERE cuit ='${cuit}' `)
      .then((response) => response);

    if (!files) throw 'El usuario no cuenta con todos los documentos cargados';
    if (user.isNatural && files.length < 2)
      throw 'El usuario no cuenta con todos los documentos cargados';
    else if (!user.isNatural && files.length < 5)
      throw 'El usuario no cuenta con todos los documentos cargados';

    const uuid = uuidv4().replace(/-/g, '').substring(0, 10); // Genera un UUID y elimina los guiones
    const numericUUID = parseInt(uuid, 16);
    const data: Client = {
      client_id: numericUUID,
      currency: 'ARS',
      name: user.isNatural
        ? `${user.name} ${user.lastName}`
        : `${user.name} ${user.last_name}`,
      cuit: user.isNatural ? user.cuitCuil : user.cuit_cdi_cie,
    };
    await this.validateClient(data.cuit);

    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/wallet/cvu`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url,
      data,
      headers,
      httpsAgent: this.httpsAgent,
    };
    const response = await axios(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error?.response?.data?.message;
      });

    await this.arventGroupEntityManager
      .query(
        `INSERT INTO clients (client_id, cuit, cvu, creation_date, accountId) VALUES ('${data.client_id}', '${data.cuit}', '${response.cvu}', '${this.convertDate()}', ${emails.id})`,
      )
      .then((response) => response)
      .catch((error) => error);

    await this.arventGroupEntityManager
      .query(
        `INSERT INTO balance (cvu, amount, accountId) VALUES ('${response.cvu}', 0, ${emails.id})`,
      )
      .then((response) => response)
      .catch((error) => error);

    return response;
  }

  async createCvuBind(body: createClientCvuBind) {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 10); // Genera un UUID y elimina los guiones
    const numericUUID = parseInt(uuid, 16);
    const data: Client = {
      client_id: numericUUID,
      currency: 'ARS',
      name: body.name,
      cuit: body.cuit,
    };
    await this.validateClient(data.cuit);

    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/wallet/cvu`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url,
      data,
      headers,
      httpsAgent: this.httpsAgent,
    };
    const response = await axios(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error?.response?.data?.message;
      });

    await this.arventGroupEntityManager
      .query(
        `INSERT INTO clients (client_id, cuit, cvu, creation_date) VALUES ('${data.client_id}', '${data.cuit}', '${response.cvu}', '${this.convertDate()}')`,
      )
      .then((response) => response)
      .catch((error) => error);

    await this.arventGroupEntityManager
      .query(`INSERT INTO balance (cvu, amount) VALUES ('${response.cvu}', 0)`)
      .then((response) => response)
      .catch((error) => error);

    return response;
  }

  /**
   * @method uploadFile
   * Servicio para subir archivos
   * @param body
   * @param file
   * @returns
   */
  async uploadFile(body: UploadedDocDto, file: Express.Multer.File) {
    if (!this.validateEnum(KycDocTypes, body.docType))
      throw 'El campo doctType sólo permite los valores definidos en el enumerador';

    const user = await this.validateUser(body.customerId);

    if (
      user.isNatural &&
      body.docType !== KycDocTypes.idCardBack &&
      body.docType !== KycDocTypes.idCardFront
    )
      throw 'El docType no es asignable para un usuario natural.';

    const imageData = `"${file.buffer.toString('base64')}"`;
    const cuit = user.isNatural ? user.cuitCuil : user.cuit_cdi_cie;
    const files = await this.arventGroupEntityManager
      .query(
        `SELECT * FROM files WHERE cuit ='${cuit}' AND typefile = '${body.docType}'`,
      )
      .then((response) => response[0]);

    if (files) {
      const id = files.id;
      const queryUpdate = `UPDATE files SET data=$1, mimetype = $2 WHERE id = $3`;

      await this.arventGroupEntityManager.query(queryUpdate, [
        imageData,
        file.mimetype,
        id,
      ]);

      return 'Imagen actualizada correctamente';
    }

    const sql =
      'INSERT INTO files (typefile, filename, mimetype, cuit, data) VALUES ($1, $2, $3, $4, $5)';
    await this.arventGroupEntityManager
      .query(sql, [
        body.docType,
        file.originalname,
        file.mimetype,
        user.isNatural ? user.cuitCuil : user.cuit_cdi_cie,
        imageData,
      ])
      .catch((error) => {
        return error;
      });

    return 'Imagen subida con éxito';
  }

  /**
   * @method getDataUser
   * Servicio para obtener toda la informacion del cliente
   * @param customerId
   * @returns
   */
  async getDataUser(customerId) {
    const user = await this.validateUser(customerId);
    const cuit = user.isNatural ? user.cuitCuil : user.cuit_cdi_cie;
    const files = await this.arventGroupEntityManager.query(
      `SELECT * FROM files WHERE cuit ='${cuit}'`,
    );
    const dataClient = await this.validateClient(cuit, false);

    const id = user.uuid;
    delete user.uuid;
    delete user.isNatural;
    delete user.id;

    return {
      cvu: dataClient ? dataClient.cvu : '',
      id,
      ...user,
      files: files.map((e) => {
        return {
          docType: e.typefile,
          imageBuffer: e.data,
          typeImage: e.mimetype,
        };
      }),
    };
  }

  async getAccount(cvu: string) {
    try {
      const headers = {
        Authorization: `JWT ${await this.getToken()}`,
      };
      const response = await axios.get(`${this.urlBind}/accounts/cbu/${cvu}`, {
        headers,
        httpsAgent: this.httpsAgent,
      });

      if (response.data.owners.length === 0)
        throw new Error('CVU invalida para operar.');

      return response.data;
    } catch (error) {
      console.log(error?.response?.data);
      throw new Error(error?.response?.data?.message);
    }
  }

  async changeAlias(body: changeAliasByCvu) {
    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/wallet/alias`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url,
      data: body,
      headers,
      httpsAgent: this.httpsAgent,
    };
    const response = await axios(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error?.response?.data?.message;
      });

    return response;
  }

  private async validateUser(customerId: string) {
    const existClient = await this.arventGroupEntityManager
      .query(
        `
      SELECT * FROM \`user\` WHERE uuid = '${customerId}'`,
      )
      .then((response) => response[0])
      .catch((error) => error);
    const existClientJuridic = await this.arventGroupEntityManager
      .query(
        `
      SELECT * FROM "user_companies" WHERE uuid = '${customerId}'`,
      )
      .then((response) => response[0])
      .catch((error) => error);

    if (!existClient && !existClientJuridic)
      throw 'No existe un cliente con este customerId';

    return existClient
      ? { isNatural: true, ...existClient }
      : { isNatural: false, ...existClientJuridic };
  }

  private async validateClient(cuit: string, needError = true) {
    const existCvu = await this.arventGroupEntityManager
      .query(
        `
      SELECT * FROM clients WHERE cuit = '${cuit}'`,
      )
      .then((response) => response[0])
      .catch((error) => error);

    if (existCvu && needError)
      throw 'Este cuit ya cuenta con una cvu creada, por favor verifique';

    return existCvu;
  }

  private validateEnum(dataEnum: any, data: string) {
    return Object.values(dataEnum)
      .filter((e) => {
        if (typeof e === 'string') return e;
      })
      .includes(data);
  }

  private validarNumeroArgentina(number) {
    // Expresión regular para validar un número de teléfono argentino con solo números
    const regexTelefonoArgentinoNumeros = /^(?:\+?54)?\d{10}$/;

    // Verificar si el número coincide con la expresión regular
    return regexTelefonoArgentinoNumeros.test(number);
  }

  private convertDate() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = fecha.getMonth() + 1; // Sumamos 1 porque los meses empiezan en 0 (enero es 0)
    const day = fecha.getDate();
    const hours = fecha.getHours();
    const minutes = fecha.getMinutes();
    const seconds = fecha.getSeconds();

    // Formatear los valores para asegurarse de que tengan dos dígitos
    const formattedMonth = month < 10 ? '0' + month : month;
    const formattedDay = day < 10 ? '0' + day : day;
    const formattedHours = hours < 10 ? '0' + hours : hours;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    const formattedSeconds = seconds < 10 ? '0' + seconds : seconds;

    return `${year}-${formattedMonth}-${formattedDay} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }

  async webhook(body) {
    if (body) {
      await this.arventGroupEntityManager
        .createQueryBuilder()
        .insert()
        .into('webhook')
        .values({
          response: JSON.stringify(body),
          date: this.convertDate(),
          status: 'active',
        })
        .execute();
      return 'Webhook creado correctamente';
    }
    return 'Webhook vacio';
  }

  async updateNameBind(body: updateNameBind) {
    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/wallet/cvu/${body.cvu}`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };

    const config: AxiosRequestConfig = {
      method: 'PUT',
      url,
      data: {
        name: body.name,
      },
      headers,
      httpsAgent: this.httpsAgent,
    };
    return await axios(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error?.response?.data?.message;
      });
  }

  async getEmail(email: string) {
    return await this.arventGroupEntityManager
      .query(
        `SELECT * FROM accounts
            WHERE accounts.email = '${email}'`,
      )
      .then((response) => response[0])
      .catch((error) => {
        console.log('Error fetching emails', error);

        throw new Error('Error fetching emails');
      });
  }

  async createVirtualAccount(body) {
    console.log(`INSERT INTO accounts (email, key, secret_key)
        VALUES ('${body.email}', '${body.key}', '${body.secretKey}')`);

    return await this.arventGroupEntityManager
      .query(
        `INSERT INTO accounts (email, \`key\`, secret_key)
        VALUES ('${body.email}', '${body.key}', '${body.secretKey}')`,
      )
      .catch((error) => {
        console.log(error);
        throw new Error('Error creating virtual account');
      });
  }
}
