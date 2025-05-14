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
        const host = 'database-chronospay-prod.cz6kkw664bxb.us-east-1.rds.amazonaws.com';
        const port = 3306;
        const username = 'chronoslive';
        const password = 'h}z4fh92VBKu*xV<';
        const database = 'arvent_group';

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