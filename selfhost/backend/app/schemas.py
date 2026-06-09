from pydantic import BaseModel

# Email is kept as a plain string on purpose: this is a self-hosted instance
# whose SMTP (Mailpit / any relay) accepts arbitrary domains, and strict
# RFC "deliverable domain" checks reject perfectly valid intranet/test
# addresses (e.g. *.local). The frontend already validates format client-side.


class RegisterIn(BaseModel):
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class VerifyOtpIn(BaseModel):
    email: str
    otp_code: str


class ResendOtpIn(BaseModel):
    email: str
