from fastapi import HTTPException


class ApiError(HTTPException):
    """HTTP error whose body matches what the frontend SDK adapter expects:
    { "message": ..., "detail": ..., "code": ... }
    """

    def __init__(self, status_code: int, message: str, code: str | None = None):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.code = code
