from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from ..domain.repositories import RepositoryError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RepositoryError)
    async def repository_error_handler(request: Request, exc: RepositoryError):
        return JSONResponse(
            status_code=500,
            content={"detail": "Repository error", "message": str(exc)},
        )
