"""
Wrapper isolado para o SDK do Resend.

Implementa exponential backoff para erros transitórios e rate-limit (429).
Levanta exceção após esgotar todas as tentativas — o chamador decide se
descarta ou agenda um retry externo.
"""
import random
import time

import resend

from src.config import settings

resend.api_key = settings.resend_api_key

# Backoff caps
_BASE_SLEEP = 1.0       # segundos iniciais (2^0)
_RATE_LIMIT_MIN = 60.0  # espera mínima ao receber 429


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    max_retries: int = 3,
) -> None:
    """
    Envia um e-mail transacional via Resend.

    Params:
        to:          Endereço do destinatário.
        subject:     Assunto do e-mail.
        html:        Corpo HTML do e-mail.
        max_retries: Número máximo de tentativas (padrão 3).

    Raises:
        Exception: Após esgotar max_retries sem sucesso.
    """
    last_exc: Exception | None = None

    for attempt in range(max_retries):
        try:
            resend.Emails.send(
                {
                    "from": settings.resend_from_email,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                }
            )
            return
        except Exception as exc:
            last_exc = exc
            if attempt == max_retries - 1:
                break

            exc_str = str(exc).lower()
            is_rate_limit = "429" in exc_str or "rate limit" in exc_str or "too many" in exc_str

            sleep_secs = (2**attempt) * _BASE_SLEEP + random.uniform(0, 0.5)
            if is_rate_limit:
                sleep_secs = max(sleep_secs, _RATE_LIMIT_MIN)

            time.sleep(sleep_secs)

    raise RuntimeError(
        f"Resend: falha após {max_retries} tentativas ao enviar para {to!r}"
    ) from last_exc
