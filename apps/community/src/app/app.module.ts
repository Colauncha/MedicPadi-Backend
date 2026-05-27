import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { serviceConfig, dbConfig } from '@medicpadi-backend/config';
import { GroupsModule } from './groups/groups.module';
import { PostsModule } from './posts/posts.module';
import { CommunityGroup } from '../entities/community-group.entity';
import { CommunityPost } from '../entities/community-post.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/community/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        entities: [CommunityGroup, CommunityPost],
        migrations: [__dirname + '/database/migrations/*.ts'],
        host: configService.get<string>('dbConfig.host'),
        port: configService.get<number>('dbConfig.port'),
        username: configService.get<string>('dbConfig.username'),
        password: configService.get<string>('dbConfig.password'),
        database: configService.get<string>('dbConfig.database'),
        synchronize: configService.get<boolean>('dbConfig.synchronize'),
        migrationsRun: configService.get<boolean>('dbConfig.migrationsRun'),
        autoLoadEntities: configService.get<boolean>('dbConfig.autoLoadEntities'),
      }),
    }),
    GroupsModule,
    PostsModule,
  ],
})
export class AppModule {}