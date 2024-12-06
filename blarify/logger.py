import os


class Logger:
    @staticmethod
    def log(message: str) -> None:
        if os.getenv("DEBUG"):
            print(message)
