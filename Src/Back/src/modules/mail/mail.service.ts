import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';

/**
 * 실제 메일 발송(SMTP). 설정은 MAIL_* 환경변수에서 읽는다.
 * 보안: 수신자 주소와 인증 코드는 로그에 남기지 않는다.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const mail = config.get<{
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    }>('mail');
    this.from = mail!.from;
    this.transporter = nodemailer.createTransport({
      host: mail!.host,
      port: mail!.port,
      secure: mail!.secure,
      auth: mail!.user ? { user: mail!.user, pass: mail!.pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: '[말씨앗] 이메일 인증 코드',
        text:
          `말씨앗 가입을 완료하려면 아래 인증 코드를 앱에 입력해 주세요.\n\n` +
          `인증 코드: ${code}\n\n` +
          `코드는 10분 동안만 유효합니다. 본인이 가입하지 않았다면 이 메일을 무시해 주세요.`,
      });
    } catch {
      // 원인(주소, 자격 증명 등)은 로그에도 남기지 않는다. 운영자는 SMTP 설정을 확인한다.
      this.logger.error('인증 메일 발송 실패 (SMTP 설정과 연결을 확인하세요)');
      throw new AppException(
        ErrorCode.UPSTREAM_UNAVAILABLE,
        '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
        503,
      );
    }
  }
}
