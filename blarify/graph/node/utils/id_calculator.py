from hashlib import md5


class IdCalculator:
    @staticmethod
    def generate_hashed_file_id(enviroment: str, pr_id: str, path: str) -> str:
        return md5(IdCalculator.generate_file_id(enviroment, pr_id, path).encode()).hexdigest()

    @staticmethod
    def generate_file_id(enviroment: str, pr_id: str, path: str) -> str:
        return f"/{enviroment}/{pr_id}/{path}"
