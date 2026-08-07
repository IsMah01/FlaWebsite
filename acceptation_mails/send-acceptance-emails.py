"""Send edition 18 acceptance emails from the locally supplied PDF list.

The command is a dry run unless --send is explicitly provided. Successful
deliveries are recorded so that rerunning the command does not create duplicates.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import smtplib
import ssl
import sys
import time
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RECIPIENTS = ROOT / "acceptation_mails" / "membres_acceptes.pdf"
DEFAULT_ATTACHMENT = ROOT / "acceptation_mails" / "دليل المشارك 18.pdf"
DEFAULT_LOG = ROOT / "acceptation_mails" / "send-results.jsonl"
EMAIL_RE = re.compile(r"(?i)(?<![\w.+-])[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}(?![\w.-])")

SUBJECT = "تأكيد المشاركة في أكاديمية أطر الغد – الدورة الثامنة عشر"
BODY = """السلام عليكم ورحمة الله وبركاته،

سفراءنا المستقبليين،

يسعد إدارة أكاديمية أطر الغد إخباركم بتأكيد مشاركتكم، وعليه فقد أصبحتم من هذه اللحظة مشاركين رسميين لأكاديمية أطر الغد في دورتها الثامنة عشرة – دورة الأثر.

تقدم لكم مؤسسة أطر الغد مجموعة من الإرشادات والتوجيهات التي يجب معرفتها قبل ولوج الأكاديمية، وعليه المرجو الاطلاع على الملف المرفق أدناه.

إلى حين لقائكم، نتمنى لكم التوفيق والسداد.
"""


def extract_recipients(pdf_path: Path) -> list[str]:
    text = "\n".join(page.extract_text() or "" for page in PdfReader(pdf_path).pages)
    # Preserve document order while removing accidental duplicates.
    return list(dict.fromkeys(match.group(0).lower() for match in EMAIL_RE.finditer(text)))


def load_successes(log_path: Path) -> set[str]:
    if not log_path.exists():
        return set()
    successes: set[str] = set()
    for line in log_path.read_text(encoding="utf-8").splitlines():
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        if item.get("status") == "sent" and isinstance(item.get("email"), str):
            successes.add(item["email"].lower())
    return successes


def append_result(log_path: Path, email: str, status: str, error: str | None = None) -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "email": email,
        "status": status,
    }
    if error:
        record["error"] = error
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as output:
        output.write(json.dumps(record, ensure_ascii=False) + "\n")


def build_message(recipient: str, sender: str, attachment: Path) -> EmailMessage:
    message = EmailMessage()
    message["From"] = f"مؤسسة أطر الغد <{sender}>"
    message["To"] = recipient
    message["Subject"] = SUBJECT
    message.set_content(BODY)
    paragraphs = "".join(
        f'<p style="margin:0 0 18px">{html.escape(paragraph)}</p>'
        for paragraph in BODY.strip().split("\n\n")
    )
    message.add_alternative(
        '<div dir="rtl" style="max-width:640px;margin:auto;font-family:Arial,sans-serif;'
        f'font-size:16px;line-height:1.9;color:#24352f">{paragraphs}</div>',
        subtype="html",
    )
    message.add_attachment(
        attachment.read_bytes(),
        maintype="application",
        subtype="pdf",
        filename=attachment.name,
    )
    return message


def load_env_file(path: Path) -> None:
    """Load simple KEY=VALUE entries without replacing shell variables."""
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key:
            os.environ.setdefault(key, value)


def env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Variable requise absente: {name}")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Envoi local des acceptations de l'édition 18")
    parser.add_argument("--send", action="store_true", help="effectuer réellement les envois")
    parser.add_argument("--test-to", help="envoyer uniquement un exemplaire à cette adresse")
    parser.add_argument("--delay", type=float, default=1.0, help="pause entre les messages (défaut: 1 s)")
    parser.add_argument("--recipients", type=Path, default=DEFAULT_RECIPIENTS)
    parser.add_argument("--attachment", type=Path, default=DEFAULT_ATTACHMENT)
    parser.add_argument("--log", type=Path, default=DEFAULT_LOG)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_env_file(ROOT / ".env")
    for path in (args.recipients, args.attachment):
        if not path.is_file():
            print(f"Fichier introuvable: {path}", file=sys.stderr)
            return 2

    recipients = extract_recipients(args.recipients)
    if not recipients:
        print("Aucune adresse trouvée dans le PDF.", file=sys.stderr)
        return 2
    if args.test_to:
        recipients = [args.test_to.strip().lower()]
    if not args.send:
        print(f"APERÇU: {len(recipients)} destinataires uniques")
        for recipient in recipients:
            print(f"  {recipient}")
        print(f"Pièce jointe: {args.attachment} ({args.attachment.stat().st_size} octets)")
        print("Aucun e-mail envoyé. Ajoutez --send après avoir effectué un test avec --test-to.")
        return 0

    try:
        host = env("SMTP_HOST")
        user = env("SMTP_USER")
        password = env("SMTP_PASS")
        sender = os.getenv("SMTP_FROM", "").strip() or user
        port = int(os.getenv("SMTP_PORT", "587"))
    except (ValueError, TypeError) as error:
        print(str(error), file=sys.stderr)
        return 2

    already_sent = set() if args.test_to else load_successes(args.log)
    pending = [recipient for recipient in recipients if recipient not in already_sent]
    print(f"Envoi: {len(pending)}; déjà réussis et ignorés: {len(recipients) - len(pending)}")
    if not pending:
        return 0

    sent = failed = 0
    try:
        if port == 465:
            smtp = smtplib.SMTP_SSL(host, port, timeout=30, context=ssl.create_default_context())
        else:
            smtp = smtplib.SMTP(host, port, timeout=30)
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        with smtp:
            smtp.login(user, password)
            for index, recipient in enumerate(pending, start=1):
                try:
                    smtp.send_message(build_message(recipient, sender, args.attachment))
                    append_result(args.log, recipient, "sent")
                    sent += 1
                    print(f"[{index}/{len(pending)}] envoyé: {recipient}")
                except Exception as error:  # Continue and retain a resumable audit trail.
                    append_result(args.log, recipient, "failed", str(error))
                    failed += 1
                    print(f"[{index}/{len(pending)}] échec: {recipient}: {error}", file=sys.stderr)
                if index < len(pending):
                    time.sleep(max(0, args.delay))
    except Exception as error:
        print(f"Connexion SMTP impossible: {error}", file=sys.stderr)
        return 1

    print(f"Terminé: {sent} envoyé(s), {failed} échec(s). Journal: {args.log}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
