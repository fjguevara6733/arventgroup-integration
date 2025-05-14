import { TypeOrmModule } from '@nestjs/typeorm';
import { ArventGroupController } from './arvent-group.controller';
import { ArventGroupService } from './arvent-group.service';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Account } from './entities/account.entity';
import { User } from './entities/user.entity';
import { UserCompany } from './entities/user-companies.entity';
import { Transaction } from './entities/transactions.entity';
import { Payment } from './entities/payments.entity';
import { Balance } from './entities/balance.entity';
import { Webhook } from './entities/webhook.entity';
import { FileEntity } from './entities/files.entity';
import { ClientEntity } from './entities/clients.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, User, UserCompany, Transaction, Payment, Balance, Webhook, FileEntity, ClientEntity]), // Conexión para arventGroupEntityManager
    TypeOrmModule.forFeature([], 'chronos'),
    ScheduleModule.forRoot(),
  ],
  controllers: [ArventGroupController],
  providers: [ArventGroupService],
  exports: [ArventGroupService, TypeOrmModule],
})
export class ArventGroupModule {}
