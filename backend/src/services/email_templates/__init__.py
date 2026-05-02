"""
Renderizador de templates HTML de e-mail.

Os templates ficam no mesmo diretório como arquivos .html usando
str.format_map() para substituição de variáveis.
"""
from pathlib import Path

_TEMPLATES_DIR = Path(__file__).parent


def render(template_name: str, **ctx: object) -> str:
    """
    Lê o template HTML e substitui as variáveis de contexto.

    Params:
        template_name: Nome do arquivo (ex: "daily_alert.html").
        **ctx:         Variáveis a substituir no template.

    Returns:
        String HTML pronta para envio.

    Raises:
        FileNotFoundError: Se o template não existir.
        KeyError: Se uma variável obrigatória do template não for fornecida.
    """
    path = _TEMPLATES_DIR / template_name
    template = path.read_text(encoding="utf-8")
    return template.format_map(ctx)
