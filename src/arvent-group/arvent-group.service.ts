import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
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
import { Between, EntityManager, In, Not, Repository } from 'typeorm';
import * as https from 'https';
import axios, { AxiosRequestConfig } from 'axios';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PersonDTO, UserCompanyDTO } from 'src/common/dto/user.dto';
import { UploadedDocDto } from 'src/common/dto/upload-file.dto';
import { Balance } from './entities/balance.entity';
import { ClientEntity } from './entities/clients.entity';
import { FileEntity } from './entities/files.entity';
import { Webhook } from './entities/webhook.entity';
import { Transaction } from './entities/transactions.entity';
import { Payment } from './entities/payments.entity';
import { UserCompany } from './entities/user-companies.entity';
import { User } from './entities/user.entity';
import { Account } from './entities/account.entity';
import { LogsEntity } from './entities/logs.entity';

@Injectable()
export class ArventGroupService {
  private urlBind = process.env.URL_BIND;
  private httpsAgent: https.Agent;
  private token: string;
  private timeTokenExpirate: Date;
  private USERNAME_BIND = process.env.USERNAME_BIND;
  private PASSWORD_BIND = process.env.PASSWORD_BIND;
  private idBank = process.env.BANK_ID_BIND;
  private accountId = process.env.ACCOUNT_ID_BIND;
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
      id: 19,
      cvu: '0000058105193400884642',
    },
    {
      email: 'pablo@payexsrl.com',
      id: 11,
      cvu: '0000058104351016263797',
    },
  ];

  constructor(
    @InjectRepository(Balance)
    private _balanceEntityRepository: Repository<Balance>,
    @InjectRepository(ClientEntity)
    private _clientEntityRepository: Repository<ClientEntity>,
    @InjectRepository(FileEntity)
    private _fileEntityRepository: Repository<FileEntity>,
    @InjectRepository(Webhook)
    private _webhookEntityRepository: Repository<Webhook>,
    @InjectRepository(Transaction)
    private _transactionEntityRepository: Repository<Transaction>,
    @InjectRepository(Payment)
    private _paymentEntityRepository: Repository<Payment>,
    @InjectRepository(UserCompany)
    private _userCompanyEntityRepository: Repository<UserCompany>,
    @InjectRepository(User)
    private _userEntityRepository: Repository<User>,
    @InjectRepository(Account)
    private _accountEntityRepository: Repository<Account>,
    @InjectRepository(LogsEntity)
    private _logsEntityRepository: Repository<LogsEntity>,
    @InjectEntityManager('chronos')
    private readonly chronosEntityManager: EntityManager,
  ) {}

  /**
   * @method getEmail
   * Servicio para obtener el email de la cuenta
   * */
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
  async doTransaction(body: DoRequestDto, key: string = '') {
    const { destinationCbu, amount, email } = body;

    const emails = await this.getEmail(email, key);
    if (emails === undefined) return 'Email no asociado a ninguna cuenta';

    const user = await this._userEntityRepository
      .findOne({
        where: { email: body.email },
      })
      .then((response) => response);
    const whereClient = {};
    if (emails) Object.assign(whereClient, { accountId: emails.id });

    if (user) Object.assign(whereClient, { cuit: String(user.cuitcuil) });

    const dataClient = await this._clientEntityRepository
      .findOne({
        where: whereClient,
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({ accountId: emails.id }),
          error: error,
          createdAt: this.convertDate(),
          type: 'client-sql',
          method: 'POST',
          url: '/send-transaction',
        });
        throw error;
      });

    const balances = await this.stateBalance({ cvu: dataClient.cvu }).then(
      (response) => response[0],
    );

    if (
      Number(amount) > Number(balances.amount) ||
      Number(balances.amount) <= 0
    )
      throw 'Fondos insuficientes';

    await this._logsEntityRepository.save({
      request: JSON.stringify(balances),
      error: 'balance',
      createdAt: this.convertDate(),
      type: 'balance-sql',
      method: 'POST',
      url: '/send-transaction',
    });

    const params: BindRequestInterface = {
      origin_id: uuidv4().substring(0, 14).replace(/-/g, '0'),
      origin_debit: {
        cvu: dataClient.cvu,
        cuit: String(dataClient.cuit),
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

    await this._logsEntityRepository.save({
      request: JSON.stringify({
        method: 'POST',
        url,
        data: params,
      }),
      error: '',
      createdAt: this.convertDate(),
      type: 'body-transaction',
      method: 'POST',
      url: '/send-transaction',
    });

    const response = await axios(config)
      .then((response) => response)
      .catch(async (error) => {
        console.log('error axios', error.response.data);
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            method: 'POST',
            url,
            data: params,
          }),
          error: JSON.stringify(error?.response?.data),
          createdAt: this.convertDate(),
          type: 'bind-transfer',
          method: 'POST',
          url: '/send-transaction',
        });
        throw error?.response?.data?.message;
      });

    const data = response.data;
    const dataString = JSON.stringify(data);
    await this._transactionEntityRepository
      .save({
        idTransaction: params.origin_id,
        response: dataString,
        status: data.status,
        email: body.email,
        dateTransaction: this.convertDate(),
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            idTransaction: params.origin_id,
            response: dataString,
            status: data.status,
            email: body.email,
            dateTransaction: this.convertDate(),
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'transaction-sql',
          method: 'POST',
          url: '/send-transaction',
        });
        return error;
      });

    await this._paymentEntityRepository
      .save({
        idTransaction: params.origin_id,
        response: dataString,
        status: data.status,
        email: body.email,
        dateTransaction: this.convertDate(),
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            idTransaction: params.origin_id,
            response: dataString,
            status: data.status,
            email: body.email,
            dateTransaction: this.convertDate(),
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'payments-sql',
          method: 'POST',
          url: '/send-transaction',
        });
        return error;
      });

    const newBalance = Number(balances.amount) - Number(body.amount);
    await this._balanceEntityRepository
      .update(
        {
          id: balances.id,
        },
        {
          amount: newBalance < 0 ? 0 : newBalance,
        },
      )
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            idTransaction: params.origin_id,
            response: dataString,
            status: data.status,
            email: body.email,
            dateTransaction: this.convertDate(),
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'balance-sql',
          method: 'POST',
          url: '/send-transaction',
        });
        return error;
      });

    return dataString;
  }

  /**
   * @method transactionReport
   * Servicio para listar las transacciones
   * @returns
   */
  async transactionReport(body: arventGetTransactions, key: string, query) {
    if (!this.validateEnum(TypeTransactions, body.type))
      throw 'Tipo de transacción no válida';

    const emails = await this.getEmail(body.accountEmail, key);
    if (emails === undefined) throw 'Email no asociado a ninguna cuenta';

    if (body.limit === 0) body.limit = 10;

    const typeTransaction =
      body.type === 'all' ? In(['credit', 'debit']) : body.type;
    const where = body.id
      ? { idTransaction: body.id }
      : {
          email: body.accountEmail,
          type: typeTransaction,
        };
    if (body.fromDate && body.toDate) {
      Object.assign(where, {
        datetransaction: Between(body.fromDate, body.toDate),
      });
    }
    const total = await this._transactionEntityRepository.count({ where });
    const data = await this._transactionEntityRepository
      .find({
        where,
        take: body.limit,
        skip: body.offset,
        order: { datetransaction: 'DESC' },
      })
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            email: emails.email,
            type: typeTransaction,
            fromDate: body.fromDate,
            toDate: body.toDate,
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'transaction-sql',
          method: 'POST',
          url: '/transactions-report',
        });
        return error;
      });

    const response = data.map((e) => {
      return {
        id: e.idTransaction,
        status: e.status,
        dateTransaction: e.datetransaction,
        type: e.type,
        emailOriginDebit: e.email,
        responseBank:
          typeof e.response === 'string' ? JSON.parse(e.response) : e.response,
      };
    });

    if (query && body.id === undefined) {
      return query['response-completed'] === 'true'
        ? { total, page: body.offset, limit: body.limit, data: response }
        : response;
    } else if (body.id) {
      return response.length > 0 ? response[0] : {};
    }

    return response;
  }

  /**
   * @method updateStatusTransactions
   * Servicio para actualizar los estados de las transacciones realizadas
   * @returns
   */
  async updateStatusTransactions() {
    const data = await this._paymentEntityRepository.find({
      where: { status: 'IN_PROGRESS' },
      take: 10,
    });

    if (data.length === 0) return false;

    const users = await this._userEntityRepository.find({
      where: { email: In(data.map((e) => e.email)) },
    });
    const accounts = await this._accountEntityRepository
      .find({
        select: { id: true, email: true },
        where: { id: In(users.map((e) => e.accountId)) },
      })
      .then((response) => {
        return response.map((e) => {
          const user = users.find((u) => u.accountId === e.id);
          return {
            ...e,
            email: user.email,
          };
        });
      });

    for (const transaction of data) {
      const dataResponse = await this.getTransactionById(
        transaction.idTransaction,
      );
      await this._logsEntityRepository.save({
        request: JSON.stringify({
          method: 'GET',
          url: `/transaction-request-types/TRANSFER/${transaction.idTransaction}`,
        }),
        error: JSON.stringify(dataResponse),
        createdAt: this.convertDate(),
        type: 'bind-get-transaction',
        method: 'POST',
        url: '/transactions-update',
      });
      await this._paymentEntityRepository
        .update(transaction.id, {
          status: dataResponse.status,
          response: JSON.stringify(dataResponse),
        })
        .then((response) => response)
        .catch(async (error) => {
          await this._logsEntityRepository.save({
            request: JSON.stringify({
              status: dataResponse.status,
              response: JSON.stringify(dataResponse),
            }),
            error: error,
            createdAt: this.convertDate(),
            type: 'payment-sql',
            method: 'UPDATE',
            url: '/transactions-update',
          });
          return error;
        });
      await this._transactionEntityRepository
        .update(
          { idTransaction: transaction.idTransaction },
          {
            idTransaction: transaction.idTransaction,
            status: dataResponse.status,
            response: JSON.stringify(dataResponse),
            email: transaction.email,
            datetransaction: dataResponse.business_date
              .replace('T', ' ')
              .replace('Z', ''),
            type: 'debit',
          },
        )
        .then((response) => response)
        .catch(async (error) => {
          await this._logsEntityRepository.save({
            request: JSON.stringify({
              idTransaction: transaction.idTransaction,
              status: dataResponse.status,
              response: JSON.stringify(dataResponse),
              email: transaction.email,
              datetransaction: dataResponse.business_date
                .replace('T', ' ')
                .replace('Z', ''),
              type: 'debit',
            }),
            error: error,
            createdAt: this.convertDate(),
            type: 'transaction-sql',
            method: 'POST',
            url: '/transactions-update',
          });
          return error;
        });

      if (accounts.length > 0) {
        const account = accounts.find((e) => e.email === transaction.email);
        if (!account || !account.needWebhook) continue;

        await axios({
          method: 'POST',
          url: `${process.env.URL_VIRTUAL_ACCOUNT}/virtual-account/webhook`,
          data: {
            email: transaction.email,
            status: dataResponse.status,
            idTransaction: transaction.idTransaction,
            payload: transaction.response,
          },
        }).catch(async (error) => {
          await this._logsEntityRepository.save({
            request: JSON.stringify({
              method: 'GET',
              url: `/transaction-request-types/TRANSFER/${transaction.idTransaction}`,
            }),
            error: error,
            createdAt: this.convertDate(),
            type: 'virtul-account-webhook',
            method: 'POST',
            url: '/transactions-update',
          });

          return error;
        });
      }
    }
    return true;
  }

  //tentiva de su uso completo
  async creditTransactions() {
    const accountCredits = [];
    const webhooks = await this._webhookEntityRepository.find({
      where: { status: 'active' },
    });

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
        await this.processCreditTransaction(transaction, accountCredits);
      } else if (type === 'debin') {
        await this.processDebinTransaction(transaction, accountCredits);
      }
    }

    if (accountCredits.length > 0) await this.updateBalances(accountCredits);

    return accountCredits;
  }

  private async processCreditTransaction(transaction, accountCredits) {
    const cleanData = transaction.data?.data || transaction.data;
    const { details, this_account } = cleanData;
    const value = details.value || cleanData.charge.value;
    const accountrouting = this_account
      ? this_account.account_routing.address
      : details.origin_credit.cvu;

    this.updateAccountCredits(accountCredits, accountrouting, value.amount);

    const searchCVU = await this._balanceEntityRepository.find({
      where: { cvu: accountrouting },
    });
    let client;
    client = await this._clientEntityRepository.findOne({
      select: { cuit: true },
      where: { cvu: accountrouting },
    });
    if (!client) {
      client = this.datos.find((e) => e.cvu === accountrouting);
      if (!client) return false;
    }

    const user = await this._userEntityRepository.findOne({
      where: { cuitcuil: client.cuit },
    });

    if (searchCVU) {
      const dataString = JSON.stringify(transaction.data);
      await this._transactionEntityRepository.save({
        idTransaction: transaction.data.id,
        response: dataString,
        status: 'COMPLETED',
        email: user.email,
        dateTransaction: cleanData.business_date
          ? cleanData.business_date.replace('T', ' ').replace('Z', '')
          : this.convertDate(),
        type: 'credit',
      });
      await this.markWebhookAsInactive(transaction.id);
    }
  }

  private async processDebinTransaction(transaction, accountCredits) {
    const { details, charge, end_date } = transaction.data;
    const { buyerAccountCBU, origin_id } = details;

    const transactionData = await this._transactionEntityRepository.find({
      where: { idTransaction: origin_id, status: 'PENDING' },
    });

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
        await this._transactionEntityRepository.save({
          idTransaction: origin_id,
          response: dataString,
          status: 'COMPLETED',
          email: searchCVU.email,
          dateTransaction: end_date.replace('T', ' ').replace('Z', ''),
          type: 'debit',
        });
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
    return await this._webhookEntityRepository.update(id, {
      status: 'inactive',
    });
  }

  private async updateBalances(accountCredits) {
    const balances = await this.stateBalance({});

    for (const account of accountCredits) {
      const dataBalance = balances.find((e) => e.cvu === account.cvu);
      if (dataBalance) {
        const total = Number(dataBalance.amount) + account.amount;
        await this._balanceEntityRepository
          .update(dataBalance.id, { amount: total < 0 ? 0 : total })
          .catch(async (error) => {
            await this._logsEntityRepository.save({
              request: JSON.stringify({ amount: total }),
              error: error,
              createdAt: this.convertDate(),
              type: 'balance-sql',
              method: 'UPDATE',
              url: '/transactions-credit',
            });
            return error;
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
  async stateBalance(where: any, isCalled = false) {
    let filter = where ? { ...where } : {};
    if (isCalled) {
      let user = await this._userCompanyEntityRepository
        .findOne({
          where: { email: where.email },
        })
        .catch(async (error) => {
          await this._logsEntityRepository.save({
            request: JSON.stringify({ email: where.email }),
            error: error,
            createdAt: this.convertDate(),
            type: 'user-company-sql',
            method: 'POST',
            url: '/balance',
          });
          return undefined;
        });

      // Si no existe en userCompanies, busca en userEntity
      if (!user) {
        user = await this._userEntityRepository
          .findOne({
            where: { email: where.email },
          })
          .catch(async (error) => {
            await this._logsEntityRepository.save({
              request: JSON.stringify({ email: where.email }),
              error: error,
              createdAt: this.convertDate(),
              type: 'user-sql',
              method: 'POST',
              url: '/balance',
            });
            return undefined;
          });
      }

      if (user) {
        const client = await this._clientEntityRepository
          .findOne({
            where: { cuit: user.cuitcuil, accountId: user.accountId },
          })
          .catch(async (error) => {
            await this._logsEntityRepository.save({
              request: JSON.stringify({ cuit: user.cuitcuil }),
              error: error,
              createdAt: this.convertDate(),
              type: 'client-sql',
              method: 'POST',
              url: '/balance',
            });
            return error;
          });

        if (!client) throw 'Email no asociado a ninguna cuenta';

        filter = { cvu: client.cvu };
      } else {
        const cvu = this.datos.find((e) => e.email === where.email).cvu;
        filter = { cvu: cvu };
      }
    }

    return await this._balanceEntityRepository
      .find({
        where: filter,
      })
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(filter),
          error: error,
          createdAt: this.convertDate(),
          type: 'client-sql',
          method: 'POST',
          url: '/balance',
        });
        return error;
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
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(config),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'bind-debin',
          method: 'POST',
          url: '/get-transaction-debin',
        });
        throw error?.response?.data?.message;
      });

    const { start_date } = response;
    const dateClean = start_date
      .replace('T', ' ')
      .replace('Z', '')
      .split('.')[0];
    await this._transactionEntityRepository
      .save({
        idTransaction: params.origin_id,
        response: JSON.stringify(response),
        status: response.status,
        email: emails.email,
        dateTransaction: dateClean,
        type: 'credit',
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            idTransaction: params.origin_id,
            response: JSON.stringify(response),
            status: response.status,
            email: emails.email,
            dateTransaction: dateClean,
            type: 'credit',
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'transaction-sql',
          method: 'POST',
          url: '/get-transaction-debin',
        });
        throw error;
      });

    return response;
  }

  /**
   * @method updateStatusTransactions
   * Servicio para actualizar los estados de las transacciones realizadas
   * @returns
   */
  async updateStatusTransactionsCredit() {
    const transactions = await this.getPendingTransactions();
    if (transactions.length === 0) return false;

    const balances = await this.stateBalance({}).then((r) => r);

    for (const transaction of transactions) {
      const transactionId = JSON.parse(transaction.response).transaction_ids[0];
      const response = await this.fetchTransactionStatus(transactionId);
      const alreadyExists = await this.existsTransactionWithStatus(
        transaction.idTransaction,
      );
      if (alreadyExists) continue;

      await this.saveUpdatedTransaction(transaction, response);
      await this.updateUserBalance(transaction, response, balances);
    }

    return true;
  }

  // Obtener transacciones pendientes que no estén finalizadas
  private async getPendingTransactions() {
    const completed = await this._transactionEntityRepository.find({
      where: { status: In(['COMPLETED', 'EXPIRED']) },
      select: ['idTransaction'],
    });

    return this._transactionEntityRepository.find({
      where: {
        status: In(['PENDING', 'AWAITING_CONFIRMATION', 'IN_PROGRESS']),
        type: In(['credit']),
        idTransaction: Not(In(completed.map((t) => t.idTransaction))),
      },
      order: { datetransaction: 'DESC' },
    });
  }

  // Consultar estado de transacción en Bind
  private async fetchTransactionStatus(transactionId: string) {
    const headers = {
      Authorization: `JWT ${await this.getToken()}`,
    };

    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transaction-request-types/DEBIN/${transactionId}`;

    const config: AxiosRequestConfig = {
      method: 'GET',
      url,
      headers,
      httpsAgent: this.httpsAgent,
    };

    try {
      return await axios(config).then((res) => res.data);
    } catch (error) {
      await this._logsEntityRepository.save({
        request: JSON.stringify({ url, method: 'GET' }),
        error: error?.response?.data?.message,
        createdAt: this.convertDate(),
        type: 'bind-debin',
        method: 'GET',
        url: '/transactions-get',
      });
      throw error?.response?.data?.message;
    }
  }

  // Verificar si ya existe una transacción con ese status
  private async existsTransactionWithStatus(idTransaction: string) {
    const existing = await this._transactionEntityRepository.find({
      where: { idTransaction },
    });
    return existing.length > 0;
  }

  // Guardar transacción actualizada en BD
  private async saveUpdatedTransaction(transaction: any, response: any) {
    return this._transactionEntityRepository.save({
      idTransaction: transaction.idTransaction,
      response: JSON.stringify(response),
      status: response.status,
      email: transaction.email,
      datetransaction: new Date(),
      type: transaction.type,
    });
  }

  // Actualizar balance del usuario según tipo de transacción
  private async updateUserBalance(
    transaction: any,
    response: any,
    balances: any[],
  ) {
    const { charge } = response;
    const emails = this.datos.find(
      (e) => e.email.toLowerCase() === transaction.email.toLowerCase(),
    );
    const balanceAccount = balances.find((e) => e.cvu === emails.cvu);

    const currentBalance = Number(balanceAccount.amount);
    const amount = Number(charge.value.amount);

    const newBalance =
      transaction.type === 'credit'
        ? currentBalance + amount
        : currentBalance - amount;

    return this._balanceEntityRepository.update(
      { id: balanceAccount.id },
      { amount: newBalance },
    );
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

    const data = await this._paymentEntityRepository.find({
      where: { email: emails.email },
      take: body.limit,
      skip: body.offset,
    });

    const response = data.map((e) => {
      return {
        id: e.idTransaction,
        status: e.status,
        dateTransaction: e.datetransaction,
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

    if (body.cuitCuil.length < 11)
      throw 'El campo cuit/cuil debe tener 11 digitos';

    const user = await this._userEntityRepository
      .find({
        select: {
          cuitcuil: true,
          email: true,
        },
        where: [
          { cuitcuil: body.cuitCuil },
          { email: body.email.toLocaleLowerCase() },
        ],
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify([
            { cuitcuil: body.cuitCuil },
            { email: body.email.toLocaleLowerCase() },
          ]),
          error: error,
          createdAt: this.convertDate(),
          type: 'user-sql',
          method: 'POST',
          url: '/create-natural-person',
        });
        throw error;
      });
    if (user.length > 0)
      throw 'Ya existe un cliente con este CUIT/CUIL o email.';

    const account = key
      ? await this._accountEntityRepository
          .findOne({
            select: { id: true, key: true },
            where: { key },
          })
          .then((response) => response)
      : 0;
    const uuid = body.customerId ?? uuidv4();
    const bodyUser = {
      regulatedEntity20: body.regulatedEntity20, // Adjusted to match the entity property
      politicPerson: body.politicPerson,
      phone: body.phone,
      occupation: body.occupation,
      name: body.name,
      locality: body.locality,
      lastname: body.lastName, // Corrected to match the entity property
      fiscalSituation: body.fiscalSituation,
      cuitcuil: body.cuitCuil,
      postalCode: body.postalCode,
      country: body.country,
      address: body.address,
      uuid,
      email: body.email,
      accountId: account ? account.id : 0,
    };
    await this._userEntityRepository.save(bodyUser).catch(async (error) => {
      await this._logsEntityRepository.save({
        request: JSON.stringify(bodyUser),
        error: error,
        createdAt: this.convertDate(),
        type: 'user-sql',
        method: 'POST',
        url: '/create-natural-person',
      });
      throw 'Error al crear el usuario';
    });

    return { customerId: uuid, ...body };
  }

  /**
   * @method createJuridicPerson
   * Servicio para crear una persona juridica
   * @param body
   * @returns
   */
  async createJuridicPerson(body: UserCompanyDTO, key: string = '') {
    if (!this.validateEnum(normalResponse, body.regulatedEntity20))
      throw 'El campo entidad regulada solo permite los valores de Si o No';

    if (!this.validateEnum(normalResponse, body.politicPerson))
      throw 'El campo persona política solo permite los valores de Si o No';

    if (this.validarNumeroArgentina(body.headquartersPhone) === false)
      throw 'El campo telefono solo admite telefonos de Argentina';

    if (body.cuitCDICIE.length < 11)
      throw 'El campo cuit/cuil debe tener 11 digitos';

    const user = await this._userCompanyEntityRepository
      .find({
        select: {
          cuit_cdi_cie: true,
          email: true,
        },
        where: [
          { cuit_cdi_cie: body.cuitCDICIE },
          { email: body.email.toLocaleLowerCase() },
        ],
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(userCompany),
          error: error,
          createdAt: this.convertDate(),
          type: 'user-company-sql',
          method: 'POST',
          url: '/create-juridic-person',
        });
        console.error('Error saving user company:', error);
        throw new Error('Error saving user company');
      });
    if (user.length > 0)
      throw 'Ya existe un cliente con este CUIT/CUIL o Email.';

    const account = key
      ? await this._accountEntityRepository
          .findOne({
            select: { id: true, key: true },
            where: { key },
          })
          .then((response) => response)
      : 0;
    const uuid = body.customerId ?? uuidv4();
    const userCompany = this._userCompanyEntityRepository.create({
      business_name: body.businessName,
      cuit_cdi_cie: body.cuitCDICIE,
      address: body.address,
      postal_code: body.postalCode,
      city: body.city,
      country: body.country,
      registration_date: body.registrationDate,
      main_activity: body.mainActivity,
      headquarters_phone: body.headquartersPhone,
      email: body.email,
      subject_to_article_20: body.subjectToArticle20,
      politic_person: body.politicPerson,
      regulated_entity_20: body.regulatedEntity20,
      participation_percentage: body.participationPercentage,
      name: body.name,
      last_name: body.lastName,
      uuid,
      accountId: account ? account.id : 0,
    });

    await this._userCompanyEntityRepository
      .save(userCompany)
      .then((result) => result)
      .catch((error) => {
        console.error('Error saving user company:', error);
        throw new Error('Error saving user company');
      });

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
    const cuit = user.isNatural ? user.cuitcuil : user.cuit_cdi_cie;
    const files = await this._fileEntityRepository
      .find({
        where: { cuit },
      })
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
      cuit,
    };
    await this.validateClient(data.cuit, user.accountId);

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
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(config),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'bind-cvu',
          method: 'POST',
          url: '/create-cvu-client',
        });
        throw error?.response?.data?.message;
      });

    const sqlClient = await this._clientEntityRepository.create({
      clientId: String(data.client_id),
      cuit: data.cuit,
      cvu: response.cvu,
      creation_date: this.convertDate(),
      accountId: 0,
    });
    await this._clientEntityRepository
      .save(sqlClient)
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(sqlClient),
          error: error,
          createdAt: this.convertDate(),
          type: 'client-sql',
          method: 'POST',
          url: '/create-cvu-client',
        });
      });

    await this._balanceEntityRepository
      .save({
        cvu: response.cvu,
        amount: 0,
        accountId: 0,
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            cvu: response.cvu,
            amount: 0,
            accountId: 0,
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'balance-sql',
          method: 'POST',
          url: '/create-cvu-client',
        });
      });

    return response;
  }

  async createCvuBind(body: createClientCvuBind, key: string) {
    const account = key
      ? await this._accountEntityRepository.findOne({
          select: { id: true, key: true },
          where: { key },
        })
      : 0;
    // Genera un UUID de 20 dígitos numéricos aleatorios
    const uuid = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 10),
    ).join('');
    const numericUUID = uuid;
    const data: Client = {
      client_id: Number(numericUUID),
      currency: 'ARS',
      name: body.name,
      cuit: body.cuit,
    };
    await this.validateClient(data.cuit, account ? account.id : 0);

    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/wallet/cvu`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };
    await this._logsEntityRepository.save({
      method: 'POST',
      url: '/create-cvu-client-bind',
      type: 'bind-cvu',
      error: 'request to create CVU client bind',
      request: JSON.stringify({
        method: 'POST',
        url,
        data,
      }),
      date: this.convertDate(),
    });
    const config: AxiosRequestConfig = {
      method: 'POST',
      url,
      data,
      headers,
      httpsAgent: this.httpsAgent,
    };
    const response = await axios(config)
      .then((response) => response.data)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            method: 'POST',
            url,
            data,
          }),
          createdAt: this.convertDate(),
          type: 'bind-cvu',
          method: 'POST',
          url: '/create-cvu-client-bind',
          error: JSON.stringify(error?.response?.data),
        });
        throw error?.response?.data?.message;
      });
    await this._logsEntityRepository.save({
      request: JSON.stringify({
        method: 'POST',
        url,
        data,
      }),
      createdAt: this.convertDate(),
      type: 'bind-cvu',
      method: 'POST',
      url: '/create-cvu-client-bind',
      error: JSON.stringify(response),
    });

    const sqlClient = await this._clientEntityRepository.create({
      clientId: String(data.client_id),
      cuit: data.cuit,
      cvu: response.cvu,
      creation_date: this.convertDate(),
      accountId: account ? account.id : 0,
    });
    await this._clientEntityRepository
      .save(sqlClient)
      .catch((error) => {
        throw error;
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(sqlClient),
          error: error,
          createdAt: this.convertDate(),
          type: 'client-sql',
          method: 'POST',
          url: '/create-cvu-client-bind',
        });
      });

    await this._balanceEntityRepository
      .save({
        cvu: response.cvu,
        amount: 0,
        accountId: account ? account.id : 0,
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({
            cvu: response.cvu,
            amount: 0,
            accountId: 0,
          }),
          error: error,
          createdAt: this.convertDate(),
          type: 'balance-sql',
          method: 'POST',
          url: '/create-cvu-client-bind',
        });
      });

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
    const cuit = user.isNatural ? user.cuitcuil : user.cuit_cdi_cie;
    const files = await this._fileEntityRepository
      .find({ where: { cuit, typefile: body.docType } })
      .then((response) => response[0]);

    if (files) {
      const id = files.id;
      await this._fileEntityRepository.update(
        { id },
        {
          data: imageData,
          mimetype: file.mimetype,
        },
      );

      return 'Imagen actualizada correctamente';
    }

    const sql = await this._fileEntityRepository.create({
      typefile: body.docType,
      filename: file.originalname,
      mimetype: file.mimetype,
      cuit,
      data: imageData,
    });

    await this._fileEntityRepository.save(sql).catch((error) => {
      throw error;
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
    const cuit = user.isNatural ? user.cuitcuil : user.cuit_cdi_cie;
    const files = await this._fileEntityRepository.find({
      where: { cuit },
    });
    const dataClient = await this.validateClient(cuit, user.accountId, false);

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
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(config),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'bind-change-alias',
          method: 'POST',
          url: '/change-alias-bind',
        });
        throw error?.response?.data?.message;
      });

    return response;
  }

  private async validateUser(customerId: string) {
    const existClient = await this._userEntityRepository
      .findOne({
        where: { uuid: customerId },
      })
      .then((response) => response)
      .catch((error) => error);
    const existClientJuridic = await this._userCompanyEntityRepository
      .findOne({
        where: { uuid: customerId },
      })
      .then((response) => response)
      .catch((error) => error);

    if (!existClient && !existClientJuridic)
      throw 'No existe un cliente con este customerId';

    return existClient
      ? { isNatural: true, ...existClient }
      : { isNatural: false, ...existClientJuridic };
  }

  private async validateClient(
    cuit: string,
    accountId: number,
    needError = true,
  ) {
    const existCvu = await this._clientEntityRepository
      .findOne({
        where: { cuit: cuit },
      })
      .then((response) => response)
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

  private validarNumeroArgentina(number: string) {
    // Expresión regular para validar un número de teléfono argentino con o sin el "9" después del código de país
    // Formatos válidos: +549XXXXXXXXXX, +54XXXXXXXXXX, 549XXXXXXXXXX, 54XXXXXXXXXX, 9XXXXXXXXXX, XXXXXXXXXX
    const regexTelefonoArgentinoNumeros = /^(?:\+?54)?9?\d{10}$/;

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
      await this._webhookEntityRepository.save({
        response: JSON.stringify(body),
        date: this.convertDate(),
        status: 'active',
      });
      await this.creditTransactions();
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: 'https://pennyapi-ramps.alfredpay.app/v1/chronos/webhook',
        data: body,
      };
      const response = await axios(config)
        .then((response) => response)
        .catch(async (error) => {
          console.log('error axios', error.response.data);
          await this._logsEntityRepository.save({
            request: JSON.stringify({
              method: 'POST',
              url: 'https://penny-api-ramps.alfredpay.app/v1/chronos/webhook',
              data: body,
            }),
            error: JSON.stringify(error?.response?.data),
            createdAt: this.convertDate(),
            type: 'bind-transfer',
            method: 'POST',
            url: '/send-transaction',
          });
          throw error?.response?.data?.message;
        });

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
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(config),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'bind-change-name',
          method: 'POST',
          url: '/change-name-bind',
        });
        throw error?.response?.data?.message;
      });
  }

  async getEmail(email: string, key: string = '') {
    return await this._accountEntityRepository
      .findOne({
        select: {
          email: true,
          id: true,
        },
        where: [{ email }, { key }],
      })
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({ email, key }),
          error: error,
          createdAt: this.convertDate(),
          type: 'account-sql',
          method: 'POST',
          url: '',
        });

        throw new Error('Error fetching emails');
      });
  }

  async createVirtualAccount(body: {
    email: string;
    key: string;
    secretKey: string;
    needWebhook: boolean;
  }) {
    const data = this._accountEntityRepository.create({
      email: body.email,
      key: body.key,
      secretKey: body.secretKey,
      needWebhook: body.needWebhook,
    });
    return await this._accountEntityRepository
      .save(data)
      .then((response) => response)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(data),
          error: error,
          createdAt: this.convertDate(),
          type: 'account-sql',
          method: 'POST',
          url: '/virtual-account',
        });
        throw error;
      });
  }

  async getTransactionById(id: string) {
    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transaction-request-types/TRANSFER/${id}`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };

    const config: AxiosRequestConfig = {
      method: 'GET',
      url,
      headers,
      httpsAgent: this.httpsAgent,
    };
    return await axios(config)
      .then((response) => response.data)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify({ url, method: 'GET' }),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'transaction-request-types/TRANSFER',
          method: 'POST',
          url: '/get-transaction-by/:id',
        });
        throw error?.response?.data?.message;
      });
  }

  async getInformationAccount() {
    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.idView}`;
    const tokenExist = await this.getToken();
    const headers = {
      Authorization: `JWT ${tokenExist}`,
    };

    const config: AxiosRequestConfig = {
      method: 'GET',
      url,
      headers,
      httpsAgent: this.httpsAgent,
    };
    return await axios(config)
      .then((response) => response.data)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(config),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'bind-change-name',
          method: 'POST',
          url: '/change-name-bind',
        });
        throw error?.response?.data?.message;
      });
  }

  async getTransactionBind(
    sort?: string,
    limit?: string,
    offset?: string,
    from?: string,
    to?: string,
    categories?: string[],
  ) {
    const url = `${this.urlBind}/banks/${this.idBank}/accounts/${this.accountId}/${this.idView}/transactions`;
    const tokenExist = await this.getToken();
    const headers: Record<string, string> = {
      Authorization: `JWT ${tokenExist}`,
    };
    if (sort) headers.obp_sort_direction = sort;
    if (limit) headers.obp_limit = limit;
    if (offset) headers.obp_offset = offset;
    if (from) headers.obp_from_date = from;
    if (to) headers.obp_to_date = to;
    if (categories && categories.length > 0)
      headers.obp_categories = categories.join(',');

    const config: AxiosRequestConfig = {
      method: 'GET',
      url,
      headers,
      httpsAgent: this.httpsAgent,
    };
    return await axios(config)
      .then((response) => response.data)
      .catch(async (error) => {
        await this._logsEntityRepository.save({
          request: JSON.stringify(config),
          error: error?.response?.data?.message,
          createdAt: this.convertDate(),
          type: 'bind-change-name',
          method: 'POST',
          url: '/change-name-bind',
        });
        throw error?.response?.data?.message;
      });
  }

  async getVirtualAccount(id?: string) {
    return id
      ? await this._accountEntityRepository.findOne({ where: { id: Number(id) } })
      : await this._accountEntityRepository.find();
  }
}
