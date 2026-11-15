import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { TermsAgreementsBodyDto } from '../auth/dto/auth.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
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
