import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: () => {
    //     const host = 'localhost';
    //     const port = 5432;
    //     const username = 'postgres';
    //     const password = '1234';
    //     const database = 'arvent_group_dev';

    //     return {
    //       name: 'arventGroup',
    //       type: 'postgres',
    //       host,
    //       port,
    //       username,
    //       password,
    //       database,
    //       entities: [__dirname + '/**/*.entity{.ts,.js}'],
    //       synchronize: false,
    //       logging: ['error'],
    //     };
    //   },
    // }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => {
        const host = 'database-chronospay.cnaaegyaw8sq.us-east-2.rds.amazonaws.com';
        const port = 3306;
        const username = 'chronostest';
        const password = ',h1e6#STJBqZ9sSj';
        const database = 'arvent_group_dev';

        return {
          name: 'arventGroup',
          type: 'mysql',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: ['error'],
        };
      },
    })
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}