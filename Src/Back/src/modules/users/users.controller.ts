import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { TermsAgreementsBodyDto } from '../auth/dto/auth.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ChangePasswordDto, UpdateMeDto, VerifyPasswordDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.getMe(user.id);
  }

  /** 보낸 항목(email, birthdate, gender)만 고친다. 이메일 계정은 password 로 다시 확인한다. */
  @Patch()
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Post('password/verify')
  @HttpCode(204)
  async verifyPassword(@CurrentUser() user: AuthUser, @Body() dto: VerifyPasswordDto): Promise<void> {
    await this.users.verifyPassword(user.id, dto.password);
  }

  /** 지금 기기의 세션은 유지하고, 다른 기기는 다시 로그인해야 한다. */
  @Patch('password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.users.changePassword(user.id, user.sessionId, dto);
  }

  @Delete()
  @HttpCode(204)
  async deleteMe(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto): Promise<void> {
    await this.users.deleteAccount(user.id, dto.password);
  }

  @Post('terms-agreements')
  @HttpCode(204)
  async updateAgreements(
    @CurrentUser() user: AuthUser,
    @Body() dto: TermsAgreementsBodyDto,
  ): Promise<void> {
    await this.users.updateAgreements(user.id, dto.termsAgreements);
  }
}
