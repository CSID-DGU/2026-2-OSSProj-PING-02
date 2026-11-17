import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, SignupDto, UsernameCheckDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 명세 6: 아이디 중복 확인·로그인·가입은 횟수를 제한한다 (IP 기준).
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('username/check')
  @HttpCode(200)
  checkUsername(@Body() dto: UsernameCheckDto) {
    return this.auth.checkUsername(dto.username);
  }

  // 가입하면 바로 로그인 세션(토큰)을 받는다.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // 정상 앱은 30분마다 한 번 갱신한다. 탈취된 토큰을 무차별로 쓰는 것을 막는 상한이다.
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshTokenDto): Promise<void> {
    await this.auth.logout(user.id, dto.refreshToken);
  }
}
