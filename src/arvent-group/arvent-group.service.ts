import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  arventGetTransactions,
  arventGetTransactionsCredit,
  createClientCvu,
  DoRequestDto,
  DoRequestDtoDebin,
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
  private urlBind = 'https://sandbox.bind.com.ar/v1';
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
      console.log('config login', config);

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
    const responseQuery = await this.arventGroupEntityManager
      .query(
        `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction)
          VALUES ('${params.origin_id}', '${dataString}', '${data.status}', '${body.email}', ${new Date()})`,
      )
      .then((response) => response)
      .catch((error) => error);
      console.log('responseQuery', responseQuery);
      
    const responseQuery2 = await this.arventGroupEntityManager
      .query(
        `INSERT INTO payments (idTransaction,response, status, email, dateTransaction)
          VALUES ('${params.origin_id}', '${dataString}', '${data.status}', '${body.email}', ${new Date()})`,
      )
      .then((response) => response)
      .catch((error) => error);
      console.log('responseQuery2', responseQuery2);
      
    const newBalance = Number(balances) - Number(body.amount);
    const responseQuery3 = await this.arventGroupEntityManager
      .query(
        ` UPDATE balance SET amount = '${newBalance}' WHERE id = ${balances.id}`,
      )
      .then((response) => response)
      .catch((error) => error);
      console.log('responseQuery3', responseQuery3);
      

    return data;
  }

  /**
   * @method transactionReport
   * Servicio para listar las transacciones
   * @returns
   */
  async transactionReport(body: arventGetTransactions) {
    if (!this.validateEnum(TypeTransactions, body.type))
      throw 'Tipo de transacción no válida';

    const emails = this.datos.find(
      (e) =>
        e.email.toLocaleLowerCase() === body.accountEmail.toLocaleLowerCase(),
    );
    if (emails === undefined) return 'Email no asociado a ninguna cuenta';

    if (body.limit === 0) body.limit = 10;

    const data = await this.arventGroupEntityManager.query(
      `SELECT * FROM transactions
      WHERE email = '${body.accountEmail}' AND type = '${body.type}'
      LIMIT ${body.limit} OFFSET ${body.offset}; `,
    );

    const response = data.map((e) => {
      return {
        id: e.idTransaction,
        status: e.status,
        dateTransaction: e.dateTransaction,
        type: e.type,
        emailOriginDebit: e.email,
        responseBank: JSON.parse(e.response),
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
  async creditTransactions(payload: arventGetTransactionsCredit) {
    const accountCredits = [];
    const data = [];
    const values = [];
    const headers = {
      Authorization: `JWT ${await this.getToken()}`,
      ...payload,
    };
    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transactions`;
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
        throw new Error(error?.response?.data?.message);
      });

    for (const transaction of response) {
      const { this_account } = transaction;
      const { account_routing } = this_account;
      const searchCVU = this.datos.find(
        (e) => e.cvu === account_routing.address,
      );
      if (searchCVU) {
        data.push(transaction);
      }
    }
    for (const transaction of data) {
      const { details, this_account } = transaction;
      const { value } = details;
      const { account_routing } = this_account;
      const index = accountCredits.findIndex(
        (e) => e.cvu === account_routing.address,
      );
      if (index === -1) {
        accountCredits.push({
          cvu: account_routing.address,
          amount: value.amount,
          count: 1,
        });
      } else {
        accountCredits[index].amount =
          Number(accountCredits[index].amount) + Number(value.amount);
        accountCredits[index].count = Number(accountCredits[index].count) + 1;
      }
      const searchCVU = this.datos.find(
        (e) => e.cvu === account_routing.address,
      );
      if (searchCVU) {
        const dataString = JSON.stringify(transaction);
        values.push(
          `('${transaction.id}', '${dataString}', 'COMPLETED', '${searchCVU.email}','${details.completed.replace('T', ' ').replace('Z', '')}', "credit")`,
        );
      }
    }
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction, type)
          VALUES ${values.join(',')}`,
      )
      .then((response) => response)
      .catch((error) => error);

    const balances = await this.stateBalance('');
    for (const account of accountCredits) {
      const dataBalance = balances.find((e) => e.cvu === account.cvu);
      if (dataBalance) {
        const amountBD = Number(dataBalance.amount);
        const total = account.amount + amountBD;
        const update = await this.arventGroupEntityManager
          .query(
            `UPDATE balance SET amount = '${total}' WHERE id = ${dataBalance.id}`,
          )
          .then((response) => response)
          .catch((error) => error);
        console.log(update);
      }
    }

    return accountCredits;
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
      const emails = this.datos.find(
        (e) => e.email.toLocaleLowerCase() === where.toLocaleLowerCase(),
      );
      where = `WHERE cvu = ${emails.cvu}`;
    }
    return await this.arventGroupEntityManager.query(
      `SELECT * FROM balance ${where}`,
    );
  }

  /**
   * @method createDeposit
   * Servicio para crear peticion de DEBIN (credito)
   * @param body
   * @returns
   */
  async createDeposit(body: DoRequestDtoDebin) {
    const { originCbu, amount, email } = body;
    const emails = this.datos.find(
      (e) => e.email.toLocaleLowerCase() === email.toLocaleLowerCase(),
    );
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
        console.log(error.response.data);
        throw error?.response?.data?.message;
      });

    const { start_date } = response;
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction, type)
          VALUES ('${params.origin_id}', '${JSON.stringify(response)}', '${response.status}', '${emails.email}','${start_date.replace('T', ' ').replace('Z', '')}', "credit")`,
      )
      .then((response) => response)
      .catch((error) => error);
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
      'SELECT * FROM transactions WHERE status = "PENDING" and type = "credit"',
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
      await this.arventGroupEntityManager
        .query(
          `INSERT INTO transactions (idTransaction,response, status, email, dateTransaction, type)
          VALUES ('${transaction.idTransaction}', '${JSON.stringify(response)}', '${response.status}', '${transaction.email}','${response.start_date.replace('T', ' ').replace('Z', '')}', "credit")`,
        )
        .then((response) => response)
        .catch((error) => error);
      const { charge } = response;
      newBalance = Number(balanceAccount.amount) + Number(charge.value.amount);
      await this.arventGroupEntityManager
        .query(
          ` UPDATE balance SET amount = '${newBalance}' WHERE id = ${balanceAccount.id}`,
        )
        .then((response) => response)
        .catch((error) => error);
    }
    return true;
  }

  /**
   * @method transactionReportDebit
   * Servicio para listar los retiros
   * @returns
   */
  async transactionReportDebit(body: arventGetTransactions) {
    const emails = this.datos.find(
      (e) =>
        e.email.toLocaleLowerCase() === body.accountEmail.toLocaleLowerCase(),
    );
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
  async createNaturalPerson(body: PersonDTO) {
    if (!this.validateEnum(normalResponse, body.regulatedEntity20))
      throw 'El campo entidad regulada solo permite los valores de Si o No';

    if (!this.validateEnum(normalResponse, body.politicPerson))
      throw 'El campo persona política solo permite los valores de Si o No';

    if (this.validarNumeroArgentina(body.phone) === false)
      throw 'El campo telefono solo admite telefonos de Argentina';

    const user = await this.arventGroupEntityManager.query(
      `SELECT * FROM user WHERE cuitCuil = '${body.cuitCuil}' or email = '${body.email}'`,
    );
    if (user[0]) throw 'Ya existe un cliente con este CUIT/CUIL o email.';

    const uuid = uuidv4();
    await this.arventGroupEntityManager
      .query(
        `INSERT INTO user (regulatedEntity20, politicPerson, phone, occupation, name, locality, lastName, fiscalSituation, cuitCuil, postalCode, country, address, uuid, email)
       VALUES ('${body.regulatedEntity20}', '${body.politicPerson}', '${body.phone}', '${body.occupation}', '${body.name}', '${body.locality}', '${body.lastName}', '${body.fiscalSituation}', '${body.cuitCuil}', ${body.postalCode}, '${body.country}', '${body.address}', '${uuid}', '${body.email}')`,
      )
      .catch((error) => error.driverError)
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
    console.log('user', user);

    const cuit = user.isNatural ? user.cuitCuil : user.cuit_cdi_cie;
    console.log('cuit', cuit);
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
    console.log('data', data);
    await this.validateClient(data.cuit);

    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/wallet/cvu`;
    console.log(url);
    const tokenExist = this.token ? this.token : await this.getToken();
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
    console.log('config', config);
    const response = await axios(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error?.response?.data?.message;
      });
    console.log('response', response);
    const createClient = await this.arventGroupEntityManager
      .query(
        `INSERT INTO clients (client_id, cuit, cvu) VALUES ('${data.client_id}', '${data.cuit}', '${response.cvu}')`,
      )
      .then((response) => response)
      .catch((error) => error);
    console.log('createClient', createClient);

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

    const imageData = file.buffer;
    const cuit = user.isNatural ? user.cuitCuil : user.cuit_cdi_cie;
    const files = await this.arventGroupEntityManager
      .query(
        `SELECT * FROM files WHERE cuit ='${cuit}' AND typefile = '${body.docType}'`,
      )
      .then((response) => response[0]);

    if (files) {
      const id = files.id;
      const queryUpdate = `UPDATE files SET data=?, mimetype = ? WHERE id = ?`;

      await this.arventGroupEntityManager.query(queryUpdate, [
        imageData,
        file.mimetype,
        id,
      ]);

      return 'Imagen actualizada correctamente';
    }

    const sql =
      'INSERT INTO files (typefile, filename, mimetype, cuit, data) VALUES (?, ?, ?, ?, ?)';
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

  private async validateUser(customerId: string) {
    const existClient = await this.arventGroupEntityManager
      .query(
        `
      SELECT * FROM user WHERE uuid = '${customerId}'`,
      )
      .then((response) => response[0])
      .catch((error) => error);
    const existClientJuridic = await this.arventGroupEntityManager
      .query(
        `
      SELECT * FROM user_companies WHERE uuid = '${customerId}'`,
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
}
