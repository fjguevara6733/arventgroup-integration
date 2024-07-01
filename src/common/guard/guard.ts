import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  private apiKey = process.env.API_KEY;
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const dataHeader = request.headers['api-key'];

    if (dataHeader === this.apiKey) return true;
    else throw new UnauthorizedException();
  }
}
