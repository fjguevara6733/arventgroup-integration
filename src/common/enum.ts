export enum ProcessLog {
  BIND = 'BIND',
  TRANSACTION = 'TRANSACTION',
}

export enum StatusTransaction {
  CREATED = 'CREATED',
  SENT = 'SENT',
  COMPLETED = 'COMPLETED',
}

export enum StatusBindTransaction {
  COMPLETED = 'COMPLETED', //Completada
  PENDING = 'PENDING', //Pendiente de firma
  IN_PROGRESS = 'IN_PROGRESS', //En curso
  UNKNOWN = 'UNKNOWN', //Desconocido
  FAILED = 'FAILED', //Con error
  UNKNOWN_FOREVER = 'UNKNOWN_FOREVER', //Desconocido y no se va a reintentar actualizar
}

export enum CoinsFiat {
  ARS = 'ARS',
}

export enum ConceptBind {
  ALQ = 'ALQ',
  CUO = 'CUO',
  EXP = 'EXP',
  FAC = 'FAC',
  PRE = 'PRE',
  SEG = 'SEG',
  HON = 'HON',
  HAB = 'HAB',
  VAR = 'VAR',
}

export enum TypeTransactions {
  debit,
  credit,
  all
}

export enum normalResponse {
  Si,
  No,
}
export enum KycDocTypes {
  idCardFront = 'idCardFront',
  idCardBack = 'idCardBack',
  contractStatuteAttachment = 'contractStatuteAttachment',
  lastBalanceAttachment = 'lastBalanceAttachment',
  AFIPRegistrationCertificateAttachment = 'AFIPRegistrationCertificateAttachment',
  IBBRegistrationCertificateAttachment = 'IBBRegistrationCertificateAttachment',
  notaryActAttachment = 'notaryActAttachment',
}
