import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { TermsService } from './terms.service';

@ApiTags('terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  /** 명세 4-2. 인증 불필요. 가입 화면에서 약관 목록을 받는다. */
  @Public()
  @Get()
  async list() {
    const terms = await this.terms.findAll();
    return {
      terms: terms.map((t) => ({
        id: t.id,
        type: t.type,
        version: t.version,
        required: t.required,
        title: t.title,
        url: t.url,
        effectiveAt: t.effectiveAt.toISOString(),
      })),
    };
  }
}
