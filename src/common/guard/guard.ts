import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  private apiKey =
    process.env.API_KEY ?? '4GEkTHxCvMLAMDZ9_7MEb0DBNfD1ofecRIfdsfREY34ER77eT';
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const dataHeader = request.headers['api-key'];
    console.log(`url: ${request.originalUrl}`);

    if (request.originalUrl.includes('webhook')) return true;

    if (dataHeader === this.apiKey) return true;
    else throw new UnauthorizedException();
  }
}
