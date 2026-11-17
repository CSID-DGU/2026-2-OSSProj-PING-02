import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  EmailCheckDto,
  FindUsernameDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SignupDto,
  UsernameCheckDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 명세 6: 이메일 중복 확인·로그인·가입은 횟수를 제한한다 (IP 기준).
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('email/check')
  @HttpCode(200)
  checkEmail(@Body() dto: EmailCheckDto) {
    return this.auth.checkEmail(dto.email);
  }

  // 아이디 중복 확인. 이메일 중복 확인과 같은 제한을 둔다.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('username/check')
  @HttpCode(200)
  checkUsername(@Body() dto: UsernameCheckDto) {
    return this.auth.checkUsername(dto.username);
  }

  // 아이디 찾기: 가입한 이메일로 아이디를 보낸다. 가입 여부와 관계없이 204 로 응답한다.
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('username/find')
  @HttpCode(204)
  async findUsername(@Body() dto: FindUsernameDto): Promise<void> {
    await this.auth.findUsername(dto.email);
  }

  // 비밀번호 찾기 1단계: 아이디와 이메일이 맞으면 재설정 코드를 보낸다. 항상 204.
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('password/forgot')
  @HttpCode(204)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.auth.forgotPassword(dto);
  }

  // 비밀번호 찾기 2단계: 코드를 확인하고 새 비밀번호를 설정한다. 모든 세션이 끊긴다.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password/reset')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto);
  }

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

  // 인증 코드 확인: 맞으면 인증 처리 후 로그인 세션을 발급한다.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('email/verify')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  // 인증 코드 재발송. 가입 여부와 관계없이 204 로 응답한다.
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('email/resend')
  @HttpCode(204)
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    await this.auth.resendVerification(dto.email);
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
